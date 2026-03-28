import { describe, it, expect } from 'vitest';
import {
  matchesPattern,
  matchesAnyPattern,
  scoreRisk,
  analyzeExtension,
  detectConflicts,
  buildSiteReport,
  type RawExtensionInfo,
} from '../extension-analyzer';
import { ExtensionRisk } from '../types';

// ---------------------------------------------------------------------------
// matchesPattern
// ---------------------------------------------------------------------------

describe('matchesPattern', () => {
  it('matches <all_urls>', () => {
    expect(matchesPattern('<all_urls>', 'https://example.com/page')).toBe(true);
    expect(matchesPattern('<all_urls>', 'http://localhost:3000')).toBe(true);
  });

  it('matches exact scheme + host + path', () => {
    expect(matchesPattern('https://example.com/*', 'https://example.com/page')).toBe(true);
    expect(matchesPattern('https://example.com/*', 'https://example.com/')).toBe(true);
  });

  it('rejects wrong scheme', () => {
    expect(matchesPattern('https://example.com/*', 'http://example.com/page')).toBe(false);
  });

  it('matches wildcard scheme', () => {
    expect(matchesPattern('*://example.com/*', 'https://example.com/page')).toBe(true);
    expect(matchesPattern('*://example.com/*', 'http://example.com/page')).toBe(true);
  });

  it('matches wildcard subdomain', () => {
    expect(matchesPattern('*://*.example.com/*', 'https://sub.example.com/page')).toBe(true);
    expect(matchesPattern('*://*.example.com/*', 'https://deep.sub.example.com/')).toBe(true);
  });

  it('matches broad patterns', () => {
    expect(matchesPattern('*://*/*', 'https://anything.com/path')).toBe(true);
    expect(matchesPattern('https://*/*', 'https://example.com/page')).toBe(true);
  });

  it('rejects non-matching hosts', () => {
    expect(matchesPattern('https://example.com/*', 'https://other.com/page')).toBe(false);
  });

  it('returns false for invalid patterns', () => {
    expect(matchesPattern('', 'https://example.com')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// matchesAnyPattern
// ---------------------------------------------------------------------------

describe('matchesAnyPattern', () => {
  it('returns true if any pattern matches', () => {
    const patterns = ['https://google.com/*', 'https://example.com/*'];
    expect(matchesAnyPattern(patterns, 'https://example.com/page')).toBe(true);
  });

  it('returns false if no pattern matches', () => {
    const patterns = ['https://google.com/*', 'https://github.com/*'];
    expect(matchesAnyPattern(patterns, 'https://example.com/page')).toBe(false);
  });

  it('returns false for empty patterns', () => {
    expect(matchesAnyPattern([], 'https://example.com')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// scoreRisk
// ---------------------------------------------------------------------------

describe('scoreRisk', () => {
  it('returns Low for minimal permissions', () => {
    expect(scoreRisk(['storage'], [], [])).toBe(ExtensionRisk.Low);
    expect(scoreRisk([], [], ['https://example.com/*'])).toBe(ExtensionRisk.Low);
  });

  it('returns High for <all_urls>', () => {
    expect(scoreRisk([], ['<all_urls>'], [])).toBe(ExtensionRisk.High);
  });

  it('returns High for broad host patterns', () => {
    expect(scoreRisk([], ['*://*/*'], [])).toBe(ExtensionRisk.High);
    expect(scoreRisk([], ['https://*/*'], [])).toBe(ExtensionRisk.High);
  });

  it('returns High for high-risk permissions', () => {
    expect(scoreRisk(['webRequest'], [], [])).toBe(ExtensionRisk.High);
    expect(scoreRisk(['debugger'], [], [])).toBe(ExtensionRisk.High);
    expect(scoreRisk(['history'], [], [])).toBe(ExtensionRisk.High);
  });

  it('returns Medium for medium-risk permissions', () => {
    expect(scoreRisk(['cookies'], [], [])).toBe(ExtensionRisk.Medium);
    expect(scoreRisk(['clipboardRead'], [], [])).toBe(ExtensionRisk.Medium);
  });

  it('returns Medium for many content script patterns', () => {
    const patterns = Array.from({ length: 6 }, (_, i) => `https://site${i}.com/*`);
    expect(scoreRisk([], [], patterns)).toBe(ExtensionRisk.Medium);
  });

  it('returns Medium for broad content script patterns', () => {
    expect(scoreRisk([], [], ['*://*.google.com/*'])).toBe(ExtensionRisk.Medium);
  });
});

// ---------------------------------------------------------------------------
// analyzeExtension
// ---------------------------------------------------------------------------

function mockRaw(overrides: Partial<RawExtensionInfo> = {}): RawExtensionInfo {
  return {
    id: 'ext-123',
    name: 'Test Extension',
    version: '1.0.0',
    enabled: true,
    type: 'extension',
    permissions: ['storage'],
    hostPermissions: [],
    description: 'A test extension',
    icons: [{ size: 48, url: 'icon.png' }],
    contentScripts: [],
    ...overrides,
  };
}

describe('analyzeExtension', () => {
  it('converts raw extension to ExtensionInfo', () => {
    const result = analyzeExtension(mockRaw(), 'https://example.com', 'self-id');
    expect(result.id).toBe('ext-123');
    expect(result.name).toBe('Test Extension');
    expect(result.enabled).toBe(true);
    expect(result.risk).toBe(ExtensionRisk.Low);
    expect(result.isSelf).toBe(false);
  });

  it('detects self', () => {
    const result = analyzeExtension(mockRaw({ id: 'self-id' }), '', 'self-id');
    expect(result.isSelf).toBe(true);
  });

  it('detects active on page via content script patterns', () => {
    const raw = mockRaw({
      contentScripts: [{ matches: ['https://example.com/*'] }],
    });
    const result = analyzeExtension(raw, 'https://example.com/page', 'self');
    expect(result.activeOnCurrentPage).toBe(true);
  });

  it('detects not active on page', () => {
    const raw = mockRaw({
      contentScripts: [{ matches: ['https://other.com/*'] }],
    });
    const result = analyzeExtension(raw, 'https://example.com/page', 'self');
    expect(result.activeOnCurrentPage).toBe(false);
  });

  it('handles missing optional fields', () => {
    const raw: RawExtensionInfo = {
      id: 'min',
      name: 'Minimal',
      version: '0.1',
      enabled: true,
      type: 'extension',
    };
    const result = analyzeExtension(raw, 'https://example.com', 'self');
    expect(result.permissions).toEqual([]);
    expect(result.contentScriptPatterns).toEqual([]);
    expect(result.iconUrl).toBe('');
  });

  it('handles contentScripts with null matches', () => {
    const raw = mockRaw({
      contentScripts: [{ matches: null as unknown as string[] }],
    });
    const result = analyzeExtension(raw, 'https://example.com', 'self');
    expect(result.contentScriptPatterns).toEqual([]);
  });

  it('handles contentScripts with missing matches field', () => {
    const raw = mockRaw({
      contentScripts: [{} as { matches: string[] }],
    });
    const result = analyzeExtension(raw, 'https://example.com', 'self');
    expect(result.contentScriptPatterns).toEqual([]);
  });

  it('handles contentScripts set to null', () => {
    const raw = mockRaw({
      contentScripts: null as unknown as Array<{ matches: string[] }>,
    });
    const result = analyzeExtension(raw, 'https://example.com', 'self');
    expect(result.contentScriptPatterns).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// detectConflicts
// ---------------------------------------------------------------------------

describe('detectConflicts', () => {
  it('returns empty for 0-1 active extensions', () => {
    expect(detectConflicts([])).toEqual([]);
    const one = analyzeExtension(mockRaw(), 'https://example.com', 'self');
    expect(detectConflicts([one])).toEqual([]);
  });

  it('detects multiple injectors conflict', () => {
    const ext1 = analyzeExtension(mockRaw({ id: 'a', name: 'Ext A' }), '', 'self');
    const ext2 = analyzeExtension(mockRaw({ id: 'b', name: 'Ext B' }), '', 'self');
    const conflicts = detectConflicts([ext1, ext2]);
    expect(conflicts.some((c) => c.type === 'multiple_injectors')).toBe(true);
  });

  it('detects broad permissions conflict', () => {
    const highRisk = analyzeExtension(
      mockRaw({ id: 'x', hostPermissions: ['<all_urls>'] }),
      '',
      'self',
    );
    const conflicts = detectConflicts([highRisk, highRisk]);
    expect(conflicts.some((c) => c.type === 'broad_permissions')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildSiteReport
// ---------------------------------------------------------------------------

describe('buildSiteReport', () => {
  it('builds complete report', () => {
    const raws: RawExtensionInfo[] = [
      mockRaw({
        id: 'active-ext',
        contentScripts: [{ matches: ['<all_urls>'] }],
        hostPermissions: ['<all_urls>'],
      }),
      mockRaw({
        id: 'inactive-ext',
        contentScripts: [{ matches: ['https://other.com/*'] }],
      }),
      mockRaw({ id: 'disabled-ext', enabled: false }),
    ];

    const report = buildSiteReport(raws, 'https://example.com/page', 'self-id');
    expect(report.totalExtensions).toBe(3);
    expect(report.activeOnPage).toHaveLength(1);
    expect(report.activeOnPage[0]!.id).toBe('active-ext');
    expect(report.allEnabled).toHaveLength(2); // active + inactive (enabled)
    expect(report.overallRisk).toBe(ExtensionRisk.High); // active-ext has <all_urls>
  });

  it('excludes themes and self', () => {
    const raws: RawExtensionInfo[] = [
      mockRaw({ id: 'self-id', type: 'extension' }),
      mockRaw({ id: 'theme-1', type: 'theme' }),
      mockRaw({ id: 'real-ext', type: 'extension' }),
    ];

    const report = buildSiteReport(raws, 'https://example.com', 'self-id');
    expect(report.totalExtensions).toBe(1); // only real-ext
  });

  it('returns clean report for no extensions', () => {
    const report = buildSiteReport([], 'https://example.com', 'self-id');
    expect(report.totalExtensions).toBe(0);
    expect(report.activeOnPage).toHaveLength(0);
    expect(report.conflicts).toHaveLength(0);
    expect(report.overallRisk).toBe(ExtensionRisk.Low);
  });
});
