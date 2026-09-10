// ============================================================
// 📢 services/event-bus.ts — Centralized Event System
// Standardized pub/sub for ecosystem cohesion.
//
// HANDLER CONTRACT
//   on('name', handler)  → handler(data, meta)
//        `data` is exactly the object passed to emit().
//   on('*',    handler)  → handler(event)
//        `event` is the full { name, data, ts, id } envelope,
//        because a wildcard listener cannot know the name otherwise.
//
// The two shapes are distinguished at the type level, so a handler
// that reads the wrong one is a compile error rather than a silent
// `undefined` at runtime.
// ============================================================
import type { Logger } from '../../types/core';

export interface EventMeta {
  name: string;
  ts: number;
  id: string;
}

export interface NexusEvent<TData = Record<string, unknown>> extends EventMeta {
  data: TData;
}

export type EventHandler<TData = any> = (data: TData, meta: EventMeta) => void;
export type WildcardHandler = (event: NexusEvent) => void;

/** Call to remove the subscription. Safe to call more than once. */
export type Unsubscribe = () => void;

export interface EventBusOptions {
  maxHistory?: number;
  logger?: Logger | null;
}

export interface HistoryFilter {
  name?: string;
  since?: number;
  limit?: number;
}

export interface EventBusStats {
  total_events: number;
  counts: Record<string, number>;
  listeners: {
    named: Record<string, number>;
    wildcard: number;
  };
}

export class EventBus {
  private readonly listeners = new Map<string, Set<EventHandler>>();
  private readonly wildcardListeners = new Set<WildcardHandler>();
  private history: NexusEvent[] = [];

  readonly maxHistory: number;
  private readonly logger: Logger | null;

  constructor(options: EventBusOptions = {}) {
    this.maxHistory = options.maxHistory ?? 500;
    this.logger = options.logger ?? null;
  }

  // ─── Subscribe ────────────────────────────
  on(eventName: '*', handler: WildcardHandler): Unsubscribe;
  on<TData = any>(eventName: string, handler: EventHandler<TData>): Unsubscribe;
  on(eventName: string, handler: EventHandler | WildcardHandler): Unsubscribe {
    if (eventName === '*') {
      const wildcard = handler as WildcardHandler;
      this.wildcardListeners.add(wildcard);
      return () => { this.wildcardListeners.delete(wildcard); };
    }

    const named = handler as EventHandler;
    let handlers = this.listeners.get(eventName);
    if (!handlers) {
      handlers = new Set();
      this.listeners.set(eventName, handlers);
    }
    handlers.add(named);

    return () => {
      const set = this.listeners.get(eventName);
      if (!set) return;
      set.delete(named);
      if (set.size === 0) this.listeners.delete(eventName);
    };
  }

  // ─── One-time subscription ────────────────
  once<TData = any>(eventName: string, handler: EventHandler<TData>): Unsubscribe {
    const off = this.on<TData>(eventName, (data, meta) => {
      off();
      handler(data, meta);
    });
    return off;
  }

  // ─── Emit ─────────────────────────────────
  emit<TData extends Record<string, unknown>>(
    eventName: string,
    data: TData = {} as TData
  ): string {
    const meta: EventMeta = {
      name: eventName,
      ts: Date.now(),
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
    const event: NexusEvent<TData> = { ...meta, data };

    this.history.push(event as NexusEvent);
    if (this.history.length > this.maxHistory) this.history.shift();

    // Named listeners receive the payload directly — this is what
    // every call site expects and reads.
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      // Copy first: a handler may unsubscribe during iteration.
      for (const handler of [...handlers]) {
        try {
          handler(data, meta);
        } catch (err: unknown) {
          this.logger?.warn('Event handler error', {
            event: eventName,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    // Wildcard listeners receive the full envelope; they have no
    // other way to know which event fired.
    for (const handler of [...this.wildcardListeners]) {
      try {
        handler(event as NexusEvent);
      } catch (err: unknown) {
        this.logger?.warn('Wildcard handler error', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return meta.id;
  }

  // ─── Query history ────────────────────────
  getRecent(filter: HistoryFilter = {}): NexusEvent[] {
    let result = this.history;
    if (filter.name) result = result.filter((e) => e.name === filter.name);
    if (filter.since !== undefined) {
      const since = filter.since;
      result = result.filter((e) => e.ts >= since);
    }
    if (filter.limit) result = result.slice(-filter.limit);
    return result;
  }

  // ─── Stats ────────────────────────────────
  stats(): EventBusStats {
    const counts: Record<string, number> = {};
    for (const e of this.history) counts[e.name] = (counts[e.name] ?? 0) + 1;

    const named: Record<string, number> = {};
    for (const [name, handlers] of this.listeners) named[name] = handlers.size;

    return {
      total_events: this.history.length,
      counts,
      listeners: { named, wildcard: this.wildcardListeners.size },
    };
  }

  clearHistory(): void {
    this.history = [];
  }

  /** Total registered handlers, wildcards included. */
  listenerCount(): number {
    let total = this.wildcardListeners.size;
    for (const handlers of this.listeners.values()) total += handlers.size;
    return total;
  }
}

// ─── Standardized event names ───────────────
export const EVENTS = {
  // Orchestration
  ORCH_START: 'orchestration.start',
  ORCH_NODE_DONE: 'orchestration.node.done',
  ORCH_NODE_FAIL: 'orchestration.node.fail',
  ORCH_COMPLETE: 'orchestration.complete',

  // Agents
  AGENT_START: 'agent.start',
  AGENT_DONE: 'agent.done',
  AGENT_FAIL: 'agent.fail',

  // AI calls
  AI_CALL_START: 'ai.call.start',
  AI_CALL_DONE: 'ai.call.done',
  AI_CALL_FAIL: 'ai.call.fail',
  AI_CALL_CACHED: 'ai.call.cached',

  // Deployment
  DEPLOY_START: 'deploy.start',
  DEPLOY_PROGRESS: 'deploy.progress',
  DEPLOY_DONE: 'deploy.done',
  DEPLOY_FAIL: 'deploy.fail',

  // System
  CACHE_HIT: 'cache.hit',
  CACHE_MISS: 'cache.miss',
  BREAKER_OPEN: 'breaker.open',
  BREAKER_CLOSE: 'breaker.close',
  ERROR: 'system.error',

  // User
  USER_ACTION: 'user.action',
  WORKFLOW_SAVED: 'workflow.saved',
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];