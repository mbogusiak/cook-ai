import type { AstroIntegration } from "astro";

/**
 * Astro integration that adds polyfills for Cloudflare Workers runtime
 * This runs before any other code loads
 */
export function cloudflarePolyfillsIntegration(): AstroIntegration {
  return {
    name: "cloudflare-polyfills",
    hooks: {
      "astro:build:start": async () => {
        // This is too late - polyfills need to be at module load time
      },
    },
  };
}

// Actually, we need to handle this at the vite level
// Let's create a vite plugin instead
export function createCloudflarePolyfillsPlugin() {
  return {
    name: "cloudflare-polyfills",
    resolveId(id: string) {
      if (id === "virtual:cloudflare-polyfills") {
        return id;
      }
    },
    load(id: string) {
      if (id === "virtual:cloudflare-polyfills") {
        return `
          if (typeof globalThis !== "undefined" && !globalThis.MessageChannel) {
            globalThis.MessageChannel = class MessageChannel {
              constructor() {
                const messages1 = [];
                const messages2 = [];

                this.port1 = {
                  postMessage: (msg) => {
                    messages2.push(msg);
                  },
                  onmessage: null,
                  start: () => {},
                  close: () => {},
                };

                this.port2 = {
                  postMessage: (msg) => {
                    messages1.push(msg);
                  },
                  onmessage: null,
                  start: () => {},
                  close: () => {},
                };
              }
            };
          }
        `;
      }
    },
  };
}
