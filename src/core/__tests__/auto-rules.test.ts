import { describe, it, expect } from 'vitest';
import {
  matchesHostnamePattern,
  evaluateRules,
  evaluateAllRules,
  mergeRules,
  BUILT_IN_RULES,
} from '../auto-rules';
import { SiteMode, type AutoRule } from '../types';

// ---------------------------------------------------------------------------
// matchesHostnamePattern
// ---------------------------------------------------------------------------

describe('matchesHostnamePattern', () => {
  it('matches exact hostname', () => {
    expect(matchesHostnamePattern('example.com', 'example.com')).toBe(true);
  });

  it('rejects non-matching hostname', () => {
    expect(matchesHostnamePattern('other.com', 'example.com')).toBe(false);
  });

  it('matches *.example.com against sub.example.com', () => {
    expect(matchesHostnamePattern('sub.example.com', '*.example.com')).toBe(true);
  });

  it('matches *.example.com against example.com itself', () => {
    expect(matchesHostnamePattern('example.com', '*.example.com')).toBe(true);
  });

  it('matches *.bank.* against any.bank.com', () => {
    expect(matchesHostnamePattern('my.bank.com', '*.bank.*')).toBe(true);
    expect(matchesHostnamePattern('secure.bank.co.uk', '*.bank.*')).toBe(true);
  });

  it('matches checkout.* prefix pattern', () => {
    expect(matchesHostnamePattern('checkout.example.com', 'checkout.*')).toBe(true);
  });

  it('rejects empty inputs', () => {
    expect(matchesHostnamePattern('', 'example.com')).toBe(false);
    expect(matchesHostnamePattern('example.com', '')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// evaluateRules
// ---------------------------------------------------------------------------

function makeRule(overrides: Partial<AutoRule>): AutoRule {
  return {
    id: 'test-' + Math.random().toString(36).slice(2, 6),
    name: 'Test Rule',
    enabled: true,
    priority: 100,
    condition: { urlPatterns: ['*.example.com'] },
    action: { setSiteMode: SiteMode.Safe },
    builtIn: false,
    ...overrides,
  };
}

describe('evaluateRules', () => {
  it('returns null for empty rules', () => {
    expect(evaluateRules([], 'example.com')).toBeNull();
  });

  it('returns null when no rules match', () => {
    const rules = [makeRule({ condition: { urlPatterns: ['*.other.com'] } })];
    expect(evaluateRules(rules, 'example.com')).toBeNull();
  });

  it('returns matching rule', () => {
    const rules = [makeRule({ condition: { urlPatterns: ['*.example.com'] } })];
    const result = evaluateRules(rules, 'sub.example.com');
    expect(result).not.toBeNull();
    expect(result!.rule.id).toBe(rules[0]!.id);
    expect(result!.matchedPattern).toBe('*.example.com');
  });

  it('higher priority wins', () => {
    const lowPriority = makeRule({
      id: 'low',
      priority: 10,
      condition: { urlPatterns: ['*.example.com'] },
      action: { setSiteMode: SiteMode.Normal },
    });
    const highPriority = makeRule({
      id: 'high',
      priority: 100,
      condition: { urlPatterns: ['*.example.com'] },
      action: { setSiteMode: SiteMode.Disabled },
    });
    // Rules are expected to be pre-sorted by caller
    const rules = [highPriority, lowPriority];
    const result = evaluateRules(rules, 'example.com');
    expect(result!.rule.id).toBe('high');
  });

  it('skips disabled rules', () => {
    const rules = [
      makeRule({
        enabled: false,
        condition: { urlPatterns: ['*.example.com'] },
      }),
    ];
    expect(evaluateRules(rules, 'example.com')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// evaluateAllRules
// ---------------------------------------------------------------------------

describe('evaluateAllRules', () => {
  it('returns all matching rules', () => {
    const rules = [
      makeRule({ id: 'a', condition: { urlPatterns: ['*.example.com'] } }),
      makeRule({ id: 'b', condition: { urlPatterns: ['example.com'] } }),
      makeRule({ id: 'c', condition: { urlPatterns: ['*.other.com'] } }),
    ];
    const matches = evaluateAllRules(rules, 'example.com');
    expect(matches).toHaveLength(2);
    expect(matches.map((m) => m.rule.id)).toContain('a');
    expect(matches.map((m) => m.rule.id)).toContain('b');
  });
});

// ---------------------------------------------------------------------------
// mergeRules
// ---------------------------------------------------------------------------

describe('mergeRules', () => {
  it('user rules get priority boost over built-in', () => {
    const builtIn = [makeRule({ id: 'b1', priority: 100, builtIn: true })];
    const user = [makeRule({ id: 'u1', priority: 50, builtIn: false })];
    const merged = mergeRules(builtIn, user);
    // User rule at priority 50+1000 = 1050 should come first
    expect(merged[0]!.id).toBe('u1');
    expect(merged[1]!.id).toBe('b1');
  });

  it('preserves sorting within same origin', () => {
    const builtIn = [
      makeRule({ id: 'b1', priority: 100, builtIn: true }),
      makeRule({ id: 'b2', priority: 90, builtIn: true }),
    ];
    const merged = mergeRules(builtIn, []);
    expect(merged[0]!.id).toBe('b1');
    expect(merged[1]!.id).toBe('b2');
  });
});

// ---------------------------------------------------------------------------
// Built-in rules integrity
// ---------------------------------------------------------------------------

describe('BUILT_IN_RULES', () => {
  it('has at least 3 built-in rules', () => {
    expect(BUILT_IN_RULES.length).toBeGreaterThanOrEqual(3);
  });

  it('all have unique IDs', () => {
    const ids = BUILT_IN_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all are marked builtIn', () => {
    for (const rule of BUILT_IN_RULES) {
      expect(rule.builtIn).toBe(true);
    }
  });

  it('banking rule matches chase.com', () => {
    const match = evaluateRules(BUILT_IN_RULES, 'www.chase.com');
    expect(match).not.toBeNull();
    expect(match!.rule.action.setSiteMode).toBe('safe');
  });

  it('streaming rule matches netflix.com', () => {
    const match = evaluateRules(BUILT_IN_RULES, 'www.netflix.com');
    expect(match).not.toBeNull();
    expect(match!.rule.action.recommendDisable).toContain('vpn-proxy');
  });
});
