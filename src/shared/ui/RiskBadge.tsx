import { ExtensionRisk, EXTENSION_RISK_LABELS } from '@core/types';

const RISK_COLORS: Record<ExtensionRisk, { bg: string; text: string }> = {
  [ExtensionRisk.Low]: { bg: '#dcfce7', text: '#166534' },
  [ExtensionRisk.Medium]: { bg: '#fef9c3', text: '#854d0e' },
  [ExtensionRisk.High]: { bg: '#fee2e2', text: '#991b1b' },
};

interface RiskBadgeProps {
  risk: ExtensionRisk;
}

export function RiskBadge({ risk }: RiskBadgeProps) {
  const colors = RISK_COLORS[risk];

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: colors.bg,
        color: colors.text,
        lineHeight: '18px',
      }}
    >
      {EXTENSION_RISK_LABELS[risk]}
    </span>
  );
}
