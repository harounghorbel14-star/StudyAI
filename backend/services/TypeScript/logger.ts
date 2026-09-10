// ============================================================
// 📋 services/logger.ts — Production Logger
// Structured logging via pino when available, console otherwise.
// Child loggers carry a dotted context path.
// ============================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export const LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'] as const;

// Numeric ordering so the console fallback can filter by level —
// previously it printed everything regardless of the configured level.
const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10, info: 20, warn: 30, error: 40, fatal: 50,
};

const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  fatal: '\x1b[35m',
};
const RESET = '\x1b[0m';

export type LogMeta = Record<string, unknown>;

interface PinoLike {
  debug(meta: LogMeta | string, msg?: string): void;
  info(meta: LogMeta | string, msg?: string): void;
  warn(meta: LogMeta | string, msg?: string): void;
  error(meta: LogMeta | string, msg?: string): void;
  fatal(meta: LogMeta | string, msg?: string): void;
  child(bindings: LogMeta): PinoLike;
}

export interface LoggerOptions {
  level?: LogLevel | string;
  context?: string;
  /** Inject a pino instance directly; used by child(). */
  pino?: PinoLike | null;
}

let pinoFactory: ((config: unknown) => PinoLike) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  pinoFactory = require('pino');
} catch {
  pinoFactory = null;
}

function normaliseLevel(value: string | undefined): LogLevel {
  return (LEVELS as readonly string[]).includes(value ?? '')
    ? (value as LogLevel)
    : 'info';
}

export class Logger {
  readonly level: LogLevel;
  readonly context: string;
  private readonly pino: PinoLike | null;

  constructor(options: LoggerOptions = {}) {
    this.level = normaliseLevel(options.level ?? process.env.LOG_LEVEL);
    this.context = options.context ?? 'NexusAI';

    if (options.pino !== undefined) {
      this.pino = options.pino;
      return;
    }

    this.pino = this.createPino();
  }

  private createPino(): PinoLike | null {
    if (!pinoFactory) return null;
    const config: Record<string, unknown> = {
      name: this.context,
      level: this.level,
    };
    // Human-readable in development, structured JSON in production.
    if (process.env.NODE_ENV !== 'production') {
      config.transport = {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      };
    }
    try {
      return pinoFactory(config);
    } catch {
      // pino-pretty is often absent in production images; retry plain.
      try {
        return pinoFactory({ name: this.context, level: this.level });
      } catch {
        return null;
      }
    }
  }

  private write(level: LogLevel, msg: string, meta?: LogMeta): void {
    if (this.pino) {
      if (meta) this.pino[level](meta, msg);
      else this.pino[level](msg);
      return;
    }

    // Console fallback respects the configured level.
    if (LEVEL_RANK[level] < LEVEL_RANK[this.level]) return;

    const ts = new Date().toISOString();
    let metaStr = '';
    if (meta) {
      try {
        metaStr = ' ' + JSON.stringify(meta).slice(0, 500);
      } catch {
        // A circular meta object must not crash the caller.
        metaStr = ' [unserializable meta]';
      }
    }
    const prefix = `${COLORS[level]}[${ts}] [${level.toUpperCase()}] [${this.context}]${RESET}`;
    console.log(`${prefix} ${msg}${metaStr}`);
  }

  debug(msg: string, meta?: LogMeta): void { this.write('debug', msg, meta); }
  info(msg: string, meta?: LogMeta): void { this.write('info', msg, meta); }
  warn(msg: string, meta?: LogMeta): void { this.write('warn', msg, meta); }
  error(msg: string, meta?: LogMeta): void { this.write('error', msg, meta); }
  fatal(msg: string, meta?: LogMeta): void { this.write('fatal', msg, meta); }

  child(context: string): Logger {
    const childContext = `${this.context}:${context}`;
    return new Logger({
      level: this.level,
      context: childContext,
      pino: this.pino ? this.pino.child({ context: childContext }) : null,
    });
  }

  // ─── Express middleware ───────────────────
  middleware() {
    return (req: any, res: any, next: () => void): void => {
      const start = Date.now();
      const reqId = Math.random().toString(36).slice(2, 10);
      req.reqId = reqId;
      req.log = this.child(`req:${reqId}`);

      res.on('finish', () => {
        const duration = Date.now() - start;
        const meta: LogMeta = {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration_ms: duration,
          ip: req.ip,
          user_id: req.user?.id,
        };
        if (res.statusCode >= 500) this.error('Request failed', meta);
        else if (res.statusCode >= 400) this.warn('Request error', meta);
        else if (duration > 5000) this.warn('Slow request', meta);
        else this.debug('Request', meta);
      });

      next();
    };
  }
}