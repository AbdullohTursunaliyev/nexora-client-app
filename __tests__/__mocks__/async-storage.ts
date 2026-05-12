// Minimal in-memory AsyncStorage stub for tests. The real package pulls in
// native code that Jest can't load under the node environment.
const store: Record<string, string> = {};

export default {
  getItem: async (k: string): Promise<string | null> => store[k] ?? null,
  setItem: async (k: string, v: string): Promise<void> => {
    store[k] = v;
  },
  removeItem: async (k: string): Promise<void> => {
    delete store[k];
  },
  multiRemove: async (keys: string[]): Promise<void> => {
    for (const k of keys) delete store[k];
  },
  clear: async (): Promise<void> => {
    for (const k of Object.keys(store)) delete store[k];
  },
};
