import { describe, it, expect } from 'vitest';
import { isSyncableKey } from '../storage-backend';
import { STORAGE_KEYS } from '../types';

describe('isSyncableKey', () => {
  it('marks settings as syncable', () => {
    expect(isSyncableKey(STORAGE_KEYS.GLOBAL_SETTINGS)).toBe(true);
  });

  it('marks site rules as syncable', () => {
    expect(isSyncableKey(STORAGE_KEYS.SITE_RULES)).toBe(true);
  });

  it('marks auto rules as syncable', () => {
    expect(isSyncableKey(STORAGE_KEYS.AUTO_RULES)).toBe(true);
  });

  it('marks tag config as syncable', () => {
    expect(isSyncableKey(STORAGE_KEYS.TAG_CONFIG)).toBe(true);
  });

  it('marks extension state as local-only', () => {
    expect(isSyncableKey(STORAGE_KEYS.EXTENSION_STATE)).toBe(false);
  });

  it('marks troubleshoot session as local-only', () => {
    expect(isSyncableKey(STORAGE_KEYS.TROUBLESHOOT_SESSION)).toBe(false);
  });

  it('marks unknown keys as local-only', () => {
    expect(isSyncableKey('sg_unknown')).toBe(false);
  });
});
