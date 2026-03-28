import { DiagnosticSeverity, type SiteDiagnostics } from '@core/types';

interface DiagnosticsSummaryProps {
  diagnostics: SiteDiagnostics;
}

const SEVERITY_STYLES: Record<
  DiagnosticSeverity,
  { icon: string; color: string }
> = {
  [DiagnosticSeverity.Info]: { icon: '\u2139\uFE0F', color: '#374151' },
  [DiagnosticSeverity.Warning]: { icon: '\u26A0\uFE0F', color: '#92400e' },
};

export function DiagnosticsSummary({ diagnostics }: DiagnosticsSummaryProps) {
  if (diagnostics.entries.length === 0) {
    return null;
  }

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
        Diagnostics
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {diagnostics.entries.map((entry) => {
          const style = SEVERITY_STYLES[entry.severity];
          return (
            <div
              key={entry.code}
              style={{
                padding: '8px 10px',
                background:
                  entry.severity === DiagnosticSeverity.Warning
                    ? '#fffbeb'
                    : '#f9fafb',
                borderRadius: 6,
                border:
                  entry.severity === DiagnosticSeverity.Warning
                    ? '1px solid #fde68a'
                    : '1px solid #f3f4f6',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: style.color,
                }}
              >
                {style.icon} {entry.title}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: '#6b7280',
                  marginTop: 3,
                  lineHeight: '16px',
                }}
              >
                {entry.detail}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
