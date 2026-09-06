import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  /**
   * When this bundle was built. The client sends it nowhere; it compares it
   * against when the API process started, so a server left running from before
   * a `git pull` announces itself instead of quietly serving a fresh screen off
   * stale rules. See `client/src/main.ts`.
   */
  define: { __BUILT_AT__: JSON.stringify(Date.now()) },
  build: { outDir: "../dist", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3117" },
  },
});
