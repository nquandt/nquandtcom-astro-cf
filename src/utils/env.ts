// Build a merged `env` object at module-load so callers can import a simple
// `env` map synchronously. We still keep async helpers for runtimes that
// require a dynamic Cloudflare import, but most callers can use `env`.

// Attempt to load Cloudflare worker bindings (if available). This uses
// top-level await so the import runs during module initialization.
let cfEnv: Record<string, string> = {};
try {
  // dynamic import will throw outside CF worker runtime
  // eslint-disable-next-line no-undef
  const cf = await import("cloudflare:workers");
  cfEnv = (cf as any).env || {};
} catch (e) {
  // ignore — not in Cloudflare runtime
}

// Collect other env sources. import.meta.env is available in build-time and
// client contexts; process.env is available in Node.
const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};
const procEnv = (typeof process !== 'undefined' && process.env) ? process.env : {};
const globalEnv = (typeof globalThis !== 'undefined' && (globalThis as any).ENV) ? (globalThis as any).ENV : {};

// Merge precedence: process.env -> import.meta.env -> globalThis.ENV -> cfEnv
// (we prefer explicit process.env when running under Node)
// Use Partial<Env> so callers can import `env` and access typed properties
// declared in `src/env.d.ts` without requiring every binding to exist.
export const env: Env = Object.assign({}, cfEnv, globalEnv, metaEnv, procEnv) as Env;

// Expose a global `env` to match Cloudflare worker code that references `env`
// without importing. This copies the merged env into globalThis.env when
// possible so existing code can continue to use `env` directly.
try {
  if (typeof globalThis !== 'undefined') {
    // @ts-ignore
    (globalThis as any).env = env;
  }
} catch (e) {
  // ignore
}

// In-memory KV stub factory used for fallbacks during local dev/testing.
// It implements the minimal subset of the Cloudflare `KVNamespace` used by
// the app: `get`, `put`, `delete`, and `list`.
function createInMemoryKV() {
  const store: Record<string, string> = {};
  return {
    async get<T = string>(key: string, type?: "json") {
      const v = store[key];
      if (v === undefined) return null as any;
      if (type === "json") {
        try {
          return JSON.parse(v) as T;
        } catch (e) {
          return null as any;
        }
      }
      return v as any as T;
    },
    async put(key: string, value: string) {
      store[key] = value;
    },
    async delete(key: string) {
      delete store[key];
    },
    async list(opts?: { prefix?: string }) {
      const prefix = opts && opts.prefix ? opts.prefix : "";
      const keys = Object.keys(store)
        .filter(k => k.startsWith(prefix))
        .map(name => ({ name }));
      return { keys };
    },
  } as unknown as KVNamespace;
}

// Fallbacks to use when real Cloudflare bindings are not available. These
// are intentionally minimal and designed for local dev and tests only.
export const fallbacks: Partial<Env> = {
  USERS: createInMemoryKV(),
  SESSIONS: createInMemoryKV(),
};

// Typed overloads: if the `name` is a key of `Env`, return that property's
// type (or undefined). If `name` is an arbitrary string, fall back to
// `string | undefined` (Cloudflare/other bindings are strings at runtime).
export function getEnv<K extends keyof Env>(name: K, defaultValue?: Env[K]): Env[K] | undefined;
export function getEnv(name: string, defaultValue?: string): string | undefined;
export function getEnv(name: keyof Env | string, defaultValue?: any): any {
  const primary = (env as any)[name];
  if (primary !== undefined) return primary === undefined ? defaultValue : primary;

  const fb = (fallbacks as any)[name];
  if (fb !== undefined) return fb === undefined ? defaultValue : fb;

  return defaultValue;
}