import { describe, it, expect } from 'vitest';
import { buildDiagnostics } from '../diagnostics';
import { getCapabilities } from '../site-mode';
import { DiagnosticSeverity, SiteMode } from '../types';
import type { ResolvedSiteMode } from '../site-mode';

function makeResolved(
  mode: SiteMode,
  hasExplicitRule: boolean,
): ResolvedSiteMode {
  return {
    effectiveMode: mode,
    hasExplicitRule,
    rule: hasExplicitRule
      ? { mode, updatedAt: new Date().toISOString() }
      : undefined,
    capabilities: getCapabilities(mode),
    autoRuleMatch: null,
  };
}

describe('buildDiagnostics', () => {
  it('returns valid structure', async () => {
    const result = await buildDiagnostics(
      'example.com',
      makeResolved(SiteMode.Normal, false),
    );
    expect(result.hostname).toBe('example.com');
    expect(result.effectiveMode).toBe(SiteMode.Normal);
    expect(result.hasExplicitRule).toBe(false);
    expect(result.generatedAt).toBeTruthy();
    expect(Array.isArray(result.entries)).toBe(true);
  });

  it('Normal mode with no rule has mode + default + hint entries', async () => {
    const result = await buildDiagnostics(
      'example.com',
      makeResolved(SiteMode.Normal, false),
    );
    const codes = result.entries.map((e) => e.code);
    expect(codes).toContain('mode_normal');
    expect(codes).toContain('rule_default');
    expect(codes).toContain('hint_safe_mode');
  });

  it('Normal mode with explicit rule uses rule_explicit', async () => {
    const result = await buildDiagnostics(
      'example.com',
      makeResolved(SiteMode.Normal, true),
    );
    const codes = result.entries.map((e) => e.code);
    expect(codes).toContain('rule_explicit');
    expect(codes).not.toContain('rule_default');
  });

  it('Safe mode shows capability restrictions', async () => {
    const result = await buildDiagnostics(
      'example.com',
      makeResolved(SiteMode.Safe, true),
    );
    const codes = result.entries.map((e) => e.code);
    expect(codes).toContain('mode_safe');
    expect(codes).toContain('cap_content_script_off');
    expect(codes).toContain('cap_dom_off');
    // No conflict hint in Safe mode
    expect(codes).not.toContain('hint_safe_mode');
  });

  it('Disabled mode shows all restrictions', async () => {
    const result = await buildDiagnostics(
      'example.com',
      makeResolved(SiteMode.Disabled, true),
    );
    const codes = result.entries.map((e) => e.code);
    expect(codes).toContain('mode_disabled');
    expect(codes).toContain('cap_monitoring_off');
    expect(codes).toContain('cap_content_script_off');
    expect(codes).toContain('cap_dom_off');
    expect(codes).not.toContain('hint_safe_mode');
  });

  it('localhost shows site_localhost entry', async () => {
    const result = await buildDiagnostics(
      'localhost',
      makeResolved(SiteMode.Normal, false),
    );
    const codes = result.entries.map((e) => e.code);
    expect(codes).toContain('site_localhost');
  });

  it('IP address shows site_ip entry', async () => {
    const result = await buildDiagnostics(
      '192.168.1.1',
      makeResolved(SiteMode.Normal, false),
    );
    const codes = result.entries.map((e) => e.code);
    expect(codes).toContain('site_ip');
  });

  it('hint entry has Warning severity', async () => {
    const result = await buildDiagnostics(
      'example.com',
      makeResolved(SiteMode.Normal, false),
    );
    const hint = result.entries.find((e) => e.code === 'hint_safe_mode');
    expect(hint).toBeDefined();
    expect(hint!.severity).toBe(DiagnosticSeverity.Warning);
  });

  it('all entries have non-empty title and detail', async () => {
    const result = await buildDiagnostics(
      'localhost',
      makeResolved(SiteMode.Normal, false),
    );
    for (const entry of result.entries) {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.detail.length).toBeGreaterThan(0);
      expect(entry.code.length).toBeGreaterThan(0);
    }
  });
});
