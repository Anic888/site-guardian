// ---------------------------------------------------------------------------
// Site Guardian — Storage Layer
// ---------------------------------------------------------------------------
//
// All persistence goes through this module. It wraps browser.storage.local
// with typed accessors, safe defaults, and corruption resilience.
//
// Design principles:
//   - Every read returns a valid value (defaults on missing/corrupt data)
//   - Writes are atomic per-key (browser.storage.local guarantees this)
//   - Schema version is checked on every read to enable future migrations
//   - No in-memory cache — MV3 service workers can restart at any time,
//     so we always read from storage
// ---------------------------------------------------------------------------

import { browser } from './browser-api';
import {
  DEFAULT_EXTENSION_STATE,
  DEFAULT_GLOBAL_SETTINGS,
  SCHEMA_VERSION,
  SiteMode,
  STORAGE_KEYS,
  DEFAULT_TAG_CONFIG,
  type AutoRule,
  type ExtensionState,
  type ExtensionTagEntry,
  type GlobalSettings,
  type SiteRule,
  type SiteRulesMap,
  type StorageBackendInfo,
  type TagConfig,
  type TroubleshootSession,
} from './types';
import {
  backendRead,
  backendRemove,
  backendWrite,
  getStorageInfo,
  migrateFromSync,
  migrateToSync,
} from './storage-backend';

const VALID_MODES = new Set<string>(Object.values(SiteMode));

// ---------------------------------------------------------------------------
// Internal helpers — backend-aware read/write
// ---------------------------------------------------------------------------

/** Cached sync preference to avoid reading GlobalSettings recursively */
let syncEnabledCache = false;

/**
 * Read a single key using the storage backend (sync or local).
 */
async function readKey<T>(key: string): Promise<T | undefined> {
  try {
    return await backendRead<T>(key, syncEnabledCache);
  } catch (err) {
    console.error(`[Site Guardian] Storage read failed for key "${key}":`, err);
    return undefined;
  }
}

/**
 * Write a single key using the storage backend (sync or local).
 */
async function writeKey<T>(key: string, value: T): Promise<boolean> {
  try {
    return await backendWrite(key, value, syncEnabledCache);
  } catch (err) {
    console.error(`[Site Guardian] Storage write failed for key "${key}":`, err);
    return false;
  }
}

/**
 * Validate that a value looks like a GlobalSettings object.
 * Returns false for null, undefined, wrong types, or missing fields.
 */
function isValidGlobalSettings(val: unknown): val is GlobalSettings {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  const baseValid =
    typeof obj.defaultMode === 'string' &&
    VALID_MODES.has(obj.defaultMode) &&
    typeof obj.firstRunComplete === 'boolean' &&
    typeof obj.schemaVersion === 'number';
  if (!baseValid) return false;
  // syncEnabled is optional for backward compat — default to false if missing
  if (obj.syncEnabled !== undefined && typeof obj.syncEnabled !== 'boolean') {
    return false;
  }
  return true;
}

/**
 * Validate that a value looks like a SiteRulesMap.
 * Checks top-level structure; individual rules are validated on access.
 */
function isValidSiteRulesMap(val: unknown): val is SiteRulesMap {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
  return true;
}

/**
 * Validate that a value looks like a single SiteRule.
 */
function isValidSiteRule(val: unknown): val is SiteRule {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.mode === 'string' &&
    VALID_MODES.has(obj.mode) &&
    typeof obj.updatedAt === 'string'
  );
}

/**
 * Validate that a value looks like an ExtensionState object.
 */
function isValidExtensionState(val: unknown): val is ExtensionState {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.installedAt === 'string' && typeof obj.lastActiveAt === 'string'
  );
}

// ---------------------------------------------------------------------------
// Schema migration stub
// ---------------------------------------------------------------------------

/**
 * Run any needed migrations when schema version is older than current.
 * For MVP, this just updates the schema version.
 * Future: add migration functions keyed by version number.
 */
async function migrateIfNeeded(settings: GlobalSettings): Promise<GlobalSettings> {
  if (settings.schemaVersion === SCHEMA_VERSION) {
    return settings;
  }

  // Future migrations would go here:
  // if (settings.schemaVersion < 2) { settings = migrateV1toV2(settings); }
  // if (settings.schemaVersion < 3) { settings = migrateV2toV3(settings); }

  console.warn(
    `[Site Guardian] Storage schema version ${settings.schemaVersion} → ${SCHEMA_VERSION}`,
  );

  const migrated: GlobalSettings = {
    ...settings,
    schemaVersion: SCHEMA_VERSION,
  };

  await writeKey(STORAGE_KEYS.GLOBAL_SETTINGS, migrated);
  return migrated;
}

// ---------------------------------------------------------------------------
// Public API — Global Settings
// ---------------------------------------------------------------------------

export async function getGlobalSettings(): Promise<GlobalSettings> {
  const raw = await readKey<unknown>(STORAGE_KEYS.GLOBAL_SETTINGS);

  let settings: GlobalSettings;
  if (!isValidGlobalSettings(raw)) {
    settings = { ...DEFAULT_GLOBAL_SETTINGS };
    await writeKey(STORAGE_KEYS.GLOBAL_SETTINGS, settings);
  } else {
    settings = await migrateIfNeeded(raw);
  }

  // Keep sync cache in sync with stored preference
  syncEnabledCache = settings.syncEnabled ?? false;
  return settings;
}

export async function updateGlobalSettings(
  partial: Partial<Pick<GlobalSettings, 'defaultMode' | 'syncEnabled'>>,
): Promise<GlobalSettings> {
  const current = await getGlobalSettings();
  const updated: GlobalSettings = { ...current, ...partial };
  await writeKey(STORAGE_KEYS.GLOBAL_SETTINGS, updated);
  return updated;
}

export async function markFirstRunComplete(): Promise<void> {
  const current = await getGlobalSettings();
  await writeKey(STORAGE_KEYS.GLOBAL_SETTINGS, {
    ...current,
    firstRunComplete: true,
  });
}

// ---------------------------------------------------------------------------
// Public API — Site Rules
// ---------------------------------------------------------------------------

export async function getAllSiteRules(): Promise<SiteRulesMap> {
  const raw = await readKey<unknown>(STORAGE_KEYS.SITE_RULES);

  if (!isValidSiteRulesMap(raw)) {
    // Missing or corrupt — initialize empty
    const empty: SiteRulesMap = {};
    await writeKey(STORAGE_KEYS.SITE_RULES, empty);
    return empty;
  }

  return raw;
}

export async function getSiteRule(
  hostname: string,
): Promise<SiteRule | undefined> {
  const rules = await getAllSiteRules();

  if (!Object.prototype.hasOwnProperty.call(rules, hostname)) {
    return undefined;
  }

  const rule = rules[hostname];
  if (rule && isValidSiteRule(rule)) {
    return rule;
  }

  return undefined;
}

export async function setSiteMode(
  hostname: string,
  mode: SiteMode,
): Promise<SiteRule> {
  const rules = await getAllSiteRules();

  const rule: SiteRule = {
    mode,
    updatedAt: new Date().toISOString(),
  };

  rules[hostname] = rule;
  await writeKey(STORAGE_KEYS.SITE_RULES, rules);
  return rule;
}

export async function removeSiteRule(hostname: string): Promise<void> {
  const rules = await getAllSiteRules();
  delete rules[hostname];
  await writeKey(STORAGE_KEYS.SITE_RULES, rules);
}

// ---------------------------------------------------------------------------
// Public API — Extension State
// ---------------------------------------------------------------------------

export async function getExtensionState(): Promise<ExtensionState> {
  const raw = await readKey<unknown>(STORAGE_KEYS.EXTENSION_STATE);

  if (!isValidExtensionState(raw)) {
    const defaults = {
      ...DEFAULT_EXTENSION_STATE,
      installedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    await writeKey(STORAGE_KEYS.EXTENSION_STATE, defaults);
    return defaults;
  }

  return raw;
}

export async function updateLastActive(): Promise<void> {
  const state = await getExtensionState();
  await writeKey(STORAGE_KEYS.EXTENSION_STATE, {
    ...state,
    lastActiveAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Public API — Tag Config
// ---------------------------------------------------------------------------

function isValidTagConfig(val: unknown): val is TagConfig {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.extensions === 'object' &&
    obj.extensions !== null &&
    Array.isArray(obj.customTags)
  );
}

export async function getTagConfig(): Promise<TagConfig> {
  const raw = await readKey<unknown>(STORAGE_KEYS.TAG_CONFIG);
  if (!isValidTagConfig(raw)) return { ...DEFAULT_TAG_CONFIG };
  return raw;
}

export async function setExtensionTags(
  extensionId: string,
  entry: ExtensionTagEntry,
): Promise<void> {
  const config = await getTagConfig();
  config.extensions[extensionId] = entry;
  await writeKey(STORAGE_KEYS.TAG_CONFIG, config);
}

export async function removeExtensionTags(extensionId: string): Promise<void> {
  const config = await getTagConfig();
  delete config.extensions[extensionId];
  await writeKey(STORAGE_KEYS.TAG_CONFIG, config);
}

export async function addCustomTag(tag: string): Promise<void> {
  const config = await getTagConfig();
  const normalized = tag.trim().slice(0, 30);
  if (normalized && !config.customTags.includes(normalized)) {
    config.customTags.push(normalized);
    await writeKey(STORAGE_KEYS.TAG_CONFIG, config);
  }
}

export async function removeCustomTag(tag: string): Promise<void> {
  const config = await getTagConfig();
  config.customTags = config.customTags.filter((t) => t !== tag);
  // Also remove this tag from all extensions
  for (const entry of Object.values(config.extensions)) {
    entry.tags = entry.tags.filter((t) => t !== tag);
  }
  await writeKey(STORAGE_KEYS.TAG_CONFIG, config);
}

// ---------------------------------------------------------------------------
// Public API — Auto-Rules
// ---------------------------------------------------------------------------

function isValidAutoRule(val: unknown): val is AutoRule {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.enabled === 'boolean' &&
    typeof obj.priority === 'number' &&
    typeof obj.builtIn === 'boolean' &&
    obj.condition !== null &&
    typeof obj.condition === 'object' &&
    obj.action !== null &&
    typeof obj.action === 'object'
  );
}

export async function getUserAutoRules(): Promise<AutoRule[]> {
  const raw = await readKey<unknown>(STORAGE_KEYS.AUTO_RULES);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidAutoRule);
}

export async function saveUserAutoRules(rules: AutoRule[]): Promise<void> {
  await writeKey(STORAGE_KEYS.AUTO_RULES, rules);
}

export async function setAutoRule(rule: AutoRule): Promise<void> {
  const rules = await getUserAutoRules();
  const idx = rules.findIndex((r) => r.id === rule.id);
  if (idx >= 0) {
    rules[idx] = rule;
  } else {
    rules.push(rule);
  }
  await saveUserAutoRules(rules);
}

export async function deleteAutoRule(ruleId: string): Promise<void> {
  const rules = await getUserAutoRules();
  await saveUserAutoRules(rules.filter((r) => r.id !== ruleId));
}

// ---------------------------------------------------------------------------
// Public API — Troubleshoot Sessions
// ---------------------------------------------------------------------------

function isValidTroubleshootSession(val: unknown): val is TroubleshootSession {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.active === 'boolean' &&
    Array.isArray(obj.disabledExtensionIds) &&
    typeof obj.startedAt === 'string'
  );
}

export async function getTroubleshootSession(): Promise<TroubleshootSession | null> {
  const raw = await readKey<unknown>(STORAGE_KEYS.TROUBLESHOOT_SESSION);
  if (!isValidTroubleshootSession(raw)) return null;
  return raw;
}

export async function saveTroubleshootSession(
  session: TroubleshootSession,
): Promise<void> {
  await writeKey(STORAGE_KEYS.TROUBLESHOOT_SESSION, session);
}

export async function clearTroubleshootSession(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEYS.TROUBLESHOOT_SESSION);
}

// ---------------------------------------------------------------------------
// Public API — Danger Zone
// ---------------------------------------------------------------------------

export async function resetAllSettings(): Promise<void> {
  const allKeys = [
    STORAGE_KEYS.GLOBAL_SETTINGS,
    STORAGE_KEYS.SITE_RULES,
    STORAGE_KEYS.EXTENSION_STATE,
    STORAGE_KEYS.TROUBLESHOOT_SESSION,
    STORAGE_KEYS.AUTO_RULES,
    STORAGE_KEYS.TAG_CONFIG,
  ];
  await backendRemove(allKeys, syncEnabledCache);
  syncEnabledCache = false;
}

// ---------------------------------------------------------------------------
// Public API — Sync Management
// ---------------------------------------------------------------------------

export async function enableSync(): Promise<StorageBackendInfo> {
  await migrateToSync();
  await updateGlobalSettings({ syncEnabled: true });
  syncEnabledCache = true;
  return getStorageBackendInfo();
}

export async function disableSync(): Promise<StorageBackendInfo> {
  await migrateFromSync();
  syncEnabledCache = false;
  await updateGlobalSettings({ syncEnabled: false });
  return getStorageBackendInfo();
}

export async function getStorageBackendInfo(): Promise<StorageBackendInfo> {
  return getStorageInfo(syncEnabledCache);
}

// ---------------------------------------------------------------------------
// Public API — Debug / Transparency
// ---------------------------------------------------------------------------

/** Returns the raw byte usage of extension storage */
export async function getStorageUsageBytes(): Promise<number> {
  if (!browser.storage.local.getBytesInUse) {
    return -1;
  }
  try {
    return await browser.storage.local.getBytesInUse(null);
  } catch {
    return -1;
  }
}
