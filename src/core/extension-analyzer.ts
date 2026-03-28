// ---------------------------------------------------------------------------
// Site Guardian — Extension Analyzer Engine
// ---------------------------------------------------------------------------
//
// Pure analysis functions. Zero browser API calls.
// Accepts raw management API data, returns typed results.
// Fully testable without mocking browser APIs.
// ---------------------------------------------------------------------------

import {
  ExtensionRisk,
  type ConflictSignal,
  type ExtensionInfo,
  type ExtensionTagEntry,
  type SiteExtensionReport,
  type TagConfig,
} from './types';
import { matchKnownConflicts } from './known-conflicts';

// ---------------------------------------------------------------------------
// URL pattern matching
// ---------------------------------------------------------------------------

/** High-risk permissions that grant broad access */
const HIGH_RISK_PERMISSIONS = new Set([
  'webRequest',
  'webRequestBlocking',
  'declarativeNetRequest',
  'debugger',
  'proxy',
  'privacy',
  'downloads',
  'history',
  'bookmarks',
  'topSites',
  'browsingData',
]);

/** Medium-risk permissions */
const MEDIUM_RISK_PERMISSIONS = new Set([
  'cookies',
  'management',
  'notifications',
  'clipboardRead',
  'clipboardWrite',
  'geolocation',
  'nativeMessaging',
]);

/**
 * Check if a URL match pattern (from manifest content_scripts.matches)
 * applies to a given URL.
 *
 * Supports standard WebExtension match patterns:
 * - `<all_urls>`
 * - scheme + host + path wildcards
 */
export function matchesPattern(pattern: string, url: string): boolean {
  if (pattern === '<all_urls>') return true;
  if (!pattern || !url) return false;

  try {
    // Parse pattern: scheme://host/path
    const schemeEnd = pattern.indexOf('://');
    if (schemeEnd === -1) return false;

    const patternScheme = pattern.slice(0, schemeEnd);
    const rest = pattern.slice(schemeEnd + 3);
    const pathStart = rest.indexOf('/');
    const patternHost = pathStart === -1 ? rest : rest.slice(0, pathStart);
    const patternPath = pathStart === -1 ? '/*' : rest.slice(pathStart);

    // Parse URL
    const parsed = new URL(url);
    const urlScheme = parsed.protocol.replace(':', '');
    const urlHost = parsed.hostname;
    const urlPath = parsed.pathname + parsed.search;

    // Match scheme (* matches http and https)
    if (patternScheme !== '*' && patternScheme !== urlScheme) return false;

    // Match host
    if (patternHost === '*') {
      // matches any host
    } else if (patternHost.startsWith('*.')) {
      // *.example.com matches sub.example.com and deep.sub.example.com
      const baseDomain = patternHost.slice(2);
      if (urlHost !== baseDomain && !urlHost.endsWith('.' + baseDomain)) {
        return false;
      }
    } else if (patternHost !== urlHost) {
      return false;
    }

    // Match path (* is wildcard)
    if (patternPath === '/*' || patternPath === '/*.*') return true;
    // Simple glob: convert * to regex .*
    const pathRegex = new RegExp(
      '^' + patternPath.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
    );
    return pathRegex.test(urlPath);
  } catch {
    return false;
  }
}

/**
 * Check if any of the given patterns match the URL.
 */
export function matchesAnyPattern(patterns: string[], url: string): boolean {
  return patterns.some((p) => matchesPattern(p, url));
}

// ---------------------------------------------------------------------------
// Extension category detection
// ---------------------------------------------------------------------------

export type ExtensionCategory =
  | 'ad-blocker'
  | 'privacy-tool'
  | 'vpn-proxy'
  | 'password-manager'
  | 'dev-tool'
  | 'ai-assistant'
  | 'other';

const CATEGORY_RULES: Array<{ category: ExtensionCategory; patterns: RegExp[] }> = [
  {
    category: 'ad-blocker',
    patterns: [/adblock/i, /ad.?block/i, /ublock/i, /adguard/i, /ad.?remov/i, /ad.?stop/i],
  },
  {
    category: 'privacy-tool',
    patterns: [/ghostery/i, /privacy.?badger/i, /disconnect/i, /don.?t.?track/i, /decentraleyes/i, /clearurl/i, /tracker/i, /noscript/i],
  },
  {
    category: 'vpn-proxy',
    patterns: [/\bvpn\b/i, /\bproxy\b/i, /tunnel/i, /hola/i, /windscribe/i, /nordvpn/i, /express.?vpn/i, /surfshark/i, /urban.?vpn/i],
  },
  {
    category: 'password-manager',
    patterns: [/lastpass/i, /bitwarden/i, /1password/i, /dashlane/i, /keeper/i, /roboform/i],
  },
  {
    category: 'dev-tool',
    patterns: [/react.?dev/i, /redux/i, /vue.?dev/i, /lighthouse/i, /wappalyzer/i, /json.?view/i],
  },
  {
    category: 'ai-assistant',
    patterns: [/\bclaude\b/i, /\bchatgpt\b/i, /\bcopilot\b/i, /\bgpt\b/i, /\bgemini\b/i, /\bperplexity\b/i],
  },
];

const CATEGORY_LABELS: Record<ExtensionCategory, string> = {
  'ad-blocker': 'Ad Blocker',
  'privacy-tool': 'Privacy Tool',
  'vpn-proxy': 'VPN / Proxy',
  'password-manager': 'Password Manager',
  'dev-tool': 'Developer Tool',
  'ai-assistant': 'AI Assistant',
  'other': 'Other',
};

export { CATEGORY_LABELS };

export function detectCategory(name: string, description: string): ExtensionCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((p) => p.test(name) || p.test(description))) {
      return rule.category;
    }
  }
  return 'other';
}

/** Categories where broad permissions are expected and don't indicate extra risk */
const EXPECTED_BROAD_CATEGORIES = new Set<ExtensionCategory>([
  'ad-blocker',
  'privacy-tool',
  'vpn-proxy',
]);

// ---------------------------------------------------------------------------
// Risk scoring
// ---------------------------------------------------------------------------

/**
 * Score risk with context-awareness. Ad-blockers and privacy tools
 * NEED broad permissions to function — this is expected, not risky.
 */
export function scoreRisk(
  permissions: string[],
  hostPermissions: string[],
  contentScriptPatterns: string[],
  category: ExtensionCategory = 'other',
): ExtensionRisk {
  const allPerms = [...permissions, ...hostPermissions];

  const hasHighRiskPerm = allPerms.some((p) => HIGH_RISK_PERMISSIONS.has(p));
  const hasAllUrls = hostPermissions.includes('<all_urls>') ||
    contentScriptPatterns.includes('<all_urls>');
  const hasVeryBroadHost = hostPermissions.some(
    (p) => p === '*://*/*' || p === 'http://*/*' || p === 'https://*/*',
  );

  const broadAccess = hasAllUrls || hasVeryBroadHost;

  // If extension is in a category where broad access is expected,
  // downgrade from High to Medium
  if (EXPECTED_BROAD_CATEGORIES.has(category)) {
    if (hasHighRiskPerm) return ExtensionRisk.Medium;
    if (broadAccess) return ExtensionRisk.Medium;

    const hasMediumRiskPerm = allPerms.some((p) => MEDIUM_RISK_PERMISSIONS.has(p));
    if (hasMediumRiskPerm) return ExtensionRisk.Low;

    return ExtensionRisk.Low;
  }

  // Standard scoring for other categories
  if (hasHighRiskPerm || broadAccess) {
    return ExtensionRisk.High;
  }

  const hasMediumRiskPerm = allPerms.some((p) => MEDIUM_RISK_PERMISSIONS.has(p));
  const hasManyContentScripts = contentScriptPatterns.length > 5;
  const hasBroadPatterns = contentScriptPatterns.some((p) => p.includes('*://*'));

  if (hasMediumRiskPerm || hasManyContentScripts || hasBroadPatterns) {
    return ExtensionRisk.Medium;
  }

  return ExtensionRisk.Low;
}

// ---------------------------------------------------------------------------
// Extension analysis
// ---------------------------------------------------------------------------

/** Raw extension data from browser.management.getAll() */
export interface RawExtensionInfo {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  type: string;
  permissions?: string[];
  hostPermissions?: string[];
  description?: string;
  icons?: Array<{ size: number; url: string }>;
  contentScripts?: Array<{
    matches: string[];
  }>;
}

/**
 * Convert raw management API extension info to our typed ExtensionInfo.
 */
/**
 * Convert raw management API extension info to our typed ExtensionInfo.
 * Optionally applies user tag overrides from TagConfig.
 */
export function analyzeExtension(
  raw: RawExtensionInfo,
  currentUrl: string,
  selfId: string,
  tagConfig?: TagConfig | null,
): ExtensionInfo {
  const permissions = raw.permissions ?? [];
  const hostPermissions = raw.hostPermissions ?? [];

  // Extract all content script match patterns (defensive — API data can be malformed)
  const contentScriptPatterns: string[] = [];
  if (Array.isArray(raw.contentScripts)) {
    for (const cs of raw.contentScripts) {
      if (cs && Array.isArray(cs.matches)) {
        contentScriptPatterns.push(...cs.matches);
      }
    }
  }

  const allMatchPatterns = [...contentScriptPatterns, ...hostPermissions];
  const activeOnCurrentPage = currentUrl
    ? matchesAnyPattern(allMatchPatterns, currentUrl)
    : false;

  const description = raw.description ?? '';
  const autoCategory = detectCategory(raw.name, description);

  // Apply user tag overrides
  const tagEntry: ExtensionTagEntry | undefined =
    tagConfig?.extensions[raw.id];
  const categoryOverride = tagEntry?.categoryOverride ?? null;
  const userTags = tagEntry?.tags ?? [];
  const effectiveCategory = categoryOverride ?? autoCategory;

  // Risk uses effective category (user override has priority)
  const risk = scoreRisk(
    permissions,
    hostPermissions,
    contentScriptPatterns,
    effectiveCategory as ExtensionCategory,
  );

  const icon = raw.icons?.sort((a, b) => b.size - a.size)[0];

  return {
    id: raw.id,
    name: raw.name,
    version: raw.version,
    enabled: raw.enabled,
    type: raw.type,
    permissions,
    hostPermissions,
    contentScriptPatterns,
    activeOnCurrentPage,
    risk,
    iconUrl: icon?.url ?? '',
    description,
    isSelf: raw.id === selfId,
    category: autoCategory,
    userTags,
    categoryOverride,
    effectiveCategory,
  };
}

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

/**
 * Detect potential conflicts among extensions active on a page.
 * Combines heuristic detection with known conflict database lookups.
 */
export function detectConflicts(
  activeExtensions: ExtensionInfo[],
  hostname: string = '',
): ConflictSignal[] {
  const signals: ConflictSignal[] = [];

  // --- Known conflict database matches ---
  const knownSignals = matchKnownConflicts(activeExtensions, hostname);
  signals.push(...knownSignals);

  // --- Heuristic: Multiple injectors ---
  if (activeExtensions.length >= 2) {
    signals.push({
      type: 'multiple_injectors',
      message: `${activeExtensions.length} extensions inject scripts into this page. This can cause conflicts, slow performance, or broken functionality.`,
      extensionIds: activeExtensions.map((e) => e.id),
    });
  }

  // --- Heuristic: Broad permissions ---
  const broadPerms = activeExtensions.filter(
    (e) => e.risk === ExtensionRisk.High,
  );
  if (broadPerms.length > 0) {
    signals.push({
      type: 'broad_permissions',
      message: `${broadPerms.length} extension${broadPerms.length > 1 ? 's have' : ' has'} broad permissions that could interfere with page behavior.`,
      extensionIds: broadPerms.map((e) => e.id),
    });
  }

  // --- Heuristic: Duplicate categories ---
  const categories = detectOverlappingCategories(activeExtensions);
  for (const cat of categories) {
    signals.push({
      type: 'duplicate_category',
      message: `Multiple ${cat.category} extensions active: ${cat.names.join(', ')}. They may conflict or duplicate work.`,
      extensionIds: cat.ids,
    });
  }

  return signals;
}

// ---------------------------------------------------------------------------
// Category-based duplicate detection
// ---------------------------------------------------------------------------

/** Known extension name patterns by category */
const CATEGORY_PATTERNS: Array<{ category: string; patterns: RegExp[] }> = [
  {
    category: 'ad blocker',
    patterns: [
      /adblock/i, /ad.?block/i, /ublock/i, /adguard/i, /ghostery/i,
      /ad.?remov/i, /ad.?stop/i, /brave.?shield/i,
    ],
  },
  {
    category: 'VPN / proxy',
    patterns: [
      /\bvpn\b/i, /\bproxy\b/i, /tunnel/i, /hola/i, /windscribe/i,
      /nordvpn/i, /express.?vpn/i, /surfshark/i,
    ],
  },
  {
    category: 'password manager',
    patterns: [
      /password/i, /lastpass/i, /\bbitwarden\b/i, /1password/i,
      /dashlane/i, /keeper/i, /roboform/i,
    ],
  },
  {
    category: 'privacy / tracker blocker',
    patterns: [
      /privacy.?badger/i, /disconnect/i, /don.?t.?track/i,
      /decentraleyes/i, /clearurl/i, /tracker/i,
    ],
  },
];

interface CategoryOverlap {
  category: string;
  names: string[];
  ids: string[];
}

function detectOverlappingCategories(
  extensions: ExtensionInfo[],
): CategoryOverlap[] {
  const overlaps: CategoryOverlap[] = [];

  for (const cat of CATEGORY_PATTERNS) {
    const matching = extensions.filter((ext) =>
      cat.patterns.some((p) => p.test(ext.name) || p.test(ext.description)),
    );
    if (matching.length >= 2) {
      overlaps.push({
        category: cat.category,
        names: matching.map((e) => e.name),
        ids: matching.map((e) => e.id),
      });
    }
  }

  return overlaps;
}

// ---------------------------------------------------------------------------
// Full site report
// ---------------------------------------------------------------------------

/**
 * Build a complete extension report for a given URL.
 */
export function buildSiteReport(
  rawExtensions: RawExtensionInfo[],
  currentUrl: string,
  selfId: string,
  tagConfig?: TagConfig | null,
): SiteExtensionReport {
  // Filter to real extensions (not themes, not self)
  const analyzed = rawExtensions
    .filter((raw) => raw.type === 'extension' && raw.id !== selfId)
    .map((raw) => analyzeExtension(raw, currentUrl, selfId, tagConfig));

  const allEnabled = analyzed.filter((e) => e.enabled);
  const activeOnPage = allEnabled.filter((e) => e.activeOnCurrentPage);

  // Extract hostname for known-conflict database matching
  let hostname = '';
  try {
    hostname = new URL(currentUrl).hostname;
  } catch { /* invalid URL — no hostname matching */ }

  const conflicts = detectConflicts(activeOnPage, hostname);

  // Overall risk is the highest individual risk or conflict-driven
  let overallRisk = ExtensionRisk.Low;
  if (conflicts.length > 0) {
    overallRisk = ExtensionRisk.Medium;
  }
  if (activeOnPage.some((e) => e.risk === ExtensionRisk.High)) {
    overallRisk = ExtensionRisk.High;
  }

  return {
    totalExtensions: analyzed.length,
    activeOnPage,
    allEnabled,
    conflicts,
    overallRisk,
    generatedAt: new Date().toISOString(),
  };
}
