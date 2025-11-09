// @ts-check
import { defineConfig, envField } from "astro/config";
import fs from "fs";
import path from "path";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// Helper to inject polyfills into the worker
function injectPolyfills() {
  return {
    name: "inject-cloudflare-polyfills",
    apply: "build",
    enforce: "post",
    async writeBundle() {
      try {
        const workerPath = path.join(process.cwd(), "dist/_worker.js/index.js");
        if (fs.existsSync(workerPath)) {
          let content = fs.readFileSync(workerPath, "utf-8");

          // Skip if already injected
          if (content.includes("// MessageChannel polyfill for React 19 compatibility")) {
            return;
          }

          // Add polyfill at the very beginning, before any imports
          const polyfill = `// MessageChannel polyfill for React 19 compatibility
if (typeof globalThis !== "undefined" && !globalThis.MessageChannel) {
  globalThis.MessageChannel = class MessageChannel {
    constructor() {
      this.port1 = { postMessage() {}, onmessage: null, start() {}, close() {} };
      this.port2 = { postMessage() {}, onmessage: null, start() {}, close() {} };
    }
  };
}

`;

          content = polyfill + content;
          fs.writeFileSync(workerPath, content);
          console.log("✓ Injected MessageChannel polyfill into worker");
        }
      } catch (err) {
        console.error("Failed to inject polyfills:", err);
      }
    },
  };
}

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  adapter: cloudflare({
    mode: "advanced",
    platformProxy: {
      enabled: true,
    },
  }),
  vite: {
    plugins: [tailwindcss(), injectPolyfills()],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    ssr: {
      external: ["node:buffer", "node:util", "node:crypto"],
    },
  },
  env: {
    schema: {
      // Public client variables (accessible in browser)
      PUBLIC_SUPABASE_URL: envField.string({
        context: "client",
        access: "public",
      }),
      PUBLIC_SUPABASE_KEY: envField.string({
        context: "client",
        access: "public",
      }),
      // Secret server variables (never exposed to client)
      SUPABASE_URL: envField.string({
        context: "server",
        access: "secret",
      }),
      SUPABASE_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
      OPENROUTER_API_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      // E2E testing variables
      E2E_USERNAME_ID: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      E2E_USERNAME: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      E2E_PASSWORD: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      E2E_CLEANUP: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
});
