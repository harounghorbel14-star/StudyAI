# TypeScript Migration

## Status

**13 of 38 modules migrated.** The build is green, both test suites pass, and
JavaScript and TypeScript run side by side. Nothing is blocked on finishing
the migration.

| Module | Status | Notes |
|---|---|---|
| `types/core.ts` | TS | Shared type foundation — every migration imports this |
| `types/ambient.d.ts` | TS | Minimal Node types; superseded by `@types/node` once installed |
| `services/contracts.ts` | TS | Fixed a crash on null orchestration nodes; added cycle detection |
| `services/event-bus.ts` | TS | Fixed the handler contract — 12 subscribers were reading `undefined` |
| `services/logger.ts` | TS | Console fallback now honours the configured level |
| `services/temporal-ux.ts` | TS | `Record<TimeBlock, BlockConfig>` makes a missing config a compile error |
| `services/local-llm.ts` | TS | Typed backends and discriminated response shapes |
| `services/semantic-cache.ts` | TS | Narrowed `cached` field caught a real bug |
| `services/ai-twin.ts` | TS | Typed patterns and predictions |
| `services/predictive-execution.ts` | TS | Typed prompt templates; unknown actions cannot reach the API |
| `security/validation.ts` | TS | Output types inferred from the schema |
| `security/hardening.ts` | TS | Typed limit tiers and rate-limit results |
| `security/rbac.ts` | TS | Fail-closed on unknown roles and permissions |
| `monitoring/observability.ts` | TS | Typed scrubbing and bounded batching |
| everything else | JS | Works unchanged via the resolution shim |

## How the two coexist

`services/_resolve.js` resolves each module to its compiled TypeScript when a
build exists, and to the original JavaScript otherwise:

```
dist/services/temporal-ux.js   ← preferred (compiled from .ts)
services/temporal-ux.js        ← fallback (original .js)
```

The composition root calls `load('services/temporal-ux')` instead of
`require('./temporal-ux')`. Callers do not need to know which modules have
been migrated. When the migration finishes, delete `_resolve.js` and switch
those calls back to plain requires.

## Commands

```bash
npm run typecheck    # tsc --noEmit, strict mode
npm run build        # compile to dist/
npm run build:watch  # recompile on change
npm test             # build, then unit + integration
```

`prestart` runs `tsc`, so `npm start` always serves a fresh build.

## Migrating the next module

1. **Pick a leaf.** Prefer files with no local `require` calls — they cannot
   break anything downstream. Check with:
   ```bash
   grep -c "require(['\"]\.\." services/<name>.js
   ```

2. **Write `<name>.ts`** next to the existing `.js`. Import shared types from
   `../types/core`. Do not use `any`; if a type is genuinely unknown, use
   `unknown` and narrow it.

3. **Type-check.** `npm run typecheck` must be clean. Errors here are usually
   real bugs — read them before reaching for a cast.

4. **Point the composition root at it:**
   ```js
   const { Thing } = load('services/<name>');
   ```

5. **Point tests at the compiled output:**
   ```js
   require('../dist/services/<name>')
   ```

6. **Run both suites.** `npm test` must stay green.

7. **Delete the old `.js`** only after steps 3–6 pass.

## Suggested order

Leaves first, then the modules that depend on them.

**Ready now** (no local requires): `cost-optimizer`, `adaptive`,
`memory-fabric`, `disaster-recovery`, `health-monitor`, `db-adapter`,
`security/audit`, `security/secret-rotation`, `monitoring/metrics`,
`monitoring/tracing`, `services/cache`, `services/tracer`

**After those**: `cache`, `tracer`, `knowledge`, `voice`, `media-pipeline`,
`business-ops`, `workspaces`, `community`, `payments`, `notifications`,
`embeddings`, `reality-map`, `shadow-mode`, `dreamspace`

**Last** (many dependents): `services/index.js`, then `server.js`

## Rules that keep this safe

- **No `any`.** It defeats the purpose. Use `unknown` and narrow.
- **One module per commit.** A failure is then trivial to bisect.
- **Tests stay green at every step.** Never migrate two modules on red.
- **Fix errors, do not silence them.** `as` casts and `@ts-ignore` hide the
  bugs this migration exists to find.

## Bugs the type checker has already caught

| Bug | Impact |
|---|---|
| `requireRole()` compared against `undefined` for an unknown role name | **Fail-open authorization.** A typo such as `requireRole('administrator')` granted every caller access, including guests |
| Admin emails stored raw but compared lowercased | Any admin whose configured address contained a capital letter was silently denied admin |
| Event handlers received `{name, data, ts, id}` but every subscriber read fields off the top level | **12 subscribers silently broken.** Predictive execution never fired, Dreamspace never marked users active, and every analytics event recorded `user_id: undefined` |
| `AIResult.cached` widened past `'exact' \| 'similar'` | A freshly-computed result could be persisted flagged as a cache hit, inflating reported cost savings |
| `validateOrchestrationGraph` dereferenced a node it had already rejected | A `null` node threw a `TypeError` instead of returning a validation error |
| Console logger ignored its configured level | Debug output leaked into production logs whenever pino was unavailable |
| `crypto` imported untyped | No signature checking on hashing calls |

Every one was latent in the JavaScript and invisible to the test suite.
Each now has a regression test.

## Installing the real Node types

`types/ambient.d.ts` is a stopgap so `tsc` runs before `npm install`. Once
dependencies are installed:

```bash
npm i -D @types/node
```

Then add `"types": ["node"]` to `compilerOptions`. The ambient file merges
harmlessly with the real definitions and can be deleted once every module is
migrated.