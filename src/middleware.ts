// CRITICAL: Import polyfills first, before anything else
import "@/lib/polyfills";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  return next();
});
