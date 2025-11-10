// @ts-check
import { defineConfig, envField } from "astro/config";
import fs from "fs";
import path from "path";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// Helper to inject polyfills into the worker and chunks
function injectPolyfills() {
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

  return {
    name: "inject-cloudflare-polyfills",
    apply: "build",
    enforce: "post",
    async writeBundle(_options) {
      try {
        // eslint-disable-next-line no-undef
        const workerDir = path.join(process.cwd(), "dist/_worker.js");

        // Process all JS files in the worker directory
        const files = fs.readdirSync(workerDir);
        for (const file of files) {
          if (file.endsWith(".mjs") || file.endsWith(".js")) {
            const filePath = path.join(workerDir, file);
            let content = fs.readFileSync(filePath, "utf-8");

            // Skip if already injected
            if (content.includes("// MessageChannel polyfill for React 19 compatibility")) {
              continue;
            }

            // Add polyfill at the very beginning
            content = polyfill + content;
            fs.writeFileSync(filePath, content);
          }
        }

        // Also process chunks subdirectory
        const chunksDir = path.join(workerDir, "chunks");
        if (fs.existsSync(chunksDir)) {
          const chunkFiles = fs.readdirSync(chunksDir);
          for (const file of chunkFiles) {
            if (file.endsWith(".mjs") || file.endsWith(".js")) {
              const filePath = path.join(chunksDir, file);
              let content = fs.readFileSync(filePath, "utf-8");

              // Skip if already injected
              if (content.includes("// MessageChannel polyfill for React 19 compatibility")) {
                continue;
              }

              // Add polyfill at the very beginning
              content = polyfill + content;

              // Also replace MessageChannel constructor calls with a safe wrapper
              // This handles cases where new MessageChannel() is called before the polyfill loads
              content = content.replace(
                /new\s+MessageChannel\s*\(\s*\)/g,
                `(globalThis.MessageChannel ? new globalThis.MessageChannel() : {port1: {postMessage() {}}, port2: {postMessage() {}}})`
              );

              fs.writeFileSync(filePath, content);
            }
          }
        }

        // eslint-disable-next-line no-undef, no-console
        console.log("✓ Injected MessageChannel polyfill into all worker files");
      } catch (err) {
        // eslint-disable-next-line no-undef, no-console
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
