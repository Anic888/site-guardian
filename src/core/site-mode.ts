// ---------------------------------------------------------------------------
// Site Guardian — Site Mode Engine
// ---------------------------------------------------------------------------
//
// Core business logic:
//   1. URL → hostname extraction with normalization
//   2. Hostname → site rule lookup → effective mode resolution
//   3. Mode → capabilities (what each mode enables/disables)
//   4. Full TabStatus assembly for the popup
// ---------------------------------------------------------------------------

import {
  getGlobalSettings,
  getSiteRule,
  getUserAutoRules,
} from './storage';
import {
  SiteMode,
  type AutoRuleMatch,
  type PageHealthReport,
  type SiteExtensionReport,
  type SiteRule,
  type TabStatus,
} from './types';
import { buildDiagnostics } from './diagnostics';
import { BUILT_IN_RULES, evaluateRules, mergeRules } from './auto-rules';

// ---------------------------------------------------------------------------
// URL / hostname utilities
// ---------------------------------------------------------------------------

/** Protocols where the extension cannot operate */
const NON_WEB_PROTOCOLS = new Set([
  'chrome:',
  'chrome-extension:',
  'moz-extension:',
  'about:',
  'edge:',
  'brave:',
  'opera:',
  'vivaldi:',
  'devtools:',
  'data:',
  'blob:',
  'javascript:',
]);

/**
 * Normalize a hostname for consistent rule matching.
 *
 * - Strips leading `www.` so that `www.example.com` and `example.com`
 *   match the same rule.
 * - Lowercases (hostnames are case-insensitive per RFC).
 * - Preserves subdomains: `mail.google.com` stays distinct from `google.com`.
 * - Preserves localhost and IP addresses as-is.
 */
export function normalizeHostname(raw: string): string {
  let hostname = raw.toLowerCase().trim();

  // Strip leading www. — these almost always serve the same content
  if (hostname.startsWith('www.')) {
    hostname = hostname.slice(4);
  }

  return hostname;
}

/**
 * Extract and normalize the hostname from a URL string.
 * Returns null if the URL is invalid or not a web page.
 */
export function extractHostname(url: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (NON_WEB_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }

    // file:// URLs have no meaningful hostname
    if (parsed.protocol === 'file:') {
      return null;
    }

    const hostname = parsed.hostname;
    if (!hostname) return null;

    return normalizeHostname(hostname);
  } catch {
    return null;
  }
}

/**
 * Check if a URL represents a web page the extension can operate on.
 */
export function isWebPageUrl(url: string): boolean {
  return extractHostname(url) !== null;
}

// ---------------------------------------------------------------------------
// Hostname validation (security boundary)
// ---------------------------------------------------------------------------

/** Keys that could pollute Object.prototype if used as object keys */
const DANGEROUS_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
]);

/** Maximum hostname length per DNS specification (RFC 1035) */
const MAX_HOSTNAME_LENGTH = 253;

export type HostnameValidation =
  | { valid: true; hostname: string }
  | { valid: false; reason: string };

/**
 * Validate a hostname before using it as a storage key.
 * This is a security boundary — rejects inputs that could cause
 * prototype pollution, storage bloat, or unexpected behavior.
 */
export function validateHostname(hostname: unknown): HostnameValidation {
  if (typeof hostname !== 'string') {
    return { valid: false, reason: 'Hostname must be a string.' };
  }

  if (hostname.length === 0) {
    return { valid: false, reason: 'Hostname cannot be empty.' };
  }

  if (hostname.length > MAX_HOSTNAME_LENGTH) {
    return { valid: false, reason: 'Hostname exceeds maximum length.' };
  }

  if (/\s/.test(hostname)) {
    return { valid: false, reason: 'Hostname cannot contain whitespace.' };
  }

  if (DANGEROUS_KEYS.has(hostname)) {
    return { valid: false, reason: 'Invalid hostname.' };
  }

  return { valid: true, hostname };
}

/**
 * Check if a hostname is a local/development address.
 * Used by diagnostics to provide relevant context.
 */
export function isLocalhost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localhost')
  );
}

/**
 * Check if a hostname is an IP address (v4 or v6).
 */
export function isIpAddress(hostname: string): boolean {
  // IPv4: digits and dots only, at least one dot
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  // IPv6: contains colons (already normalized to lowercase)
  if (hostname.includes(':')) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Mode capabilities
// ---------------------------------------------------------------------------

/**
 * Describes what is active/allowed in each site mode.
 * Other modules query this to decide behavior.
 */
export interface ModeCapabilities {
  /** Whether the extension actively monitors this site */
  monitoringActive: boolean;
  /** Whether diagnostics are generated for this site */
  diagnosticsEnabled: boolean;
  /** Whether content script can be injected (if needed in the future) */
  contentScriptAllowed: boolean;
  /** Whether the extension may interact with page DOM (future) */
  domInteractionAllowed: boolean;
  /** Short explanation of what this mode means */
  summary: string;
}

const MODE_CAPABILITIES: Record<SiteMode, ModeCapabilities> = {
  [SiteMode.Normal]: {
    monitoringActive: true,
    diagnosticsEnabled: true,
    contentScriptAllowed: true,
    domInteractionAllowed: true,
    summary: 'Full functionality. All features active.',
  },
  [SiteMode.Safe]: {
    monitoringActive: true,
    diagnosticsEnabled: true,
    contentScriptAllowed: false,
    domInteractionAllowed: false,
    summary: 'Reduced footprint. No content scripts or DOM changes.',
  },
  [SiteMode.Disabled]: {
    monitoringActive: false,
    diagnosticsEnabled: false,
    contentScriptAllowed: false,
    domInteractionAllowed: false,
    summary: 'Extension is completely inactive on this site.',
  },
};

/**
 * Get the capabilities for a given mode.
 */
export function getCapabilities(mode: SiteMode): ModeCapabilities {
  return MODE_CAPABILITIES[mode];
}

// ---------------------------------------------------------------------------
// Mode resolution
// ---------------------------------------------------------------------------

export interface ResolvedSiteMode {
  effectiveMode: SiteMode;
  hasExplicitRule: boolean;
  rule: SiteRule | undefined;
  capabilities: ModeCapabilities;
  /** Auto-rule that matched (if any) */
  autoRuleMatch: AutoRuleMatch | null;
}

/**
 * Resolve the effective mode for a hostname.
 *
 * Precedence:
 *   1. Explicit site rule (user set via popup) — highest
 *   2. Auto-rule with setSiteMode action
 *   3. Global default mode — lowest
 *
 * Auto-rule recommendations (recommendDisable) don't change mode —
 * they're surfaced in diagnostics only.
 */
export async function resolveMode(
  hostname: string,
): Promise<ResolvedSiteMode> {
  // 1. Explicit site rule wins
  const rule = await getSiteRule(hostname);
  if (rule) {
    return {
      effectiveMode: rule.mode,
      hasExplicitRule: true,
      rule,
      capabilities: getCapabilities(rule.mode),
      autoRuleMatch: null,
    };
  }

  // 2. Check auto-rules
  const userRules = await getUserAutoRules();
  const allRules = mergeRules(BUILT_IN_RULES, userRules);
  const match = evaluateRules(allRules, hostname);

  if (match && match.rule.action.setSiteMode) {
    const mode = match.rule.action.setSiteMode as SiteMode;
    return {
      effectiveMode: mode,
      hasExplicitRule: false,
      rule: undefined,
      capabilities: getCapabilities(mode),
      autoRuleMatch: match,
    };
  }

  // 3. Global default
  const globalSettings = await getGlobalSettings();
  return {
    effectiveMode: globalSettings.defaultMode,
    hasExplicitRule: false,
    rule: undefined,
    capabilities: getCapabilities(globalSettings.defaultMode),
    autoRuleMatch: match, // may have recommendation-only match
  };
}

// ---------------------------------------------------------------------------
// Tab status assembly
// ---------------------------------------------------------------------------

/**
 * Build a full TabStatus for a given tab URL.
 * Extension report and page health are optional — provided by background handler.
 */
export async function buildTabStatus(
  url: string,
  extensionReport?: SiteExtensionReport | null,
  pageHealth?: PageHealthReport | null,
): Promise<TabStatus> {
  const hostname = extractHostname(url);
  const report = extensionReport ?? null;
  const health = pageHealth ?? null;

  if (!hostname) {
    return {
      url,
      hostname: '',
      isWebPage: false,
      effectiveMode: SiteMode.Disabled,
      hasExplicitRule: false,
      diagnostics: {
        hostname: '',
        effectiveMode: SiteMode.Disabled,
        hasExplicitRule: false,
        entries: [],
        generatedAt: new Date().toISOString(),
      },
      extensionReport: null,
      pageHealth: null,
    };
  }

  const resolved = await resolveMode(hostname);
  const diagnostics = await buildDiagnostics(hostname, resolved, report, health);

  return {
    url,
    hostname,
    isWebPage: true,
    effectiveMode: resolved.effectiveMode,
    hasExplicitRule: resolved.hasExplicitRule,
    diagnostics,
    extensionReport: report,
    pageHealth: health,
  };
}
