// This file can be used to add references for global types like `vite/client`.

// Add global `vite/client` types. For more info, see: https://vitejs.dev/guide/features#client-types
/// <reference types="vite/client" />

// Injected by vite.config.ts's `define` at build time (the deployed commit
// SHA, or "dev" locally). Used to detect when a newer build has gone live.
declare const __BUILD_VERSION__: string;
