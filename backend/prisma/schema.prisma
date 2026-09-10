// ============================================================
// 📡 realtime/events.js — Unified Event Contract
// Single source of truth for all event types across NexusAI
// ============================================================

/**
 * All event types the system can emit, organized by domain.
 * Every SSE stream uses these — no ad-hoc event names.
 */
const EVENTS = Object.freeze({
  // ─── Lifecycle ────────────────────────────────────
  STREAM_INIT:         'stream.init',
  STREAM_HEARTBEAT:    'stream.heartbeat',
  STREAM_DONE:         'stream.done',
  STREAM_ERROR:        'stream.error',

  // ─── Phase progress (high-level workflow stages) ──
  PHASE_START:         'phase.start',
  PHASE_PROGRESS:      'phase.progress',
  PHASE_DONE:          'phase.done',

  // ─── Orchestration (DAG execution) ────────────────
  ORCHESTRATION_START: 'orchestration.start',
  LAYER_START:         'layer.start',
  LAYER_DONE:          'layer.done',
  ORCHESTRATION_DONE:  'orchestration.done',

  // ─── Node/Agent execution ─────────────────────────
  NODE_START:          'node.start',
  NODE_THINKING:       'node.thinking',
  NODE_TOKEN:          'node.token',          // streaming text
  NODE_DONE:           'node.done',
  NODE_ERROR:          'node.error',
  NODE_RETRY:          'node.retry',
  NODE_FALLBACK:       'node.fallback',
  NODE_VALIDATION_FAILED: 'node.validation_failed',
  NODE_CACHED:         'node.cached',

  // ─── Compound intelligence ────────────────────────
  PERSPECTIVE_DONE:    'compound.perspective_done',
  SYNTHESIS_START:     'compound.synthesis_start',
  SYNTHESIS_DONE:      'compound.synthesis_done',
  VALIDATION_RESULT:   'compound.validation',
  REFINE_ITERATION:    'compound.refine_iteration',

  // ─── Deployment ───────────────────────────────────
  DEPLOY_LOG:          'deploy.log',
  DEPLOY_STEP:         'deploy.step',
  DEPLOY_SUCCESS:      'deploy.success',
  DEPLOY_FAILED:       'deploy.failed',

  // ─── Resource/system events ───────────────────────
  TRACE:               'trace',               // distributed tracing point
  METRIC:              'metric',
  LOG:                 'log',
});

/**
 * Validate a payload matches expected shape for an event type.
 * Returns { valid, payload (normalized), errors }.
 */
const SCHEMAS = {
  [EVENTS.PHASE_START]:        ['phase', 'label?'],
  [EVENTS.PHASE_PROGRESS]:     ['phase', 'progress'],
  [EVENTS.PHASE_DONE]:         ['phase'],
  [EVENTS.ORCHESTRATION_START]: ['total_nodes', 'layers'],
  [EVENTS.LAYER_START]:        ['layer', 'parallel_nodes'],
  [EVENTS.LAYER_DONE]:         ['layer'],
  [EVENTS.NODE_START]:         ['node'],
  [EVENTS.NODE_THINKING]:      ['node', 'thought?'],
  [EVENTS.NODE_TOKEN]:         ['node', 'content'],
  [EVENTS.NODE_DONE]:          ['node', 'duration_ms?', 'model?'],
  [EVENTS.NODE_ERROR]:         ['node', 'error'],
  [EVENTS.NODE_RETRY]:         ['node', 'attempt'],
  [EVENTS.NODE_FALLBACK]:      ['node', 'reason?'],
  [EVENTS.DEPLOY_LOG]:         ['line', 'level?'],
  [EVENTS.DEPLOY_STEP]:        ['step', 'status'],
  [EVENTS.STREAM_ERROR]:       ['message', 'code?'],
  [EVENTS.TRACE]:              ['trace_id', 'span', 'duration_ms?'],
};

function validateEvent(type, payload = {}) {
  const schema = SCHEMAS[type];
  if (!schema) return { valid: true, payload }; // unknown — pass through
  const errors = [];
  for (const field of schema) {
    const optional = field.endsWith('?');
    const name = field.replace(/\?$/, '');
    if (!optional && payload[name] === undefined) errors.push(`Missing field: ${name}`);
  }
  return { valid: errors.length === 0, payload, errors };
}

module.exports = { EVENTS, SCHEMAS, validateEvent };