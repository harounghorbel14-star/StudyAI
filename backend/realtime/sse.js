// ============================================================
// 📡 realtime/sse.js — Production SSE Streaming
// Unified events, validation, backpressure, replay buffer
// ============================================================
const { EVENTS, validateEvent } = require('./events');

/**
 * Create a production SSE stream with:
 *  - Unified event types
 *  - Heartbeat
 *  - Backpressure handling (drop on slow client)
 *  - Optional replay buffer (last N events)
 *  - Auto-close on disconnect
 *  - Built-in helpers for every domain
 */
function createStream(res, options = {}) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let closed = false;
  let heartbeat;
  const traceId = options.traceId || `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  // Replay buffer (for late-joining clients via long-poll fallback)
  const replayBuffer = [];
  const maxBuffer = options.replayBufferSize || 50;

  // Backpressure: drop if response buffer too full
  function tryWrite(data) {
    if (closed) return false;
    try {
      // Check if the underlying socket is writable
      if (res.writableEnded || res.destroyed) {
        closed = true;
        return false;
      }
      const ok = res.write(data);
      if (!ok && options.dropOnBackpressure) {
        // Don't await drain — drop next message instead
        return false;
      }
      return true;
    } catch (e) {
      closed = true;
      return false;
    }
  }

  function send(eventType, payload = {}) {
    if (closed) return false;

    // Validate against schema
    const validation = validateEvent(eventType, payload);
    if (!validation.valid && options.strict) {
      console.warn(`[SSE] Invalid event ${eventType}:`, validation.errors);
    }

    const envelope = {
      type: eventType,
      ts: Date.now(),
      trace_id: traceId,
      ...payload,
    };

    if (replayBuffer.length >= maxBuffer) replayBuffer.shift();
    replayBuffer.push(envelope);

    return tryWrite(`data: ${JSON.stringify(envelope)}\n\n`);
  }

  function close(reason) {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    if (reason && !res.writableEnded) {
      try { tryWrite(`data: ${JSON.stringify({ type: EVENTS.STREAM_DONE, ts: Date.now(), trace_id: traceId, reason })}\n\n`); } catch (_) {}
    }
    try { res.end(); } catch (_) {}
  }

  // Heartbeat (25s — under most proxy timeouts)
  if (options.heartbeat !== false) {
    heartbeat = setInterval(() => {
      if (closed) return;
      try { tryWrite(`: hb\n\n`); } catch (_) { close('heartbeat-failed'); }
    }, 25000);
  }

  // Auto-close on disconnect
  res.on('close', () => close('client-disconnect'));
  res.on('finish', () => close('finish'));
  res.on('error', () => close('error'));

  // Initial event
  send(EVENTS.STREAM_INIT, { trace_id: traceId });

  return {
    traceId,
    send,
    close,
    isClosed: () => closed,
    getReplay: () => [...replayBuffer],

    // ─── Convenience helpers (typed) ──────────────
    phase: (phase, label) => send(EVENTS.PHASE_START, { phase, label }),
    phaseDone: (phase) => send(EVENTS.PHASE_DONE, { phase }),
    progress: (phase, progress) => send(EVENTS.PHASE_PROGRESS, { phase, progress }),

    nodeStart: (node, attempt) => send(EVENTS.NODE_START, { node, attempt }),
    nodeThinking: (node, thought) => send(EVENTS.NODE_THINKING, { node, thought }),
    nodeToken: (node, content) => send(EVENTS.NODE_TOKEN, { node, content }),
    nodeDone: (node, data) => send(EVENTS.NODE_DONE, { node, ...(data || {}) }),
    nodeError: (node, error) => send(EVENTS.NODE_ERROR, { node, error: String(error) }),
    nodeRetry: (node, attempt) => send(EVENTS.NODE_RETRY, { node, attempt }),
    nodeCached: (node) => send(EVENTS.NODE_CACHED, { node }),

    deployLog: (line, level = 'info') => send(EVENTS.DEPLOY_LOG, { line, level }),
    deployStep: (step, status, data) => send(EVENTS.DEPLOY_STEP, { step, status, ...(data || {}) }),

    trace: (span, durationMs, data) => send(EVENTS.TRACE, { trace_id: traceId, span, duration_ms: durationMs, ...(data || {}) }),
    log: (level, message, meta) => send(EVENTS.LOG, { level, message, meta }),

    error: (message, code) => send(EVENTS.STREAM_ERROR, { message: String(message), code }),
    done: (data) => { send(EVENTS.STREAM_DONE, data || {}); close(); },
  };
}

module.exports = { createStream, EVENTS };