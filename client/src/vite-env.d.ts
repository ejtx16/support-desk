/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute API base URL for static deploys. Unset = same-origin `/api` (dev proxy). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
