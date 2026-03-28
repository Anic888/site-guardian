import { useState } from 'react';
import { ExtensionRisk, type SiteExtensionReport } from '@core/types';
import { RiskBadge } from '@shared/ui/RiskBadge';
import { setExtensionEnabled } from '@shared/hooks/useMessaging';
import { CATEGORY_LABELS, type ExtensionCategory } from '@core/extension-analyzer';

interface ExtensionListProps {
  report: SiteExtensionReport;
  onChanged: () => void;
}

export function ExtensionList({ report, onChanged }: ExtensionListProps) {
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  async function handleToggle(id: string, currentEnabled: boolean) {
    setToggling((prev) => new Set(prev).add(id));
    try {
      await setExtensionEnabled(id, !currentEnabled);
      onChanged();
    } catch {
      // Silently fail — refetch will show real state
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  const { activeOnPage, allEnabled, conflicts } = report;

  return (
    <div style={{ padding: '8px 0' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Extensions on this page</span>
        <RiskBadge risk={report.overallRisk} />
      </div>

      {/* Conflict warnings */}
      {conflicts.map((c, i) => (
        <div
          key={i}
          style={{
            padding: '8px 10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            fontSize: 11,
            color: '#991b1b',
            marginBottom: 6,
            lineHeight: '16px',
          }}
        >
          {c.message}
        </div>
      ))}

      {/* Active extensions on this page */}
      {activeOnPage.length === 0 ? (
        <div
          style={{
            padding: '12px',
            background: '#f0fdf4',
            borderRadius: 6,
            fontSize: 12,
            color: '#166534',
            textAlign: 'center',
          }}
        >
          No extensions inject scripts on this page.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {activeOnPage.map((ext) => (
            <div
              key={ext.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                background: ext.risk === ExtensionRisk.High ? '#fff5f5' : '#f9fafb',
                border: `1px solid ${ext.risk === ExtensionRisk.High ? '#fecaca' : '#f3f4f6'}`,
                borderRadius: 6,
              }}
            >
              {ext.iconUrl && (
                <img
                  src={ext.iconUrl}
                  alt=""
                  style={{ width: 20, height: 20, borderRadius: 4 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#111827',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ext.name}
                </div>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>
                  {CATEGORY_LABELS[ext.category as ExtensionCategory] ?? ext.category} · {ext.permissions.length} perms
                </div>
              </div>
              <RiskBadge risk={ext.risk} />
              <button
                onClick={() => handleToggle(ext.id, ext.enabled)}
                disabled={toggling.has(ext.id)}
                title={ext.enabled ? 'Disable this extension' : 'Enable this extension'}
                aria-label={`${ext.enabled ? 'Disable' : 'Enable'} ${ext.name}`}
                style={{
                  padding: '4px 8px',
                  fontSize: 10,
                  fontWeight: 600,
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
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

      {/* Summary */}
      <div style={{ marginTop: 6, fontSize: 10, color: '#9ca3af' }}>
        {activeOnPage.length} active on page / {allEnabled.length} enabled total / {report.totalExtensions} installed
      </div>
    </div>
  );
}
