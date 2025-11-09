/**
 * Custom Cloudflare Worker wrapper that provides polyfills
 * This file needs to be at the top level to load before anything else
 */

// Polyfill MessageChannel for React 19 SSR compatibility
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

// Import the actual Astro worker
import Worker from "./dist/_worker.js/index.js";

export default Worker;
