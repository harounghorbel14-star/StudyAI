// ============================================================
// 📜 agent/policy.js — Run/step lifecycle and failure classes
//
// Deterministic rules the model cannot change:
//   • which run-state transitions are legal (enforced with conditional
//     UPDATEs in runner.js, so a stale callback cannot revive a finished
//     run or resume a cancelled one);
//   • how a failed step is classified, and whether retrying is safe.
// ============================================================

const RUN_STATES = ['queued', 'running', 'awaiting_approval', 'needs_input', 'cancelling', 'succeeded', 'failed', 'cancelled', 'stopped'];
const TERMINAL = ['succeeded', 'failed', 'cancelled', 'stopped', 'needs_input'];
const ACTIVE = ['queued', 'running', 'awaiting_approval', 'cancelling'];

// to-state → the states it may be entered from.
const ALLOWED_FROM = {
  queued: ['awaiting_approval'],                 // approval decided → resume
  running: ['queued'],                           // only a queued run can start
  awaiting_approval: ['running'],
  needs_input: ['running'],
  cancelling: ['running'],
  succeeded: ['running'],
  failed: ['queued', 'running', 'cancelling', 'awaiting_approval'],
  stopped: ['running'],
  cancelled: ['queued', 'running', 'cancelling', 'awaiting_approval'],
};

const STEP_STATES = ['pending', 'running', 'needs_approval', 'succeeded', 'failed', 'skipped', 'rejected', 'outcome_unknown'];

const FAILURE = Object.freeze({
  TRANSIENT: 'transient',
  INVALID_ARGUMENTS: 'invalid_arguments',
  PERMISSION_DENIED: 'permission_denied',
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
  BUDGET_EXHAUSTED: 'budget_exhausted',
  VERIFICATION_FAILED: 'verification_failed',
  NON_RETRYABLE: 'non_retryable',
});

const TRANSIENT_RE = /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ECONNREFUSED|socket hang up|temporar|\b(429|5\d\d)\b|rate.?limit/i;

/**
 * @param {{ ok?: boolean, code?: string, error?: string }} res  tool result (or thrown error)
 * @param {{ risk?: string, evaluation?: { satisfied: boolean } }} ctx
 * @returns {{ category: string, retryable: boolean, replannable: boolean }}
 */
function classifyFailure(res, { risk = 'read', evaluation } = {}) {
  let category;
  if (res?.ok && evaluation && !evaluation.satisfied) category = FAILURE.VERIFICATION_FAILED;
  else {
    const code = String(res?.code || '');
    if (code === 'TIMEOUT' || code === 'MODEL_TIMEOUT') category = FAILURE.TRANSIENT;
    else if (code === 'INVALID_ARGS' || code === 'UNKNOWN_TOOL') category = FAILURE.INVALID_ARGUMENTS;
    else if (['FORBIDDEN', 'APPROVAL_REQUIRED', 'APPROVAL_EXPIRED', 'APPROVAL_USED'].includes(code)) category = FAILURE.PERMISSION_DENIED;
    else if (['MODEL_UNAVAILABLE', 'PROVIDERS_FAILED'].includes(code)) category = FAILURE.PROVIDER_UNAVAILABLE;
    else if (code === 'BUDGET') category = FAILURE.BUDGET_EXHAUSTED;
    else if (code === 'TOOL_ERROR' && TRANSIENT_RE.test(String(res?.error || ''))) category = FAILURE.TRANSIENT;
    else category = FAILURE.NON_RETRYABLE;
  }
  return {
    category,
    // Repeating anything but a read-only call could apply a side effect twice.
    retryable: category === FAILURE.TRANSIENT && risk === 'read',
    // Out of budget or not permitted: a new plan cannot fix that.
    replannable: ![FAILURE.BUDGET_EXHAUSTED, FAILURE.PERMISSION_DENIED].includes(category),
  };
}

module.exports = { RUN_STATES, TERMINAL, ACTIVE, ALLOWED_FROM, STEP_STATES, FAILURE, classifyFailure };
