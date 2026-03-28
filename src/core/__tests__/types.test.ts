import { describe, it, expect } from 'vitest';
import {
  SiteMode,
  SITE_MODE_LABELS,
  SITE_MODE_DESCRIPTIONS,
  STORAGE_KEYS,
  STORAGE_PREFIX,
  DEFAULT_GLOBAL_SETTINGS,
  SCHEMA_VERSION,
  PERMISSION_EXPLANATIONS,
  PRIVACY_FACTS,
} from '../types';

describe('SiteMode enum', () => {
  it('has exactly 3 values', () => {
    const values = Object.values(SiteMode);
    expect(values).toHaveLength(3);
    expect(values).toContain('normal');
    expect(values).toContain('safe');
    expect(values).toContain('disabled');
  });
});

describe('SITE_MODE_LABELS', () => {
  it('has a label for every mode', () => {
    for (const mode of Object.values(SiteMode)) {
      expect(SITE_MODE_LABELS[mode]).toBeDefined();
      expect(typeof SITE_MODE_LABELS[mode]).toBe('string');
      expect(SITE_MODE_LABELS[mode].length).toBeGreaterThan(0);
    }
  });
});

describe('SITE_MODE_DESCRIPTIONS', () => {
  it('has a description for every mode', () => {
    for (const mode of Object.values(SiteMode)) {
      expect(SITE_MODE_DESCRIPTIONS[mode]).toBeDefined();
      expect(SITE_MODE_DESCRIPTIONS[mode].length).toBeGreaterThan(0);
    }
  });
});

describe('STORAGE_KEYS', () => {
  it('all keys are prefixed', () => {
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(key.startsWith(STORAGE_PREFIX)).toBe(true);
    }
  });

  it('keys are unique', () => {
    const values = Object.values(STORAGE_KEYS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe('DEFAULT_GLOBAL_SETTINGS', () => {
  it('defaults to Normal mode', () => {
    expect(DEFAULT_GLOBAL_SETTINGS.defaultMode).toBe(SiteMode.Normal);
  });

  it('first run is not complete', () => {
    expect(DEFAULT_GLOBAL_SETTINGS.firstRunComplete).toBe(false);
  });

  it('schema version matches current', () => {
    expect(DEFAULT_GLOBAL_SETTINGS.schemaVersion).toBe(SCHEMA_VERSION);
  });
});

describe('PERMISSION_EXPLANATIONS', () => {
  it('explains exactly the permissions in manifest', () => {
    const manifestPermissions = ['storage', 'activeTab', 'tabs', 'management', 'scripting'];
    const explained = PERMISSION_EXPLANATIONS.map((p) => p.permission);
    expect(explained.sort()).toEqual(manifestPermissions.sort());
  });

  it('every explanation has all required fields', () => {
    for (const perm of PERMISSION_EXPLANATIONS) {
      expect(perm.reason.length).toBeGreaterThan(0);
      expect(perm.capability.length).toBeGreaterThan(0);
      expect(perm.limitation.length).toBeGreaterThan(0);
    }
  });
});

describe('PRIVACY_FACTS', () => {
  it('has at least 5 facts', () => {
    expect(PRIVACY_FACTS.length).toBeGreaterThanOrEqual(5);
  });

  it('every fact is non-empty', () => {
    for (const fact of PRIVACY_FACTS) {
      expect(fact.length).toBeGreaterThan(0);
    }
  });
});
