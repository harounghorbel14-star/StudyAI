// ============================================================
// 🌐 types/ambient.d.ts — Minimal Node/runtime ambient types
//
// Lets `tsc` type-check the project before `npm install` has run.
// Once @types/node is installed it takes precedence and this file
// becomes a harmless no-op (declarations merge).
// ============================================================

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
    NODE_ENV?: string;
    JWT_SECRET?: string;
    OPENAI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    DATABASE_URL?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    SENTRY_DSN?: string;
    POSTHOG_API_KEY?: string;
    POSTHOG_HOST?: string;
    FRONTEND_URL?: string;
    APP_VERSION?: string;
    LOCAL_LLM_ENABLED?: string;
    LOCAL_LLM_URL?: string;
    LOCAL_LLM_BACKEND?: string;
    LOCAL_LLM_MODEL?: string;
    LOCAL_LLM_TIMEOUT?: string;
    LOCAL_LLM_TASKS?: string;
    LOCAL_EMBED_MODEL?: string;
  }

  interface Timeout {
    ref(): this;
    unref(): this;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
  argv: string[];
  uptime(): number;
  memoryUsage(): { heapUsed: number; rss: number; heapTotal: number; external: number };
  exit(code?: number): never;
  on(event: string, handler: (...args: any[]) => void): void;
  stdout: { write(chunk: string): boolean };
};

declare function require(id: string): any;
declare const module: { exports: any };
declare const __dirname: string;
declare const __filename: string;

declare function setTimeout(handler: () => void, timeout?: number): NodeJS.Timeout;
declare function clearTimeout(handle: NodeJS.Timeout | undefined): void;
declare function setInterval(handler: () => void, timeout?: number): NodeJS.Timeout;
declare function clearInterval(handle: NodeJS.Timeout | undefined): void;

declare class Buffer extends Uint8Array {
  static from(data: ArrayBuffer | string | Uint8Array, encoding?: string): Buffer;
  toString(encoding?: string): string;
  readonly buffer: ArrayBuffer;
  readonly byteOffset: number;
  readonly byteLength: number;
}

declare module 'crypto' {
  export interface Hash {
    update(data: string | Uint8Array): Hash;
    digest(encoding: 'hex' | 'base64'): string;
  }
  export interface Hmac {
    update(data: string | Uint8Array): Hmac;
    digest(encoding: 'hex' | 'base64'): string;
  }
  export function createHash(algorithm: string): Hash;
  export function createHmac(algorithm: string, key: string | Uint8Array): Hmac;
  export function randomBytes(size: number): Buffer;
  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
}