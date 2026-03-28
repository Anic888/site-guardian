import type { PageHealthReport } from '@core/types';

interface PageHealthCardProps {
  health: PageHealthReport;
}

function formatBytes(bytes: number): string {
  if (bytes < 0) return '—';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1_048_576).toFixed(1)}MB`;
}

function formatMs(ms: number): string {
  if (ms < 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function PageHealthCard({ health }: PageHealthCardProps) {
  const hasErrors = health.errorCount > 0;
  const loadTimeSlow = health.pageLoadTimeMs > 3000;
  const domHeavy = health.domNodeCount > 3000;
  const manyScripts = health.scriptCount > 30;
  const hasLongTasks = health.longTaskCount > 3;

  const issueCount =
    (hasErrors ? 1 : 0) +
    (loadTimeSlow ? 1 : 0) +
    (domHeavy ? 1 : 0) +
    (manyScripts ? 1 : 0) +
    (hasLongTasks ? 1 : 0);

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
        }}
      >
        Page Health
      </div>

      {/* Primary metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <MetricCell
          value={String(health.errorCount)}
          label="JS errors"
          warn={hasErrors}
          bad={health.errorCount > 5}
        />
        <MetricCell
          value={formatMs(health.pageLoadTimeMs)}
          label="load time"
          warn={loadTimeSlow}
        />
        <MetricCell
          value={health.domNodeCount > 0
            ? health.domNodeCount > 999
              ? `${(health.domNodeCount / 1000).toFixed(1)}k`
              : String(health.domNodeCount)
            : '—'}
          label="DOM nodes"
          warn={domHeavy}
        />
      </div>

      {/* Secondary metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 6 }}>
        <MetricCell
          value={health.scriptCount >= 0 ? String(health.scriptCount) : '—'}
          label="scripts"
          warn={manyScripts}
        />
        <MetricCell
          value={health.lcpMs >= 0 ? formatMs(health.lcpMs) : '—'}
          label="LCP"
          warn={health.lcpMs > 2500}
          tooltip={health.lcpMs < 0 ? 'Unavailable' : 'Largest Contentful Paint'}
        />
        <MetricCell
          value={health.totalTransferBytes >= 0
            ? formatBytes(health.totalTransferBytes)
            : '—'}
          label="transferred"
          warn={health.totalTransferBytes > 3_000_000}
        />
      </div>

      {/* Long tasks indicator */}
      {health.longTaskCount > 0 && (
        <div
          style={{
            marginTop: 6,
            padding: '4px 8px',
            background: hasLongTasks ? '#fef2f2' : '#fffbeb',
            borderRadius: 4,
            fontSize: 10,
            color: hasLongTasks ? '#991b1b' : '#92400e',
          }}
        >
          {health.longTaskCount} long task{health.longTaskCount !== 1 ? 's' : ''} (&gt;50ms) detected
        </div>
      )}

      {/* Error details */}
      {hasErrors && (
        <div style={{ marginTop: 6 }}>
          {health.errors.slice(0, 3).map((err, i) => (
            <div
              key={i}
              style={{
                padding: '4px 8px',
                background: '#fef2f2',
                borderRadius: 4,
                fontSize: 10,
                color: '#991b1b',
                marginTop: 3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={`${err.message} (${err.source}:${err.line})`}
            >
              {err.message}
            </div>
          ))}
          {health.errorCount > 3 && (
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>
              +{health.errorCount - 3} more
            </div>
          )}
        </div>
      )}

      {issueCount === 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#16a34a', textAlign: 'center' }}>
          Page looks healthy
        </div>
      )}
    </div>
  );
}

function MetricCell({
  value,
  label,
  warn = false,
  bad = false,
  tooltip,
}: {
  value: string;
  label: string;
  warn?: boolean;
  bad?: boolean;
  tooltip?: string;
}) {
  const color = bad ? '#dc2626' : warn ? '#d97706' : '#16a34a';
  const bg = bad ? '#fef2f2' : warn ? '#fffbeb' : '#f0fdf4';
  const border = bad ? '#fecaca' : warn ? '#fde68a' : '#bbf7d0';

  return (
    <div
      style={{
        padding: '6px',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 6,
        textAlign: 'center',
      }}
      title={tooltip}
    >
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 9, color: '#6b7280' }}>{label}</div>
    </div>
  );
}
