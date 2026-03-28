import { useAutoRules, saveAutoRule, deleteAutoRule } from '@shared/hooks/useMessaging';
import type { AutoRule } from '@core/types';
import { useState } from 'react';

export function AutoRulesSection() {
  const { data: rules, loading, error, refetch } = useAutoRules();
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  async function handleToggle(rule: AutoRule) {
    setToggling((prev) => new Set(prev).add(rule.id));
    try {
      await saveAutoRule({ ...rule, enabled: !rule.enabled });
      refetch();
    } catch { /* ok */ } finally {
      setToggling((prev) => { const n = new Set(prev); n.delete(rule.id); return n; });
    }
  }

  async function handleDelete(ruleId: string) {
    try {
      await deleteAutoRule(ruleId);
      refetch();
    } catch { /* ok */ }
  }

  if (loading) return <div style={{ padding: 20, color: '#9ca3af', textAlign: 'center' }}>Loading rules...</div>;
  if (error) return <div style={{ padding: 12, background: '#fef2f2', borderRadius: 8, color: '#991b1b', fontSize: 13 }}>{error}</div>;

  const builtIn = (rules ?? []).filter((r) => r.builtIn);
  const custom = (rules ?? []).filter((r) => !r.builtIn);

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={headingStyle}>Auto-Rules</h2>
      <p style={descStyle}>
        Automatic rules that activate based on URL patterns. Built-in rules ship with the extension.
        You can enable/disable them or create custom rules.
      </p>

      {builtIn.length > 0 && (
        <>
          <h3 style={subheadingStyle}>Built-in Rules</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {builtIn.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                toggling={toggling.has(rule.id)}
                onToggle={() => handleToggle(rule)}
              />
            ))}
          </div>
        </>
      )}

      {custom.length > 0 && (
        <>
          <h3 style={{ ...subheadingStyle, marginTop: 16 }}>Custom Rules</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {custom.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                toggling={toggling.has(rule.id)}
                onToggle={() => handleToggle(rule)}
                onDelete={() => handleDelete(rule.id)}
              />
            ))}
          </div>
        </>
      )}

      {custom.length === 0 && (
        <div style={{ marginTop: 12, padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
          No custom rules yet. Custom rule creation coming in a future update.
        </div>
      )}
    </section>
  );
}

function RuleCard({
  rule,
  toggling,
  onToggle,
  onDelete,
}: {
  rule: AutoRule;
  toggling: boolean;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  const action = rule.action.setSiteMode
    ? `Set mode: ${rule.action.setSiteMode}`
    : rule.action.recommendDisable
      ? `Recommend disable: ${rule.action.recommendDisable.join(', ')}`
      : 'No action';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        opacity: rule.enabled ? 1 : 0.5,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{rule.name}</div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
          {rule.condition.urlPatterns.slice(0, 3).join(', ')}
          {rule.condition.urlPatterns.length > 3 && ` +${rule.condition.urlPatterns.length - 3} more`}
        </div>
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{action}</div>
      </div>
      <button
        onClick={onToggle}
        disabled={toggling}
        style={{
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 600,
          border: '1px solid #e5e7eb',
          borderRadius: 4,
          background: rule.enabled ? '#fff' : '#dcfce7',
          color: rule.enabled ? '#6b7280' : '#166534',
          cursor: toggling ? 'wait' : 'pointer',
        }}
      >
        {rule.enabled ? 'Disable' : 'Enable'}
      </button>
      {onDelete && !rule.builtIn && (
        <button
          onClick={onDelete}
          style={{
            padding: '4px 8px',
            fontSize: 14,
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
          }}
          aria-label={`Delete rule ${rule.name}`}
        >
          {'\u2715'}
        </button>
      )}
    </div>
  );
}

const headingStyle: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' };
const descStyle: React.CSSProperties = { fontSize: 13, color: '#6b7280', margin: '0 0 16px 0' };
const subheadingStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 8px 0' };
