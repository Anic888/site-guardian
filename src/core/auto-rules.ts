// ---------------------------------------------------------------------------
// Site Guardian — Auto-Rules Engine
// ---------------------------------------------------------------------------
//
// Deterministic rule engine for automatic site behavior.
// Rules are transparent — the user always sees which rule fired and why.
//
// Precedence (highest to lowest):
//   1. Explicit site rules (set manually via popup) — NOT handled here
//   2. User-created auto-rules (builtIn=false, higher base priority)
//   3. Built-in auto-rules (builtIn=true)
//   4. Global default mode — NOT handled here
//
// This module is pure logic. Storage access goes through the caller.
// ---------------------------------------------------------------------------

import { SiteMode, type AutoRule, type AutoRuleMatch } from './types';

// ---------------------------------------------------------------------------
// Built-in rules (shipped with extension)
// ---------------------------------------------------------------------------

export const BUILT_IN_RULES: AutoRule[] = [
  {
    id: 'builtin-banking-safe',
    name: 'Banking — Safe Mode',
    enabled: true,
    priority: 100,
    condition: {
      urlPatterns: [
        '*.bank.*',
        '*.banking.*',
        '*.chase.com',
        '*.wellsfargo.com',
        '*.bankofamerica.com',
        '*.citi.com',
        '*.capitalone.com',
        '*.paypal.com',
      ],
    },
    action: { setSiteMode: SiteMode.Safe },
    builtIn: true,
  },
  {
    id: 'builtin-streaming-vpn',
    name: 'Streaming — VPN Warning',
    enabled: true,
    priority: 90,
    condition: {
      urlPatterns: [
        '*.netflix.com',
        '*.disneyplus.com',
        '*.hulu.com',
        '*.hbomax.com',
        '*.primevideo.com',
        '*.max.com',
      ],
    },
    action: { recommendDisable: ['vpn-proxy'] },
    builtIn: true,
  },
  {
    id: 'builtin-ide-ai',
    name: 'Web IDEs — AI Warning',
    enabled: true,
    priority: 80,
    condition: {
      urlPatterns: [
        '*.github.dev',
        '*.codespaces.dev',
        '*.stackblitz.com',
        '*.codesandbox.io',
        '*.replit.com',
      ],
    },
    action: { recommendDisable: ['ai-assistant'] },
    builtIn: true,
  },
  {
    id: 'builtin-payment-safe',
    name: 'Payment — Safe Mode',
    enabled: true,
    priority: 95,
    condition: {
      urlPatterns: [
        '*.stripe.com',
        'checkout.*',
        '*.shopify.com',
        '*.square.com',
      ],
    },
    action: { setSiteMode: SiteMode.Safe },
    builtIn: true,
  },
];

// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------

/**
 * Test if a hostname matches a URL pattern.
 * Supports:
 *   - Exact match: "example.com"
 *   - Wildcard prefix: "*.example.com" (matches sub.example.com, example.com)
 *   - Wildcard in TLD: "*.bank.*" (matches any.bank.com, my.bank.co.uk)
 *   - Wildcard prefix for subdomain: "checkout.*" (matches checkout.example.com)
 */
export function matchesHostnamePattern(
  hostname: string,
  pattern: string,
): boolean {
  if (!hostname || !pattern) return false;

  // Exact match
  if (hostname === pattern) return true;

  // *.example.com — matches example.com and sub.example.com
  if (pattern.startsWith('*.')) {
    const base = pattern.slice(2);

    // *.bank.* — wildcard in TLD position
    if (base.includes('*')) {
      const basePart = base.replace(/\*/g, '');
      return hostname.includes(basePart);
    }

    return hostname === base || hostname.endsWith('.' + base);
  }

  // checkout.* — prefix match with wildcard suffix
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return hostname.startsWith(prefix + '.') || hostname === prefix;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Rule evaluation
// ---------------------------------------------------------------------------

/**
 * Merge built-in rules with user rules.
 * User rules get a priority boost to ensure they take precedence
 * over built-in rules of the same priority.
 */
export function mergeRules(
  builtInRules: AutoRule[],
  userRules: AutoRule[],
): AutoRule[] {
  // User rules get +1000 priority boost
  const boosted = userRules.map((r) => ({
    ...r,
    priority: r.priority + 1000,
  }));
  return [...boosted, ...builtInRules].sort((a, b) => b.priority - a.priority);
}

/**
 * Evaluate all rules against a hostname.
 * Returns the first matching rule (highest priority wins).
 */
export function evaluateRules(
  rules: AutoRule[],
  hostname: string,
): AutoRuleMatch | null {
  for (const rule of rules) {
    if (!rule.enabled) continue;

    for (const pattern of rule.condition.urlPatterns) {
      if (matchesHostnamePattern(hostname, pattern)) {
        return { rule, matchedPattern: pattern };
      }
    }
  }

  return null;
}

/**
 * Get ALL matching rules (not just first).
 * Useful for showing all recommendations in diagnostics.
 */
export function evaluateAllRules(
  rules: AutoRule[],
  hostname: string,
): AutoRuleMatch[] {
  const matches: AutoRuleMatch[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    for (const pattern of rule.condition.urlPatterns) {
      if (matchesHostnamePattern(hostname, pattern)) {
        matches.push({ rule, matchedPattern: pattern });
        break; // one match per rule is enough
      }
    }
  }

  return matches;
}
