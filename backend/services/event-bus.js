// ============================================================
// 📢 services/event-bus.js — Centralized Event System
// Standardized pub/sub for ecosystem cohesion.
// All subsystems emit events; everything listens consistently.
// ============================================================

class EventBus {
  constructor(options = {}) {
    this.listeners = new Map();         // event_name -> Set<handler>
    this.wildcardListeners = new Set(); // listen to all events
    this.history = [];                  // recent events buffer
    this.maxHistory = options.maxHistory || 500;
    this.logger = options.logger;
  }

  // ─── Subscribe ────────────────────────────
  on(eventName, handler) {
    if (eventName === '*') {
      this.wildcardListeners.add(handler);
      return () => this.wildcardListeners.delete(handler);
    }
    if (!this.listeners.has(eventName)) this.listeners.set(eventName, new Set());
    this.listeners.get(eventName).add(handler);
    return () => this.listeners.get(eventName)?.delete(handler);
  }

  // ─── One-time subscription ────────────────
  once(eventName, handler) {
    const off = this.on(eventName, (data) => {
      off();
      handler(data);
    });
    return off;
  }

  // ─── Emit ─────────────────────────────────
  emit(eventName, data = {}) {
    const event = {
      name: eventName,
      data,
      ts: Date.now(),
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };

    // Store in history
    this.history.push(event);
    if (this.history.length > this.maxHistory) this.history.shift();

    // Notify specific listeners
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      for (const h of handlers) {
        try { h(event); }
        catch (e) { this.logger?.warn('Event handler error', { event: eventName, error: e.message }); }
      }
    }

    // Notify wildcard listeners
    for (const h of this.wildcardListeners) {
      try { h(event); }
      catch (e) { this.logger?.warn('Wildcard handler error', { error: e.message }); }
    }

    return event.id;
  }

  // ─── Query history ────────────────────────
  getRecent(filter = {}) {
    let result = this.history;
    if (filter.name) result = result.filter(e => e.name === filter.name);
    if (filter.since) result = result.filter(e => e.ts >= filter.since);
    if (filter.limit) result = result.slice(-filter.limit);
    return result;
  }

  // ─── Counts per event type ────────────────
  stats() {
    const counts = {};
    for (const e of this.history) counts[e.name] = (counts[e.name] || 0) + 1;
    return {
      total_events: this.history.length,
      counts,
      listeners: {
        named: [...this.listeners.entries()].reduce((acc, [k, v]) => { acc[k] = v.size; return acc; }, {}),
        wildcard: this.wildcardListeners.size,
      },
    };
  }

  // ─── Clear ────────────────────────────────
  clearHistory() { this.history = []; }
}

// ─── Standardized event names (contracts) ──
const EVENTS = Object.freeze({
  // Orchestration
  ORCH_START:     'orchestration.start',
  ORCH_NODE_DONE: 'orchestration.node.done',
  ORCH_NODE_FAIL: 'orchestration.node.fail',
  ORCH_COMPLETE:  'orchestration.complete',

  // Agents
  AGENT_START:    'agent.start',
  AGENT_DONE:     'agent.done',
  AGENT_FAIL:     'agent.fail',

  // AI calls
  AI_CALL_START:  'ai.call.start',
  AI_CALL_DONE:   'ai.call.done',
  AI_CALL_FAIL:   'ai.call.fail',
  AI_CALL_CACHED: 'ai.call.cached',

  // Deployment
  DEPLOY_START:    'deploy.start',
  DEPLOY_PROGRESS: 'deploy.progress',
  DEPLOY_DONE:     'deploy.done',
  DEPLOY_FAIL:     'deploy.fail',

  // System
  CACHE_HIT:       'cache.hit',
  CACHE_MISS:      'cache.miss',
  BREAKER_OPEN:    'breaker.open',
  BREAKER_CLOSE:   'breaker.close',
  ERROR:           'system.error',

  // User
  USER_ACTION:     'user.action',
  WORKFLOW_SAVED:  'workflow.saved',
});

module.exports = { EventBus, EVENTS };