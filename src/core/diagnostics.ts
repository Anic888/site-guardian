// ---------------------------------------------------------------------------
// Site Guardian — Diagnostics Assembly
// ---------------------------------------------------------------------------
//
// Builds an honest diagnostic report for the current site.
//
// What this CAN report:
//   - Which mode is active and why (explicit rule vs. global default)
//   - Which capabilities are enabled/disabled in that mode
//   - Whether the site is a special case (localhost, IP, non-web)
//   - General conflict risk signals based on observable facts
//
// What this does NOT do:
//   - Detect other extensions or their conflicts
//   - Analyze page DOM for breakage
//   - Make claims it can't back up
// ---------------------------------------------------------------------------

import type { ResolvedSiteMode } from './site-mode';
import { isLocalhost, isIpAddress } from './site-mode';
import {
  DiagnosticSeverity,
  ExtensionRisk,
  SiteMode,
  SITE_MODE_LABELS,
  type DiagnosticEntry,
  type PageHealthReport,
  type SiteDiagnostics,
  type SiteExtensionReport,
} from './types';

// ---------------------------------------------------------------------------
// Diagnostic code constants
// ---------------------------------------------------------------------------

const CODE = {
  MODE_NORMAL: 'mode_normal',
  MODE_SAFE: 'mode_safe',
  MODE_DISABLED: 'mode_disabled',
  RULE_EXPLICIT: 'rule_explicit',
  RULE_DEFAULT: 'rule_default',
  CAP_CONTENT_SCRIPT_OFF: 'cap_content_script_off',
  CAP_DOM_OFF: 'cap_dom_off',
  CAP_MONITORING_OFF: 'cap_monitoring_off',
  SITE_LOCALHOST: 'site_localhost',
  SITE_IP: 'site_ip',
  HINT_SAFE_MODE: 'hint_safe_mode',
  EXT_COUNT: 'ext_count',
  EXT_CONFLICT: 'ext_conflict',
  EXT_HIGH_RISK: 'ext_high_risk',
  EXT_CLEAN: 'ext_clean',
  KNOWN_CONFLICT: 'known_conflict',
  AUTO_RULE_APPLIED: 'auto_rule_applied',
  AUTO_RULE_RECOMMENDATION: 'auto_rule_recommendation',
  PERF_SLOW_LOAD: 'perf_slow_load',
  PERF_MANY_SCRIPTS: 'perf_many_scripts',
  PERF_LONG_TASKS: 'perf_long_tasks',
  PERF_HEAVY_PAGE: 'perf_heavy_page',
  DOM_EXT_INJECTIONS: 'dom_ext_injections',
} as const;

// ---------------------------------------------------------------------------
// Entry builders
// ---------------------------------------------------------------------------

function modeEntry(resolved: ResolvedSiteMode): DiagnosticEntry {
  switch (resolved.effectiveMode) {
    case SiteMode.Normal:
      return {
        code: CODE.MODE_NORMAL,
        title: 'Mode: Normal',
        detail: 'All extension features are active for this site.',
        severity: DiagnosticSeverity.Info,
      };
    case SiteMode.Safe:
      return {
        code: CODE.MODE_SAFE,
        title: 'Mode: Safe',
        detail:
          'Running in compatibility mode. Content scripts and DOM interaction are disabled to reduce conflict risk.',
        severity: DiagnosticSeverity.Info,
      };
    case SiteMode.Disabled:
      return {
        code: CODE.MODE_DISABLED,
        title: 'Mode: Disabled',
        detail:
          'The extension is completely inactive on this site. No monitoring, no diagnostics.',
        severity: DiagnosticSeverity.Info,
      };
  }
}

function ruleSourceEntry(resolved: ResolvedSiteMode): DiagnosticEntry {
  if (resolved.hasExplicitRule) {
    return {
      code: CODE.RULE_EXPLICIT,
      title: 'Site-specific rule active',
      detail: `You set this site to "${SITE_MODE_LABELS[resolved.effectiveMode]}". You can change it anytime from the popup.`,
      severity: DiagnosticSeverity.Info,
    };
  }
  return {
    code: CODE.RULE_DEFAULT,
    title: 'Using global default',
    detail: `No site-specific rule. Using your global default: "${SITE_MODE_LABELS[resolved.effectiveMode]}". Set a rule to override.`,
    severity: DiagnosticSeverity.Info,
  };
}

function autoRuleEntries(resolved: ResolvedSiteMode): DiagnosticEntry[] {
  const entries: DiagnosticEntry[] = [];
  const match = resolved.autoRuleMatch;
  if (!match) return entries;

  if (match.rule.action.setSiteMode) {
    entries.push({
      code: CODE.AUTO_RULE_APPLIED,
      title: `Auto-rule: ${match.rule.name}`,
      detail: `Matched pattern "${match.matchedPattern}". Mode set to "${SITE_MODE_LABELS[match.rule.action.setSiteMode as SiteMode] ?? match.rule.action.setSiteMode}". ${match.rule.builtIn ? 'Built-in rule.' : 'Custom rule.'} You can override by setting a site-specific mode.`,
      severity: DiagnosticSeverity.Info,
    });
  }

  if (match.rule.action.recommendDisable && match.rule.action.recommendDisable.length > 0) {
    entries.push({
      code: CODE.AUTO_RULE_RECOMMENDATION,
      title: `Recommendation: ${match.rule.name}`,
      detail: `Consider disabling ${match.rule.action.recommendDisable.join(', ')} extensions on this site. Matched pattern "${match.matchedPattern}".`,
      severity: DiagnosticSeverity.Warning,
    });
  }

  return entries;
}

function capabilityEntries(resolved: ResolvedSiteMode): DiagnosticEntry[] {
  const entries: DiagnosticEntry[] = [];
  const caps = resolved.capabilities;

  if (!caps.monitoringActive) {
    entries.push({
      code: CODE.CAP_MONITORING_OFF,
      title: 'Monitoring inactive',
      detail: 'The extension is not tracking any activity on this site.',
      severity: DiagnosticSeverity.Info,
    });
  }

  if (!caps.contentScriptAllowed) {
    entries.push({
      code: CODE.CAP_CONTENT_SCRIPT_OFF,
      title: 'Content scripts blocked',
      detail:
        'No scripts will be injected into this page. This eliminates a common source of extension/site conflicts.',
      severity: DiagnosticSeverity.Info,
    });
  }

  if (!caps.domInteractionAllowed) {
    entries.push({
      code: CODE.CAP_DOM_OFF,
      title: 'DOM interaction blocked',
      detail:
        'The extension will not read or modify page content. The page runs exactly as if the extension were not installed.',
      severity: DiagnosticSeverity.Info,
    });
  }

  return entries;
}

function siteContextEntries(hostname: string): DiagnosticEntry[] {
  const entries: DiagnosticEntry[] = [];

  if (isLocalhost(hostname)) {
    entries.push({
      code: CODE.SITE_LOCALHOST,
      title: 'Local development site',
      detail:
        'This appears to be a local development server. Extensions rarely cause issues here, but Safe Mode is available if needed.',
      severity: DiagnosticSeverity.Info,
    });
  }

  if (isIpAddress(hostname)) {
    entries.push({
      code: CODE.SITE_IP,
      title: 'IP address',
      detail:
        'You are visiting a site by IP address. Site rules are matched by this exact IP.',
      severity: DiagnosticSeverity.Info,
    });
  }

  return entries;
}

function conflictHintEntries(resolved: ResolvedSiteMode): DiagnosticEntry[] {
  const entries: DiagnosticEntry[] = [];

  // Only show hints in Normal mode — Safe and Disabled already mitigate
  if (resolved.effectiveMode !== SiteMode.Normal) {
    return entries;
  }

  entries.push({
    code: CODE.HINT_SAFE_MODE,
    title: 'Experiencing issues?',
    detail:
      'If this site is not working correctly, try switching to Safe Mode. This disables content scripts and DOM interaction, which are the most common causes of extension/site conflicts.',
    severity: DiagnosticSeverity.Warning,
  });

  return entries;
}

// ---------------------------------------------------------------------------
// Extension-aware entries (v0.2)
// ---------------------------------------------------------------------------

function extensionEntries(report: SiteExtensionReport | null): DiagnosticEntry[] {
  if (!report) return [];

  const entries: DiagnosticEntry[] = [];

  if (report.activeOnPage.length === 0) {
    entries.push({
      code: CODE.EXT_CLEAN,
      title: 'No extensions on this page',
      detail: 'No other extensions inject content scripts into this page.',
      severity: DiagnosticSeverity.Info,
    });
    return entries;
  }

  entries.push({
    code: CODE.EXT_COUNT,
    title: `${report.activeOnPage.length} extension${report.activeOnPage.length === 1 ? '' : 's'} active`,
    detail: `${report.activeOnPage.map((e) => e.name).join(', ')} — injecting content scripts on this page.`,
    severity: report.activeOnPage.length >= 2
      ? DiagnosticSeverity.Warning
      : DiagnosticSeverity.Info,
  });

  // Known conflict database matches (specific, sourced)
  const knownConflicts = report.conflicts.filter((c) =>
    c.type.startsWith('known_'),
  );
  for (const kc of knownConflicts) {
    entries.push({
      code: CODE.KNOWN_CONFLICT,
      title: `Known issue${kc.source ? ` (${kc.source})` : ''}`,
      detail: kc.message,
      severity: DiagnosticSeverity.Warning,
    });
  }

  // Heuristic conflicts
  const heuristicConflicts = report.conflicts.filter(
    (c) => !c.type.startsWith('known_'),
  );
  if (heuristicConflicts.length > 0) {
    entries.push({
      code: CODE.EXT_CONFLICT,
      title: 'Potential conflict detected',
      detail: heuristicConflicts.map((c) => c.message).join(' '),
      severity: DiagnosticSeverity.Warning,
    });
  }

  const highRisk = report.activeOnPage.filter((e) => e.risk === ExtensionRisk.High);
  if (highRisk.length > 0) {
    entries.push({
      code: CODE.EXT_HIGH_RISK,
      title: `${highRisk.length} high-risk extension${highRisk.length === 1 ? '' : 's'}`,
      detail: `${highRisk.map((e) => e.name).join(', ')} — broad permissions that could interfere with this page. Consider disabling or using Troubleshoot Mode.`,
      severity: DiagnosticSeverity.Warning,
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Performance entries (v0.3)
// ---------------------------------------------------------------------------

function performanceEntries(health: PageHealthReport | null): DiagnosticEntry[] {
  if (!health) return [];
  const entries: DiagnosticEntry[] = [];

  // Slow page load (>3s)
  if (health.pageLoadTimeMs > 3000) {
    entries.push({
      code: CODE.PERF_SLOW_LOAD,
      title: `Slow page load: ${(health.pageLoadTimeMs / 1000).toFixed(1)}s`,
      detail: 'Page took over 3 seconds to load. Extensions injecting scripts can contribute to slower load times.',
      severity: DiagnosticSeverity.Warning,
    });
  }

  // Many scripts (>30)
  if (health.scriptCount > 30) {
    entries.push({
      code: CODE.PERF_MANY_SCRIPTS,
      title: `${health.scriptCount} scripts loaded`,
      detail: 'This page loads a high number of scripts. Extensions may be contributing additional scripts.',
      severity: DiagnosticSeverity.Warning,
    });
  }

  // Long tasks detected
  if (health.longTaskCount > 3) {
    entries.push({
      code: CODE.PERF_LONG_TASKS,
      title: `${health.longTaskCount} long tasks detected`,
      detail: 'Multiple tasks blocked the main thread for over 50ms. This causes visible jank and input delay.',
      severity: DiagnosticSeverity.Warning,
    });
  }

  // Heavy page (>5000 DOM nodes + >1MB transfer)
  if (health.domNodeCount > 5000 && health.totalTransferBytes > 1_000_000) {
    entries.push({
      code: CODE.PERF_HEAVY_PAGE,
      title: 'Heavy page',
      detail: `${health.domNodeCount.toLocaleString()} DOM nodes and ${(health.totalTransferBytes / 1_000_000).toFixed(1)}MB transferred. Extensions add to this load.`,
      severity: DiagnosticSeverity.Warning,
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Main assembly
// ---------------------------------------------------------------------------

/**
 * Build a complete diagnostics snapshot for a hostname.
 * Extension report is optional — backward compatible with v0.1 callers.
 */
export async function buildDiagnostics(
  hostname: string,
  resolved: ResolvedSiteMode,
  extensionReport?: SiteExtensionReport | null,
  pageHealth?: PageHealthReport | null,
): Promise<SiteDiagnostics> {
  const entries: DiagnosticEntry[] = [];

  // 1. Mode
  entries.push(modeEntry(resolved));

  // 2. Rule source
  entries.push(ruleSourceEntry(resolved));

  // 2b. Auto-rule info (if one matched)
  entries.push(...autoRuleEntries(resolved));

  // 3. Extension analysis (v0.2)
  entries.push(...extensionEntries(extensionReport ?? null));

  // 4. Performance warnings (v0.3)
  entries.push(...performanceEntries(pageHealth ?? null));

  // 5. Capabilities that are restricted
  entries.push(...capabilityEntries(resolved));

  // 6. Site context
  entries.push(...siteContextEntries(hostname));

  // 7. Conflict hints (only in Normal mode)
  entries.push(...conflictHintEntries(resolved));

  return {
    hostname,
    effectiveMode: resolved.effectiveMode,
    hasExplicitRule: resolved.hasExplicitRule,
    entries,
    generatedAt: new Date().toISOString(),
  };
}
