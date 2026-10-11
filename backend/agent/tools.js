// ============================================================
// 🧰 agent/tools.js — Tool registry with schemas, risk and audit
//
// Every tool declares:
//   params     a small schema, validated before the handler runs
//   risk       'read'      read-only research and analysis
//              'workspace' reversible writes inside the run's own
//                          isolated workspace
//              'external'  anything that leaves the system (HTTP
//                          writes, publishing, payments). Never runs
//                          without an explicit approval for that exact
//                          step and arguments.
//   timeoutMs  enforced with an AbortSignal and a hard race
//   guest      whether guest sessions may use it
//
// The registry is the only path from a plan to a side effect, so the
// model cannot reach anything that is not registered here.
// ============================================================
const crypto = require('crypto');

const RISKS = ['read', 'workspace', 'external'];

class ToolError extends Error {
  constructor(message, code, extra = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extra);
  }
}

function validateArgs(schema, args) {
  const errors = [];
  const out = {};
  const input = args && typeof args === 'object' && !Array.isArray(args) ? args : {};
  for (const [key, rule] of Object.entries(schema)) {
    let v = input[key];
    if (v === undefined || v === null || v === '') {
      if (rule.required) errors.push(`${key} is required`);
      else if (rule.default !== undefined) out[key] = rule.default;
      continue;
    }
    if (rule.type === 'string') {
      if (typeof v !== 'string') { errors.push(`${key} must be a string`); continue; }
      if (rule.maxLength && v.length > rule.maxLength) { errors.push(`${key} is longer than ${rule.maxLength}`); continue; }
      if (rule.enum && !rule.enum.includes(v)) { errors.push(`${key} must be one of ${rule.enum.join(', ')}`); continue; }
      if (rule.pattern && !rule.pattern.test(v)) { errors.push(`${key} has an invalid format`); continue; }
    } else if (rule.type === 'number') {
      v = Number(v);
      if (!Number.isFinite(v)) { errors.push(`${key} must be a number`); continue; }
    } else if (rule.type === 'object') {
      if (typeof v !== 'object' || Array.isArray(v)) { errors.push(`${key} must be an object`); continue; }
      if (JSON.stringify(v).length > (rule.maxBytes || 8000)) { errors.push(`${key} is too large`); continue; }
    }
    out[key] = v;
  }
  for (const key of Object.keys(input)) if (!schema[key]) errors.push(`unknown argument ${key}`);
  return { ok: !errors.length, args: out, errors };
}

/** Stable fingerprint of a tool call, so an approval covers exactly these arguments. */
function callFingerprint(tool, args) {
  const canon = JSON.stringify(args, Object.keys(args || {}).sort());
  return crypto.createHash('sha256').update(`${tool}\n${canon}`).digest('hex').slice(0, 32);
}

class ToolRegistry {
  constructor() { this.tools = new Map(); }

  register(def) {
    if (!def.name || !/^[a-z_]+$/.test(def.name)) throw new Error('tool name must be snake_case');
    if (!RISKS.includes(def.risk)) throw new Error(`invalid risk for ${def.name}`);
    if (typeof def.handler !== 'function') throw new Error(`tool ${def.name} needs a handler`);
    this.tools.set(def.name, { timeoutMs: 30_000, guest: false, params: {}, ...def });
    return this;
  }

  get(name) { return this.tools.get(name); }

  /** What the planner may see: names, descriptions and argument shapes only. */
  describe({ guest = false } = {}) {
    return [...this.tools.values()]
      .filter((t) => !guest || t.guest)
      .map((t) => ({
        name: t.name, risk: t.risk, description: t.description,
        args: Object.fromEntries(Object.entries(t.params).map(([k, r]) => [k, `${r.type}${r.required ? '' : '?'}${r.enum ? ` (${r.enum.join('|')})` : ''}`])),
        ...(t.risk === 'external' ? { note: 'requires explicit user approval before it runs' } : {}),
      }));
  }

  /**
   * Validate and authorize a call without running it.
   * @returns {{ tool, args, fingerprint }}
   */
  prepare(name, rawArgs, ctx) {
    const tool = this.tools.get(name);
    if (!tool) throw new ToolError(`Unknown tool "${name}"`, 'UNKNOWN_TOOL');
    if (ctx.user?.guest && !tool.guest) throw new ToolError(`"${name}" is not available in guest mode`, 'FORBIDDEN');
    const v = validateArgs(tool.params, rawArgs);
    if (!v.ok) throw new ToolError(`Invalid arguments for ${name}: ${v.errors.join('; ')}`, 'INVALID_ARGS');
    const fingerprint = callFingerprint(name, v.args);
    if (tool.risk === 'external' && !ctx.approvals?.has(fingerprint)) {
      throw new ToolError(`"${name}" changes something outside NexusAI and needs your approval`, 'APPROVAL_REQUIRED', { fingerprint, args: v.args });
    }
    return { tool, args: v.args, fingerprint };
  }

  /**
   * Run a prepared call with timeout and audit.
   * @returns {Promise<{ ok: boolean, output?: any, error?: string, code?: string, ms: number }>}
   */
  async execute(name, rawArgs, ctx) {
    const t0 = Date.now();
    let prepared;
    try {
      prepared = this.prepare(name, rawArgs, ctx);
    } catch (err) {
      ctx.audit?.({ tool: name, risk: this.tools.get(name)?.risk || 'unknown', ok: false, code: err.code, ms: 0 });
      throw err;
    }
    const { tool, args } = prepared;
    const controller = new AbortController();
    const onParentAbort = () => controller.abort();
    ctx.signal?.addEventListener('abort', onParentAbort, { once: true });
    let timer;
    try {
      const output = await Promise.race([
        tool.handler(args, { ...ctx, signal: controller.signal }),
        new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new ToolError(`${name} timed out after ${tool.timeoutMs} ms`, 'TIMEOUT')); }, tool.timeoutMs); }),
      ]);
      const ms = Date.now() - t0;
      ctx.audit?.({ tool: name, risk: tool.risk, ok: true, ms });
      return { ok: true, output, ms };
    } catch (err) {
      const ms = Date.now() - t0;
      ctx.audit?.({ tool: name, risk: tool.risk, ok: false, code: err.code || 'ERROR', ms });
      if (err.code === 'CANCELLED' || ctx.signal?.aborted) throw Object.assign(new Error('Run cancelled'), { code: 'CANCELLED' });
      return { ok: false, error: String(err.message || err).slice(0, 300), code: err.code || 'TOOL_ERROR', ms };
    } finally {
      clearTimeout(timer);
      ctx.signal?.removeEventListener?.('abort', onParentAbort);
    }
  }
}

// ── Safe arithmetic (no eval) ────────────────────────────────
function calculate(expr) {
  const src = String(expr).replace(/\s+/g, '');
  if (!/^[\d+\-*/^().,%e]+$/i.test(src) || src.length > 200) throw new ToolError('Only numbers and + - * / ^ ( ) % are allowed', 'INVALID_ARGS');
  let i = 0;
  const peek = () => src[i];
  const num = () => {
    const m = src.slice(i).match(/^\d+(?:[.,]\d+)?(?:e[+-]?\d+)?/i);
    if (!m) throw new ToolError(`Unexpected "${peek() || 'end'}" at ${i}`, 'INVALID_ARGS');
    i += m[0].length;
    let v = Number(m[0].replace(',', '.'));
    if (peek() === '%') { i++; v /= 100; }
    return v;
  };
  const factor = () => {
    if (peek() === '-') { i++; return -factor(); }
    if (peek() === '+') { i++; return factor(); }
    if (peek() === '(') { i++; const v = expr0(); if (src[i++] !== ')') throw new ToolError('Missing )', 'INVALID_ARGS'); return v; }
    return num();
  };
  const power = () => { const b = factor(); if (peek() === '^') { i++; return b ** power(); } return b; };
  const term = () => { let v = power(); while (peek() === '*' || peek() === '/') { const op = src[i++]; const r = power(); v = op === '*' ? v * r : v / r; } return v; };
  function expr0() { let v = term(); while (peek() === '+' || peek() === '-') { const op = src[i++]; const r = term(); v = op === '+' ? v + r : v - r; } return v; }
  const v = expr0();
  if (i !== src.length) throw new ToolError(`Unexpected "${src[i]}" at ${i}`, 'INVALID_ARGS');
  if (!Number.isFinite(v)) throw new ToolError('Result is not a finite number', 'INVALID_ARGS');
  return v;
}

module.exports = { ToolRegistry, ToolError, validateArgs, callFingerprint, calculate, RISKS };
