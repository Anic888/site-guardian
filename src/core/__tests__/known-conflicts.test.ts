import { describe, it, expect } from 'vitest';
import {
  matchKnownConflicts,
  getKnownConflictCount,
} from '../known-conflicts';
import type { ExtensionInfo } from '../types';
import { ExtensionRisk } from '../types';

function mockExt(overrides: Partial<ExtensionInfo> = {}): ExtensionInfo {
  return {
    id: 'ext-' + Math.random().toString(36).slice(2, 8),
    name: 'Test Extension',
    version: '1.0',
    enabled: true,
    type: 'extension',
    permissions: [],
    hostPermissions: [],
    contentScriptPatterns: [],
    activeOnCurrentPage: true,
    risk: ExtensionRisk.Low,
    iconUrl: '',
    description: '',
    isSelf: false,
    category: 'other',
    userTags: [],
    categoryOverride: null,
    effectiveCategory: 'other',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Database integrity
// ---------------------------------------------------------------------------

describe('Known Conflicts Database', () => {
  it('has entries', () => {
    expect(getKnownConflictCount()).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// ext_vs_ext matching
// ---------------------------------------------------------------------------

describe('matchKnownConflicts — ext_vs_ext', () => {
  it('detects uBlock Origin + Adblock Plus conflict', () => {
    const extensions = [
      mockExt({ name: 'uBlock Origin' }),
      mockExt({ name: 'Adblock Plus' }),
    ];
    const signals = matchKnownConflicts(extensions, 'example.com');
    const extVsExt = signals.filter((s) => s.type === 'known_ext_vs_ext');
    expect(extVsExt.length).toBeGreaterThanOrEqual(1);
    expect(extVsExt[0]!.message).toContain('uBlock Origin');
    expect(extVsExt[0]!.message).toContain('Adblock Plus');
    expect(extVsExt[0]!.source).toBeDefined();
  });

  it('detects Ghostery + Privacy Badger conflict', () => {
    const extensions = [
      mockExt({ name: 'Ghostery' }),
      mockExt({ name: 'Privacy Badger' }),
    ];
    const signals = matchKnownConflicts(extensions, 'example.com');
    expect(signals.some((s) => s.type === 'known_ext_vs_ext')).toBe(true);
  });

  it('does NOT trigger for unrelated extensions', () => {
    const extensions = [
      mockExt({ name: 'React Developer Tools' }),
      mockExt({ name: 'Grammarly' }),
    ];
    const signals = matchKnownConflicts(extensions, 'example.com');
    const extVsExt = signals.filter((s) => s.type === 'known_ext_vs_ext');
    expect(extVsExt).toHaveLength(0);
  });

  it('returns empty for single extension', () => {
    const extensions = [mockExt({ name: 'uBlock Origin' })];
    const signals = matchKnownConflicts(extensions, 'example.com');
    const extVsExt = signals.filter((s) => s.type === 'known_ext_vs_ext');
    expect(extVsExt).toHaveLength(0);
  });

  it('returns empty for empty list', () => {
    expect(matchKnownConflicts([], 'example.com')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ext_vs_site matching
// ---------------------------------------------------------------------------

describe('matchKnownConflicts — ext_vs_site', () => {
  it('detects Grammarly on notion.so', () => {
    const extensions = [mockExt({ name: 'Grammarly' })];
    const signals = matchKnownConflicts(extensions, 'www.notion.so');
    const extVsSite = signals.filter((s) => s.type === 'known_ext_vs_site');
    expect(extVsSite.length).toBeGreaterThanOrEqual(1);
    expect(extVsSite[0]!.message).toContain('Grammarly');
    expect(extVsSite[0]!.message).toContain('notion');
  });

  it('detects Dark Reader on docs.google.com', () => {
    const extensions = [mockExt({ name: 'Dark Reader' })];
    const signals = matchKnownConflicts(extensions, 'docs.google.com');
    expect(signals.some((s) => s.type === 'known_ext_vs_site')).toBe(true);
  });

  it('does NOT trigger Grammarly on unrelated site', () => {
    const extensions = [mockExt({ name: 'Grammarly' })];
    const signals = matchKnownConflicts(extensions, 'example.com');
    const extVsSite = signals.filter((s) => s.type === 'known_ext_vs_site');
    expect(extVsSite).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// category_vs_site matching
// ---------------------------------------------------------------------------

describe('matchKnownConflicts — category_vs_site', () => {
  it('detects VPN on netflix.com', () => {
    const extensions = [
      mockExt({ name: 'Urban VPN', category: 'vpn-proxy' }),
    ];
    const signals = matchKnownConflicts(extensions, 'www.netflix.com');
    const catVsSite = signals.filter(
      (s) => s.type === 'known_category_vs_site',
    );
    expect(catVsSite.length).toBeGreaterThanOrEqual(1);
    expect(catVsSite[0]!.message).toContain('Urban VPN');
  });

  it('detects ad blocker on youtube.com', () => {
    const extensions = [
      mockExt({ name: 'uBlock Origin', category: 'ad-blocker' }),
    ];
    const signals = matchKnownConflicts(extensions, 'www.youtube.com');
    expect(
      signals.some((s) => s.type === 'known_category_vs_site'),
    ).toBe(true);
  });

  it('does NOT trigger VPN on non-streaming site', () => {
    const extensions = [
      mockExt({ name: 'Urban VPN', category: 'vpn-proxy' }),
    ];
    const signals = matchKnownConflicts(extensions, 'example.com');
    const catVsSite = signals.filter(
      (s) => s.type === 'known_category_vs_site',
    );
    expect(catVsSite).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Combined scenarios
// ---------------------------------------------------------------------------

describe('matchKnownConflicts — combined', () => {
  it('returns multiple signals for complex scenario', () => {
    const extensions = [
      mockExt({ name: 'uBlock Origin', category: 'ad-blocker' }),
      mockExt({ name: 'Adblock Plus', category: 'ad-blocker' }),
    ];
    // On youtube.com: ext_vs_ext (ublock+adblock) + category_vs_site (ad-blocker on youtube)
    const signals = matchKnownConflicts(extensions, 'www.youtube.com');
    expect(signals.length).toBeGreaterThanOrEqual(2);

    const types = signals.map((s) => s.type);
    expect(types).toContain('known_ext_vs_ext');
    expect(types).toContain('known_category_vs_site');
  });
});
