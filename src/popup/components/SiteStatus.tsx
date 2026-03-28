import { StatusBadge } from '@shared/ui/StatusBadge';
import type { TabStatus } from '@core/types';

interface SiteStatusProps {
  status: TabStatus;
}

export function SiteStatus({ status }: SiteStatusProps) {
  if (!status.isWebPage) {
    return (
      <div style={{ padding: '12px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          This page is not a website.
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
          Site Guardian only works on web pages.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#111827',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={status.hostname}
          >
            {status.hostname}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {status.hasExplicitRule
              ? 'Site-specific rule'
              : 'Using global default'}
          </div>
        </div>
        <StatusBadge mode={status.effectiveMode} />
      </div>
    </div>
  );
}
