import { SiteMode, SITE_MODE_LABELS } from '@core/types';

const MODE_COLORS: Record<SiteMode, { bg: string; text: string }> = {
  [SiteMode.Normal]: { bg: '#dcfce7', text: '#166534' },
  [SiteMode.Safe]: { bg: '#fef9c3', text: '#854d0e' },
  [SiteMode.Disabled]: { bg: '#f3f4f6', text: '#6b7280' },
};

interface StatusBadgeProps {
  mode: SiteMode;
}

export function StatusBadge({ mode }: StatusBadgeProps) {
  const colors = MODE_COLORS[mode];

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: colors.bg,
        color: colors.text,
        lineHeight: '20px',
      }}
    >
      {SITE_MODE_LABELS[mode]}
    </span>
  );
}
