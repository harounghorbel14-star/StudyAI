// ============================================================
// 📡 realtime/sse.js — Unified SSE Streaming Helper
// Standardized event format for all realtime features
// ============================================================

/**
 * Setup SSE headers and return a stream object.
 * Standardized event format: { type, ts, data }
 */
function createStream(res, options = {}) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders?.();

  let closed = false;
  let heartbeat;

  const send = (type, data = {}) => {
    if (closed) return false;
    try {
      const payload = JSON.stringify({ type, ts: Date.now(), ...data });
      res.write(`data: ${payload}\n\n`);
      return true;
    } catch (e) {
      closed = true;
      return false;
    }
  };

  const sendEvent = (eventName, data = {}) => {
    if (closed) return false;
    try {
      const payload = JSON.stringify({ ts: Date.now(), ...data });
      res.write(`event: ${eventName}\ndata: ${payload}\n\n`);
      return true;
    } catch (e) {
      closed = true;
      return false;
    }
  };

  const close = () => {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    try { res.end(); } catch (_) {}
  };

  // Heartbeat to keep connection alive (every 25s)
  if (options.heartbeat !== false) {
    heartbeat = setInterval(() => {
      if (closed) return;
      try { res.write(`: heartbeat\n\n`); } catch (_) { close(); }
    }, 25000);
  }

  // Auto-close when client disconnects
  res.on('close', close);
  res.on('finish', close);

  return {
    send,
    sendEvent,
    close,
    isClosed: () => closed,
    // Standard event helpers
    progress: (pct, message) => send('progress', { progress: pct, message }),
    log: (level, message, meta) => send('log', { level, message, meta }),
    error: (message, code) => send('error', { message, code }),
    done: (data) => { send('done', data); close(); },
    step: (id, label, status, data) => send('step', { id, label, status, ...(data || {}) }),
  };
}

/**
 * Standard SSE event types (for consistency across features):
 *
 * - 'init'           : connection established
 * - 'progress'       : { progress: 0-100, message }
 * - 'step'           : { id, label, status: 'running'|'done'|'error', data }
 * - 'agent_start'    : { agent, role }
 * - 'agent_thinking' : { agent, thought }
 * - 'agent_done'     : { agent, output, duration_ms }
 * - 'agent_error'    : { agent, error, retry: true|false }
 * - 'token'          : { content }       — for streaming text
 * - 'log'            : { level, message }
 * - 'deploy_log'     : { line, level }   — for deploy console
 * - 'error'          : { message, code }
 * - 'done'           : { result, summary }
 */

module.exports = { createStream };