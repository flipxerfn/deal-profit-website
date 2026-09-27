// DealStore tests for subscription functionality
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('DealStore subscriptions', () => {
  let store;
  let mockState;
  let mockStorage;
  let DealStore;

  beforeEach(async () => {
    const mod = await import('./store.js');
    DealStore = mod.DealStore;
    mockStorage = new Map();
    mockState = {
      storage: {
        get: vi.fn(async (key) => mockStorage.get(key) ?? null),
        put: vi.fn(async (key, value) => { mockStorage.set(key, value); }),
        delete: vi.fn(async (key) => { mockStorage.delete(key); }),
        list: vi.fn(async () => Array.from(mockStorage.entries())),
        sql: vi.fn(async (query, params) => {
          // Simple in-memory SQL simulation for tests
          return { rows: [] };
        }),
        exec: vi.fn((query, ...bindings) => ({
          toArray: () => [],
        }))
      }
    };
    store = new DealStore(mockState, {});
  });

  it('should create subscriptions table on first use', async () => {
    // This will fail until we implement the schema
    expect(store.initSubscriptionsTable).toBeDefined();
  });

  it('should upsert and get subscription', async () => {
    // This will fail until we implement upsertSubscription/getSubscription
    expect(store.upsertSubscription).toBeDefined();
    expect(store.getSubscription).toBeDefined();
  });

  it('should link discord ID to user', async () => {
    // This will fail until we implement linkDiscord/getUserByDiscordId
    expect(store.linkDiscord).toBeDefined();
    expect(store.getUserByDiscordId).toBeDefined();
  });

  it('should get expired subscriptions', async () => {
    // This will fail until we implement getExpiredSubscriptions
    expect(store.getExpiredSubscriptions).toBeDefined();
  });

  it('should revoke subscription', async () => {
    // This will fail until we implement revokeSubscription
    expect(store.revokeSubscription).toBeDefined();
  });
});