// ============================================================
// 🛡️ resilience/circuit-breaker.js — Fault Tolerance
// Stops calling failing services to prevent cascading failures
// ============================================================

const STATES = { CLOSED: 'CLOSED', OPEN: 'OPEN', HALF_OPEN: 'HALF_OPEN' };

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;     // open after N failures
    this.successThreshold = options.successThreshold || 2;     // close after N successes in half-open
    this.timeout = options.timeout || 30000;                   // ms before trying half-open
    this.callTimeout = options.callTimeout || 60000;           // per-call timeout

    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.lastError = null;
    this.totalCalls = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
  }

  async execute(fn) {
    this.totalCalls++;

    // Check state
    if (this.state === STATES.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        this.state = STATES.HALF_OPEN;
        this.successCount = 0;
      } else {
        const err = new Error(`Circuit breaker OPEN for ${this.name}`);
        err.code = 'CIRCUIT_OPEN';
        throw err;
      }
    }

    // Execute with timeout
    try {
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => {
            const err = new Error(`Circuit breaker timeout for ${this.name}`);
            err.code = 'CIRCUIT_TIMEOUT';
            reject(err);
          }, this.callTimeout)
        ),
      ]);

      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      throw err;
    }
  }

  _onSuccess() {
    this.totalSuccesses++;
    this.failureCount = 0;
    if (this.state === STATES.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = STATES.CLOSED;
      }
    }
  }

  _onFailure(err) {
    this.totalFailures++;
    this.lastError = err.message;
    this.lastFailureTime = Date.now();

    if (this.state === STATES.HALF_OPEN) {
      this.state = STATES.OPEN;
      return;
    }

    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = STATES.OPEN;
    }
  }

  reset() {
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastError = null;
  }

  stats() {
    return {
      name: this.name,
      state: this.state,
      failure_count: this.failureCount,
      total_calls: this.totalCalls,
      total_failures: this.totalFailures,
      total_successes: this.totalSuccesses,
      success_rate: this.totalCalls > 0 ? ((this.totalSuccesses / this.totalCalls) * 100).toFixed(1) + '%' : 'N/A',
      last_error: this.lastError,
      last_failure_time: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
    };
  }
}

class CircuitBreakerRegistry {
  constructor() {
    this.breakers = new Map();
  }

  get(name, options) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name);
  }

  stats() {
    return [...this.breakers.values()].map(b => b.stats());
  }
}

module.exports = { CircuitBreaker, CircuitBreakerRegistry, STATES };