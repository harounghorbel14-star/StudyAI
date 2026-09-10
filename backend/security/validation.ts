// ============================================================
// ✅ security/validation.ts — Schema Validation
// Zero-dependency runtime validation for every API surface.
// Types are inferred from the schema, so a validated object is
// typed correctly downstream with no manual annotation.
// ============================================================

export interface FieldError {
  field: string;
  message: string;
}

export class ValidationError extends Error {
  readonly statusCode = 400;
  readonly errors: FieldError[];

  constructor(errors: FieldError[]) {
    super('Validation failed: ' + errors.map((e) => `${e.field} ${e.message}`).join('; '));
    this.name = 'ValidationError';
    this.errors = errors;
    // Required so `instanceof` works after transpilation to ES5 targets.
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// A validator either succeeds with a coerced value, or reports a failure.
export type ValidatorSuccess<T> = { ok: true; value: T };
export type ValidatorFailure = { ok?: false; field: string; message: string };
export type ValidatorResult<T> = ValidatorSuccess<T> | ValidatorFailure;
export type Validator<T> = (value: unknown, field: string) => ValidatorResult<T>;

export interface FieldRule<T> {
  validator: Validator<T>;
  optional?: boolean;
  default?: T;
}

export type SchemaField<T> = Validator<T> | FieldRule<T>;
export type Schema = Record<string, SchemaField<any>>;

// Infer the validated output type from a schema definition.
type InferField<F> =
  F extends Validator<infer T> ? T :
  F extends FieldRule<infer T> ? T :
  never;

export type Infer<S extends Schema> = { [K in keyof S]: InferField<S[K]> };

// ─── Primitive validators ───────────────────
export interface StringOptions {
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: readonly string[];
  trim?: boolean;
}

function string(options: StringOptions = {}): Validator<string> {
  const { min = 0, max = 100000, pattern, enum: allowed, trim = true } = options;
  return (value, field) => {
    if (typeof value !== 'string') return { field, message: 'must be a string' };
    const s = trim ? value.trim() : value;
    if (s.length < min) return { field, message: `must be at least ${min} characters` };
    if (s.length > max) return { field, message: `must be at most ${max} characters` };
    if (pattern && !pattern.test(s)) return { field, message: 'has invalid format' };
    if (allowed && !allowed.includes(s)) {
      return { field, message: `must be one of: ${allowed.join(', ')}` };
    }
    return { ok: true, value: s };
  };
}

export interface NumberOptions {
  min?: number;
  max?: number;
  integer?: boolean;
}

function number(options: NumberOptions = {}): Validator<number> {
  const { min = -Infinity, max = Infinity, integer = false } = options;
  return (value, field) => {
    const n = typeof value === 'string' ? Number(value) : value;
    if (typeof n !== 'number' || Number.isNaN(n)) return { field, message: 'must be a number' };
    if (!Number.isFinite(n)) return { field, message: 'must be finite' };
    if (integer && !Number.isInteger(n)) return { field, message: 'must be an integer' };
    if (n < min) return { field, message: `must be at least ${min}` };
    if (n > max) return { field, message: `must be at most ${max}` };
    return { ok: true, value: n };
  };
}

function boolean(): Validator<boolean> {
  return (value, field) => {
    if (typeof value === 'boolean') return { ok: true, value };
    if (value === 'true' || value === 1 || value === '1') return { ok: true, value: true };
    if (value === 'false' || value === 0 || value === '0') return { ok: true, value: false };
    return { field, message: 'must be a boolean' };
  };
}

function email(): Validator<string> {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return (value, field) => {
    if (typeof value !== 'string') return { field, message: 'must be a string' };
    const s = value.trim().toLowerCase();
    if (s.length > 320) return { field, message: 'is too long' };
    if (!re.test(s)) return { field, message: 'must be a valid email' };
    return { ok: true, value: s };
  };
}

export interface UrlOptions {
  protocols?: string[];
}

function url(options: UrlOptions = {}): Validator<string> {
  const protocols = options.protocols ?? ['http:', 'https:'];
  return (value, field) => {
    if (typeof value !== 'string') return { field, message: 'must be a string' };
    try {
      const parsed = new URL(value);
      // Blocks javascript: and file: schemes, which are XSS and LFI vectors.
      if (!protocols.includes(parsed.protocol)) {
        return { field, message: `must use ${protocols.join(' or ')}` };
      }
      return { ok: true, value };
    } catch {
      return { field, message: 'must be a valid URL' };
    }
  };
}

export interface ArrayOptions<T> {
  min?: number;
  max?: number;
  of?: Validator<T>;
}

function array<T = unknown>(options: ArrayOptions<T> = {}): Validator<T[]> {
  const { min = 0, max = 1000, of } = options;
  return (value, field) => {
    if (!Array.isArray(value)) return { field, message: 'must be an array' };
    if (value.length < min) return { field, message: `must have at least ${min} items` };
    if (value.length > max) return { field, message: `must have at most ${max} items` };

    if (of) {
      const out: T[] = [];
      for (let i = 0; i < value.length; i++) {
        const result = of(value[i], `${field}[${i}]`);
        if (!('ok' in result) || !result.ok) return result as ValidatorFailure;
        out.push(result.value);
      }
      return { ok: true, value: out };
    }
    return { ok: true, value: value as T[] };
  };
}

export interface ObjectOptions {
  maxKeys?: number;
  maxBytes?: number;
}

function object(options: ObjectOptions = {}): Validator<Record<string, unknown>> {
  const { maxKeys = 100, maxBytes = 1024 * 512 } = options;
  return (value, field) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return { field, message: 'must be an object' };
    }
    const obj = value as Record<string, unknown>;
    if (Object.keys(obj).length > maxKeys) {
      return { field, message: `must have at most ${maxKeys} keys` };
    }
    try {
      if (JSON.stringify(obj).length > maxBytes) {
        return { field, message: 'is too large' };
      }
    } catch {
      // Circular structures cannot be persisted or transmitted.
      return { field, message: 'is not serializable' };
    }
    return { ok: true, value: obj };
  };
}

function any(): Validator<unknown> {
  return (value) => ({ ok: true, value });
}

// ─── Domain validators ──────────────────────
const id = (): Validator<number> => number({ min: 1, integer: true });

const slug = (opts: { max?: number } = {}): Validator<string> =>
  string({ min: 1, max: opts.max ?? 80, pattern: /^[a-z0-9][a-z0-9-]*$/ });

const plan = (): Validator<string> =>
  string({ enum: ['free', 'pro', 'elite', 'team'] });

const role = (): Validator<string> =>
  string({ enum: ['owner', 'admin', 'member', 'viewer'] });

const taskType = (): Validator<string> =>
  string({
    enum: ['reasoning-deep', 'reasoning-fast', 'creative', 'classification',
           'code', 'summary', 'translate', 'extract', 'general'],
  });

const prompt = (opts: { max?: number } = {}): Validator<string> =>
  string({ min: 1, max: opts.max ?? 32000 });

export const v = {
  string, number, boolean, email, url, array, object, any,
  id, slug, plan, role, taskType, prompt,
};

// ─── Schema runner ──────────────────────────
export interface ValidateOptions {
  stripUnknown?: boolean;
}

function isRule<T>(field: SchemaField<T>): field is FieldRule<T> {
  return typeof field === 'object' && field !== null && 'validator' in field;
}

export function validate<S extends Schema>(
  data: unknown,
  schema: S,
  options: ValidateOptions = {}
): Infer<S> {
  const { stripUnknown = true } = options;
  const errors: FieldError[] = [];
  const output: Record<string, unknown> = {};
  const source: Record<string, unknown> =
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};

  for (const [field, definition] of Object.entries(schema)) {
    const rule = isRule(definition) ? definition : { validator: definition };
    const isOptional = isRule(definition) && definition.optional === true;
    const raw = source[field];

    if (raw === undefined || raw === null || raw === '') {
      if (isOptional) {
        if (isRule(definition) && definition.default !== undefined) {
          output[field] = definition.default;
        }
        continue;
      }
      errors.push({ field, message: 'is required' });
      continue;
    }

    const result = rule.validator(raw, field);
    if ('ok' in result && result.ok) {
      output[field] = result.value;
    } else {
      const failure = result as ValidatorFailure;
      errors.push({ field: failure.field || field, message: failure.message });
    }
  }

  // Unknown keys are dropped by default — this is what prevents
  // mass-assignment through an unexpected request field.
  if (!stripUnknown) {
    for (const key of Object.keys(source)) {
      if (!(key in schema)) output[key] = source[key];
    }
  }

  if (errors.length) throw new ValidationError(errors);
  return output as Infer<S>;
}

// ─── Express middleware ─────────────────────
interface RequestLike {
  body?: unknown;
  query?: unknown;
  params?: unknown;
  validated?: unknown;
  validatedQuery?: unknown;
  validatedParams?: unknown;
}

interface ResponseLike {
  status(code: number): { json(body: unknown): unknown };
}

type NextLike = (err?: unknown) => void;

function makeMiddleware(
  source: 'body' | 'query' | 'params',
  target: 'validated' | 'validatedQuery' | 'validatedParams'
) {
  return <S extends Schema>(schema: S, options?: ValidateOptions) =>
    (req: RequestLike, res: ResponseLike, next: NextLike): void => {
      try {
        req[target] = validate(req[source], schema, options);
        next();
      } catch (err: unknown) {
        if (err instanceof ValidationError) {
          res.status(400).json({ error: err.message, errors: err.errors });
          return;
        }
        next(err);
      }
    };
}

export const validateBody = makeMiddleware('body', 'validated');
export const validateQuery = makeMiddleware('query', 'validatedQuery');
export const validateParams = makeMiddleware('params', 'validatedParams');

// ─── Reusable schemas ───────────────────────
export const schemas = {
  pagination: {
    limit: { validator: v.number({ min: 1, max: 200, integer: true }), optional: true, default: 50 },
    offset: { validator: v.number({ min: 0, integer: true }), optional: true, default: 0 },
  },

  aiCall: {
    prompt: v.prompt(),
    system: { validator: v.string({ max: 8000 }), optional: true },
    task: { validator: v.taskType(), optional: true },
    json: { validator: v.boolean(), optional: true, default: false },
    max_tokens: { validator: v.number({ min: 1, max: 32000, integer: true }), optional: true },
  },

  workspaceCreate: {
    name: v.string({ min: 1, max: 120 }),
    description: { validator: v.string({ max: 2000 }), optional: true, default: '' },
    visibility: {
      validator: v.string({ enum: ['private', 'public', 'team'] }),
      optional: true, default: 'private',
    },
  },

  workspaceInvite: {
    email: v.email(),
    role: { validator: v.role(), optional: true, default: 'member' },
  },

  marketplacePublish: {
    kind: v.string({ enum: ['workflow', 'template', 'agent', 'orchestration', 'prompt-pack'] }),
    title: v.string({ min: 3, max: 120 }),
    description: { validator: v.string({ max: 2000 }), optional: true, default: '' },
    content: v.object({ maxBytes: 256 * 1024 }),
    tags: {
      validator: v.array({ max: 12, of: v.string({ min: 1, max: 32 }) }),
      optional: true, default: [] as string[],
    },
    price_credits: {
      validator: v.number({ min: 0, max: 100000, integer: true }),
      optional: true, default: 0,
    },
    visibility: {
      validator: v.string({ enum: ['public', 'private'] }),
      optional: true, default: 'public',
    },
  },

  businessMetric: {
    metric_type: v.string({ min: 1, max: 60 }),
    metric_name: v.string({ min: 1, max: 60 }),
    value: v.number(),
    metadata: { validator: v.object(), optional: true, default: {} },
  },

  notificationPrefs: {
    email_enabled: { validator: v.boolean(), optional: true },
    push_enabled: { validator: v.boolean(), optional: true },
    digest_mode: { validator: v.boolean(), optional: true },
    quiet_hours_start: { validator: v.number({ min: 0, max: 23, integer: true }), optional: true },
    quiet_hours_end: { validator: v.number({ min: 0, max: 23, integer: true }), optional: true },
    disabled_types: {
      validator: v.array({ max: 30, of: v.string({ max: 60 }) }),
      optional: true,
    },
  },

  checkout: {
    plan: v.string({ enum: ['pro', 'elite', 'team'] }),
    return_url: { validator: v.url(), optional: true },
  },

  embeddingIndex: {
    source_type: v.string({ min: 1, max: 60 }),
    content: v.string({ min: 1, max: 8000 }),
    source_id: { validator: v.number({ min: 1, integer: true }), optional: true },
    metadata: { validator: v.object(), optional: true, default: {} },
  },

  embeddingSearch: {
    query: v.string({ min: 1, max: 8000 }),
    source_types: { validator: v.array({ max: 20, of: v.string({ max: 60 }) }), optional: true },
    limit: { validator: v.number({ min: 1, max: 100, integer: true }), optional: true, default: 10 },
    threshold: { validator: v.number({ min: 0, max: 1 }), optional: true, default: 0.6 },
  },
} satisfies Record<string, Schema>;