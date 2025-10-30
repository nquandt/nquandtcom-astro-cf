/// <reference types="astro/client" />

type KVNamespace = import("@cloudflare/workers-types").KVNamespace;

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    session: import("./server/session").Session | null;
    user: import("./server/user").User | null;
    language: import("./utils/language").SupportedLanguage;
  }
}

interface Env {
  USERS: KVNamespace;
  SESSIONS: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_REDIRECT_URI?: string;
  PERSONAL_EMAIL?: string;
  PERSONAL_PHONE?: string;
}

// Expose a global `env` variable for convenience in server code. In Cloudflare
// workers this is provided by the runtime; in local dev we copy bindings into
// globalThis.env so code can reference `env` directly.
// declare var env: Env;

// Declare module for cloudflare:workers
declare module "cloudflare:workers" {
  export const env: Env;
  export function withEnv<T>(bindings: Partial<Env>, callback: () => T): T;
}
