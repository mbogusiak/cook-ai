// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

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
    plugins: [tailwindcss()],
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
