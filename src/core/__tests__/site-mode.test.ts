import { describe, it, expect } from 'vitest';
import {
  normalizeHostname,
  extractHostname,
  isWebPageUrl,
  isLocalhost,
  isIpAddress,
  getCapabilities,
  validateHostname,
} from '../site-mode';
import { SiteMode } from '../types';

// ---------------------------------------------------------------------------
// normalizeHostname
// ---------------------------------------------------------------------------

describe('normalizeHostname', () => {
  it('lowercases the hostname', () => {
    expect(normalizeHostname('EXAMPLE.COM')).toBe('example.com');
    expect(normalizeHostname('GitHub.Com')).toBe('github.com');
  });

  it('strips leading www.', () => {
    expect(normalizeHostname('www.example.com')).toBe('example.com');
    expect(normalizeHostname('WWW.EXAMPLE.COM')).toBe('example.com');
  });

  it('preserves subdomains other than www', () => {
    expect(normalizeHostname('mail.google.com')).toBe('mail.google.com');
    expect(normalizeHostname('docs.google.com')).toBe('docs.google.com');
    expect(normalizeHostname('sub.www.example.com')).toBe('sub.www.example.com');
  });

  it('preserves localhost', () => {
    expect(normalizeHostname('localhost')).toBe('localhost');
  });

  it('preserves IP addresses', () => {
    expect(normalizeHostname('192.168.1.1')).toBe('192.168.1.1');
    expect(normalizeHostname('127.0.0.1')).toBe('127.0.0.1');
  });

  it('trims whitespace', () => {
    expect(normalizeHostname('  example.com  ')).toBe('example.com');
  });
});

// ---------------------------------------------------------------------------
// extractHostname
// ---------------------------------------------------------------------------

describe('extractHostname', () => {
  it('extracts hostname from standard URLs', () => {
    expect(extractHostname('https://example.com/path')).toBe('example.com');
    expect(extractHostname('http://example.com:8080/page')).toBe('example.com');
    expect(extractHostname('https://sub.example.com')).toBe('sub.example.com');
  });

  it('normalizes www', () => {
    expect(extractHostname('https://www.example.com')).toBe('example.com');
  });

  it('lowercases', () => {
    expect(extractHostname('https://EXAMPLE.COM')).toBe('example.com');
  });

  it('returns null for empty/missing input', () => {
    expect(extractHostname('')).toBeNull();
    expect(extractHostname('   ')).toBeNull();
  });

  it('returns null for chrome:// URLs', () => {
    expect(extractHostname('chrome://extensions')).toBeNull();
    expect(extractHostname('chrome://settings/privacy')).toBeNull();
  });

  it('returns null for chrome-extension:// URLs', () => {
    expect(extractHostname('chrome-extension://abc123/popup.html')).toBeNull();
  });

  it('returns null for moz-extension:// URLs', () => {
    expect(extractHostname('moz-extension://abc/popup.html')).toBeNull();
  });

  it('returns null for about: URLs', () => {
    expect(extractHostname('about:blank')).toBeNull();
    expect(extractHostname('about:debugging')).toBeNull();
  });

  it('returns null for file:// URLs', () => {
    expect(extractHostname('file:///home/user/doc.html')).toBeNull();
  });

  it('returns null for data: URLs', () => {
    expect(extractHostname('data:text/html,<h1>hi</h1>')).toBeNull();
  });

  it('returns null for blob: URLs', () => {
    expect(extractHostname('blob:https://example.com/uuid')).toBeNull();
  });

  it('returns null for javascript: URLs', () => {
    expect(extractHostname('javascript:void(0)')).toBeNull();
  });

  it('returns null for malformed URLs', () => {
    expect(extractHostname('not a url at all')).toBeNull();
    expect(extractHostname('://missing-protocol')).toBeNull();
  });

  it('handles localhost', () => {
    expect(extractHostname('http://localhost:3000')).toBe('localhost');
  });

  it('handles IP addresses', () => {
    expect(extractHostname('http://192.168.1.1:8080')).toBe('192.168.1.1');
    expect(extractHostname('http://127.0.0.1')).toBe('127.0.0.1');
  });
});

// ---------------------------------------------------------------------------
// isWebPageUrl
// ---------------------------------------------------------------------------

describe('isWebPageUrl', () => {
  it('returns true for web pages', () => {
    expect(isWebPageUrl('https://example.com')).toBe(true);
    expect(isWebPageUrl('http://localhost:3000')).toBe(true);
  });

  it('returns false for non-web pages', () => {
    expect(isWebPageUrl('chrome://extensions')).toBe(false);
    expect(isWebPageUrl('about:blank')).toBe(false);
    expect(isWebPageUrl('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isLocalhost
// ---------------------------------------------------------------------------

describe('isLocalhost', () => {
  it('detects localhost variants', () => {
    expect(isLocalhost('localhost')).toBe(true);
    expect(isLocalhost('127.0.0.1')).toBe(true);
    expect(isLocalhost('::1')).toBe(true);
    expect(isLocalhost('0.0.0.0')).toBe(true);
  });

  it('detects .local and .localhost domains', () => {
    expect(isLocalhost('myapp.local')).toBe(true);
    expect(isLocalhost('dev.localhost')).toBe(true);
  });

  it('rejects non-local addresses', () => {
    expect(isLocalhost('example.com')).toBe(false);
    expect(isLocalhost('192.168.1.1')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isIpAddress
// ---------------------------------------------------------------------------

describe('isIpAddress', () => {
  it('detects IPv4', () => {
    expect(isIpAddress('192.168.1.1')).toBe(true);
    expect(isIpAddress('10.0.0.1')).toBe(true);
    expect(isIpAddress('127.0.0.1')).toBe(true);
  });

  it('detects IPv6', () => {
    expect(isIpAddress('::1')).toBe(true);
    expect(isIpAddress('fe80::1')).toBe(true);
  });

  it('rejects hostnames', () => {
    expect(isIpAddress('example.com')).toBe(false);
    expect(isIpAddress('localhost')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getCapabilities
// ---------------------------------------------------------------------------

describe('getCapabilities', () => {
  it('Normal mode has all capabilities enabled', () => {
    const caps = getCapabilities(SiteMode.Normal);
    expect(caps.monitoringActive).toBe(true);
    expect(caps.diagnosticsEnabled).toBe(true);
    expect(caps.contentScriptAllowed).toBe(true);
    expect(caps.domInteractionAllowed).toBe(true);
  });

  it('Safe mode disables content scripts and DOM', () => {
    const caps = getCapabilities(SiteMode.Safe);
    expect(caps.monitoringActive).toBe(true);
    expect(caps.diagnosticsEnabled).toBe(true);
    expect(caps.contentScriptAllowed).toBe(false);
    expect(caps.domInteractionAllowed).toBe(false);
  });

  it('Disabled mode disables everything', () => {
    const caps = getCapabilities(SiteMode.Disabled);
    expect(caps.monitoringActive).toBe(false);
    expect(caps.diagnosticsEnabled).toBe(false);
    expect(caps.contentScriptAllowed).toBe(false);
    expect(caps.domInteractionAllowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateHostname (security boundary)
// ---------------------------------------------------------------------------

describe('validateHostname', () => {
  it('accepts valid hostnames', () => {
    expect(validateHostname('example.com')).toEqual({ valid: true, hostname: 'example.com' });
    expect(validateHostname('localhost')).toEqual({ valid: true, hostname: 'localhost' });
    expect(validateHostname('192.168.1.1')).toEqual({ valid: true, hostname: '192.168.1.1' });
    expect(validateHostname('sub.domain.example.com')).toEqual({
      valid: true,
      hostname: 'sub.domain.example.com',
    });
  });

  it('rejects non-string input', () => {
    expect(validateHostname(null as unknown)).toEqual({ valid: false, reason: expect.any(String) });
    expect(validateHostname(undefined as unknown)).toEqual({ valid: false, reason: expect.any(String) });
    expect(validateHostname(123 as unknown)).toEqual({ valid: false, reason: expect.any(String) });
    expect(validateHostname({} as unknown)).toEqual({ valid: false, reason: expect.any(String) });
  });

  it('rejects empty string', () => {
    const result = validateHostname('');
    expect(result.valid).toBe(false);
  });

  it('rejects hostnames exceeding DNS max length', () => {
    const long = 'a'.repeat(254);
    const result = validateHostname(long);
    expect(result.valid).toBe(false);
  });

  it('accepts hostnames at DNS max length', () => {
    const maxLen = 'a'.repeat(253);
    const result = validateHostname(maxLen);
    expect(result.valid).toBe(true);
  });

  it('rejects hostnames with whitespace', () => {
    expect(validateHostname('example .com')).toEqual({ valid: false, reason: expect.any(String) });
    expect(validateHostname('example\t.com')).toEqual({ valid: false, reason: expect.any(String) });
    expect(validateHostname('example\n.com')).toEqual({ valid: false, reason: expect.any(String) });
  });

  it('rejects prototype-polluting keys', () => {
    expect(validateHostname('__proto__')).toEqual({ valid: false, reason: expect.any(String) });
    expect(validateHostname('constructor')).toEqual({ valid: false, reason: expect.any(String) });
    expect(validateHostname('prototype')).toEqual({ valid: false, reason: expect.any(String) });
    expect(validateHostname('toString')).toEqual({ valid: false, reason: expect.any(String) });
    expect(validateHostname('valueOf')).toEqual({ valid: false, reason: expect.any(String) });
    expect(validateHostname('hasOwnProperty')).toEqual({ valid: false, reason: expect.any(String) });
  });
});
