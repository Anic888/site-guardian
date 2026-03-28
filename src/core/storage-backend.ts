// ---------------------------------------------------------------------------
// Site Guardian — Storage Backend Abstraction
// ---------------------------------------------------------------------------
//
// Routes reads/writes to browser.storage.local or browser.storage.sync
// based on user preference and key classification.
//
// Keys are classified as:
//   SYNCABLE — settings, site rules, auto-rules (small, user wants everywhere)
//   LOCAL_ONLY — extension state, troubleshoot sessions (device-specific)
//
// When sync is enabled:
//   - Syncable keys write to BOTH sync and local (local as fallback)
//   - Reads prefer sync, fall back to local
//   - Quota errors fall back silently to local-only
//
// When sync is disabled (default):
//   - Everything uses local. No sync reads or writes.
// ---------------------------------------------------------------------------

import { browser } from './browser-api';
import { STORAGE_KEYS } from './types';

// ---------------------------------------------------------------------------
// Key classification
// ---------------------------------------------------------------------------

/** Keys that should be synced across devices when sync is enabled */
const SYNCABLE_KEYS = new Set<string>([
  STORAGE_KEYS.GLOBAL_SETTINGS,
  STORAGE_KEYS.SITE_RULES,
  STORAGE_KEYS.AUTO_RULES,
  STORAGE_KEYS.TAG_CONFIG,
]);

export function isSyncableKey(key: string): boolean {
  return SYNCABLE_KEYS.has(key);
}

// ---------------------------------------------------------------------------
// Sync availability detection
// ---------------------------------------------------------------------------

let syncAvailableCache: boolean | null = null;

export async function isSyncAvailable(): Promise<boolean> {
  if (syncAvailableCache !== null) return syncAvailableCache;

  try {
    // Test if sync storage is accessible
    await browser.storage.sync.get('__sg_sync_test');
    syncAvailableCache = true;
    return true;
  } catch {
    syncAvailableCache = false;
    return false;
  }
}

// ---------------------------------------------------------------------------
// Backend read/write with routing
// ---------------------------------------------------------------------------

/**
 * Read a key from the appropriate backend.
 * When syncEnabled + key is syncable → try sync first, fall back to local.
 * Otherwise → local only.
 */
export async function backendRead<T>(
  key: string,
  syncEnabled: boolean,
): Promise<T | undefined> {
  // If sync enabled and key is syncable, try sync first
  if (syncEnabled && isSyncableKey(key)) {
    const available = await isSyncAvailable();
    if (available) {
      try {
        const syncResult = await browser.storage.sync.get(key);
        if (syncResult[key] !== undefined) {
          return syncResult[key] as T;
        }
      } catch {
        // Sync read failed — fall through to local
      }
    }
  }

  // Local read (always available)
  try {
    const localResult = await browser.storage.local.get(key);
    return localResult[key] as T | undefined;
  } catch {
    return undefined;
  }
}

/**
 * Write a key to the appropriate backend.
 * When syncEnabled + key is syncable → write to BOTH sync and local.
 * Otherwise → local only.
 */
export async function backendWrite<T>(
  key: string,
  value: T,
  syncEnabled: boolean,
): Promise<boolean> {
  // Always write to local (our safety net)
  try {
    await browser.storage.local.set({ [key]: value });
  } catch (err) {
    console.error(`[Site Guardian] Local write failed for "${key}":`, err);
    return false;
  }

  // If sync enabled and key is syncable, also write to sync
  if (syncEnabled && isSyncableKey(key)) {
    const available = await isSyncAvailable();
    if (available) {
      try {
        await browser.storage.sync.set({ [key]: value });
      } catch (err) {
        // Quota exceeded or sync unavailable — local write already succeeded
        console.warn(`[Site Guardian] Sync write failed for "${key}":`, err);
      }
    }
  }

  return true;
}

/**
 * Remove keys from appropriate backends.
 */
export async function backendRemove(
  keys: string[],
  syncEnabled: boolean,
): Promise<void> {
  await browser.storage.local.remove(keys);

  if (syncEnabled) {
    const syncKeys = keys.filter(isSyncableKey);
    if (syncKeys.length > 0) {
      const available = await isSyncAvailable();
      if (available) {
        try {
          await browser.storage.sync.remove(syncKeys);
        } catch {
          // Non-critical
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Migration: enable/disable sync
// ---------------------------------------------------------------------------

/**
 * Migrate syncable data from local to sync.
 * Called when user enables sync.
 */
export async function migrateToSync(): Promise<void> {
  const available = await isSyncAvailable();
  if (!available) {
    throw new Error('Sync storage is not available in this browser.');
  }

  const syncKeys = [...SYNCABLE_KEYS];

  for (const key of syncKeys) {
    try {
      const localResult = await browser.storage.local.get(key);
      if (localResult[key] !== undefined) {
        await browser.storage.sync.set({ [key]: localResult[key] });
      }
    } catch (err) {
      console.warn(`[Site Guardian] Failed to migrate "${key}" to sync:`, err);
      // Continue with other keys
    }
  }
}

/**
 * Migrate syncable data from sync back to local.
 * Called when user disables sync.
 */
export async function migrateFromSync(): Promise<void> {
  const available = await isSyncAvailable();
  if (!available) return; // Nothing to migrate from

  const syncKeys = [...SYNCABLE_KEYS];

  for (const key of syncKeys) {
    try {
      const syncResult = await browser.storage.sync.get(key);
      if (syncResult[key] !== undefined) {
        // Ensure local has the sync data
        await browser.storage.local.set({ [key]: syncResult[key] });
        // Clear sync
        await browser.storage.sync.remove(key);
      }
    } catch {
      // Non-critical — local already has data from dual-write
    }
  }
}

// ---------------------------------------------------------------------------
// Storage info for diagnostics
// ---------------------------------------------------------------------------

const SYNC_QUOTA_BYTES = 102_400; // 100KB

export async function getStorageInfo(syncEnabled: boolean): Promise<{
  activeBackend: 'local' | 'sync';
  syncAvailable: boolean;
  localBytesUsed: number;
  syncBytesUsed: number;
  syncQuotaBytes: number;
}> {
  const syncAvailable = await isSyncAvailable();

  let localBytesUsed = -1;
  try {
    if (browser.storage.local.getBytesInUse) {
      localBytesUsed = await browser.storage.local.getBytesInUse(null);
    }
  } catch { /* ok */ }

  let syncBytesUsed = -1;
  if (syncAvailable) {
    try {
      if (browser.storage.sync.getBytesInUse) {
        syncBytesUsed = await browser.storage.sync.getBytesInUse(null);
      }
    } catch { /* ok */ }
  }

  return {
    activeBackend: syncEnabled && syncAvailable ? 'sync' : 'local',
    syncAvailable,
    localBytesUsed,
    syncBytesUsed,
    syncQuotaBytes: SYNC_QUOTA_BYTES,
  };
}
