/**
 * Polyfills for Cloudflare Workers runtime
 * This module provides polyfills for APIs that may be missing in the Workers runtime
 */

// Polyfill MessageChannel if it doesn't exist
if (typeof globalThis !== "undefined" && !globalThis.MessageChannel) {
  (globalThis as any).MessageChannel = class MessageChannel {
    port1: any;
    port2: any;

    constructor() {
      const messages1: any[] = [];
      const messages2: any[] = [];

      const createPort = (targetMessages: any[]) => ({
        postMessage: (msg: any) => {
          targetMessages.push(msg);
          // Simulate async message delivery
          setTimeout(() => {
            if (createPort.onmessage) {
              createPort.onmessage({ data: msg });
            }
          }, 0);
        },
        onmessage: null as any,
        start: () => {},
        close: () => {},
      });

      this.port1 = createPort(messages2);
      this.port2 = createPort(messages1);
    }
  };
}

// Export a marker to ensure this module is loaded
export const polyfillsLoaded = true;
