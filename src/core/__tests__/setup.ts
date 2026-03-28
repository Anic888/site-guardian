// Mock webextension-polyfill for Node.js test environment
import { vi } from 'vitest';

const localStorageMock = new Map<string, unknown>();
const syncStorageMock = new Map<string, unknown>();

function makeStorageMock(store: Map<string, unknown>) {
  return {
    get: vi.fn(async (key: string) => {
      const val = store.get(key);
      return val !== undefined ? { [key]: val } : {};
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(items)) {
        store.set(k, v);
      }
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const arr = Array.isArray(keys) ? keys : [keys];
      for (const k of arr) {
        store.delete(k);
      }
    }),
    getBytesInUse: vi.fn(async () => 0),
  };
}

vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      local: makeStorageMock(localStorageMock),
      sync: makeStorageMock(syncStorageMock),
    },
    runtime: {
      id: 'mock-extension-id',
      sendMessage: vi.fn(),
      onMessage: { addListener: vi.fn() },
      onInstalled: { addListener: vi.fn() },
      onStartup: { addListener: vi.fn() },
      openOptionsPage: vi.fn(),
      getURL: vi.fn((path: string) => `chrome-extension://mock/${path}`),
    },
    tabs: {
      query: vi.fn(async () => []),
      create: vi.fn(),
    },
    management: {
      getAll: vi.fn(async () => []),
      setEnabled: vi.fn(async () => {}),
      getSelf: vi.fn(async () => ({ id: 'mock-extension-id' })),
    },
    action: {
      setBadgeText: vi.fn(async () => {}),
      setBadgeBackgroundColor: vi.fn(async () => {}),
      setBadgeTextColor: vi.fn(async () => {}),
    },
    scripting: {
      executeScript: vi.fn(async () => []),
    },
  },
}));

// Reset storage between tests
import { beforeEach } from 'vitest';
beforeEach(() => {
  localStorageMock.clear();
  syncStorageMock.clear();
});
