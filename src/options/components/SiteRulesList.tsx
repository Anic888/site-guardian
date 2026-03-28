import { useState } from 'react';
import type { SiteRulesMap } from '@core/types';
import { removeSiteRule } from '@shared/hooks/useMessaging';
import { StatusBadge } from '@shared/ui/StatusBadge';

interface SiteRulesListProps {
  rules: SiteRulesMap;
  onChanged: () => void;
}

export function SiteRulesList({ rules, onChanged }: SiteRulesListProps) {
  const [removing, setRemoving] = useState<string | null>(null);

  const entries = Object.entries(rules).sort(
    ([, a], [, b]) => b.updatedAt.localeCompare(a.updatedAt),
  );

  async function handleRemove(hostname: string) {
    setRemoving(hostname);
    try {
      await removeSiteRule(hostname);
      onChanged();
    } catch {
      // Silently fail — next refetch will show the real state
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={headingStyle}>Site-Specific Rules</h2>
      <p style={descStyle}>
        These sites have custom modes that override the global default.
      </p>

      {entries.length === 0 ? (
        <div
          style={{
            padding: '20px 16px',
            background: '#f9fafb',
            borderRadius: 8,
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: 13,
          }}
        >
          No site-specific rules yet. Use the popup to set a mode for any site.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.map(([hostname, rule]) => (
            <div
              key={hostname}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#111827',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={hostname}
                >
                  {hostname}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  Updated{' '}
                  {new Date(rule.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <StatusBadge mode={rule.mode} />
                <button
                  onClick={() => handleRemove(hostname)}
                  disabled={removing === hostname}
                  title={`Remove rule for ${hostname}`}
                  aria-label={`Remove rule for ${hostname}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: removing === hostname ? 'wait' : 'pointer',
                    color: '#9ca3af',
                    fontSize: 16,
                    padding: '2px 4px',
                    borderRadius: 4,
                    lineHeight: 1,
                    opacity: removing === hostname ? 0.4 : 1,
                  }}
                >
                  {'\u2715'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
          {entries.length} rule{entries.length === 1 ? '' : 's'} total
        </div>
      )}
    </section>
  );
}

const headingStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: '#111827',
  margin: '0 0 6px 0',
};

const descStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#6b7280',
  margin: '0 0 16px 0',
};
