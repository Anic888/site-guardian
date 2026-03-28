import { useState } from 'react';
import { ExtensionRisk, type ExtensionInfo } from '@core/types';
import { useAllExtensions, setExtensionEnabled } from '@shared/hooks/useMessaging';
import { RiskBadge } from '@shared/ui/RiskBadge';

type FilterMode = 'all' | 'high_risk' | 'has_content_scripts';

const FILTER_LABELS: Record<FilterMode, string> = {
  all: 'All',
  high_risk: 'High Risk',
  has_content_scripts: 'Injects Scripts',
};

export function ExtensionDashboard() {
  const { data: extensions, loading, error, refetch } = useAllExtensions();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  async function handleToggle(ext: ExtensionInfo) {
    setToggling((prev) => new Set(prev).add(ext.id));
    try {
      await setExtensionEnabled(ext.id, !ext.enabled);
      refetch();
    } catch {
      // Refetch will show real state
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(ext.id);
        return next;
      });
    }
  }

  const filtered = (extensions ?? [])
    .filter((e) => !e.isSelf)
    .filter((e) => {
      if (filter === 'high_risk') return e.risk === ExtensionRisk.High;
      if (filter === 'has_content_scripts') return e.contentScriptPatterns.length > 0;
      return true;
    })
    .sort((a, b) => {
      const riskOrder = { [ExtensionRisk.High]: 0, [ExtensionRisk.Medium]: 1, [ExtensionRisk.Low]: 2 };
      return riskOrder[a.risk] - riskOrder[b.risk];
    });

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={headingStyle}>Extension Dashboard</h2>
      <p style={descStyle}>
        All installed extensions with risk assessment. Extensions are scored based on
        their declared permissions and content script scope.
      </p>

      {loading && (
        <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>
          Loading extensions...
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: '#fef2f2', borderRadius: 8, color: '#991b1b', fontSize: 13 }}>
          {error}
          <button onClick={refetch} style={{ display: 'block', marginTop: 8, fontSize: 12, textDecoration: 'underline', background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {extensions && (
        <>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {(Object.keys(FILTER_LABELS) as FilterMode[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: filter === f ? 600 : 400,
                  border: filter === f ? '1px solid #2563eb' : '1px solid #e5e7eb',
                  borderRadius: 6,
                  background: filter === f ? '#eff6ff' : '#fff',
                  color: filter === f ? '#2563eb' : '#374151',
                  cursor: 'pointer',
                }}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          {/* Extension list */}
          {filtered.length === 0 ? (
            <div style={{ padding: 20, background: '#f9fafb', borderRadius: 8, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              No extensions match this filter.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.map((ext) => (
                <div
                  key={ext.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: '#fff',
                    border: `1px solid ${ext.risk === ExtensionRisk.High ? '#fecaca' : '#e5e7eb'}`,
                    borderRadius: 8,
                    opacity: ext.enabled ? 1 : 0.5,
                  }}
                >
                  {ext.iconUrl && (
                    <img src={ext.iconUrl} alt="" style={{ width: 24, height: 24, borderRadius: 4 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#111827',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ext.name}
                      </span>
                      <RiskBadge risk={ext.risk} />
                      {!ext.enabled && (
                        <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>
                          disabled
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                      {ext.permissions.length + ext.hostPermissions.length} permissions
                      {ext.contentScriptPatterns.length > 0 &&
                        ` · ${ext.contentScriptPatterns.length} content script pattern${ext.contentScriptPatterns.length === 1 ? '' : 's'}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(ext)}
                    disabled={toggling.has(ext.id)}
                    aria-label={`${ext.enabled ? 'Disable' : 'Enable'} ${ext.name}`}
                    style={{
                      padding: '5px 12px',
                      fontSize: 11,
                      fontWeight: 600,
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                      background: ext.enabled ? '#fff' : '#dcfce7',
                      color: ext.enabled ? '#dc2626' : '#166534',
                      cursor: toggling.has(ext.id) ? 'wait' : 'pointer',
                      opacity: toggling.has(ext.id) ? 0.5 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ext.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
            {filtered.length} of {extensions.filter((e) => !e.isSelf).length} extensions shown
          </div>
        </>
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
