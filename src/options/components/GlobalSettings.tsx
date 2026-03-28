import { useState } from 'react';
import {
  SiteMode,
  SITE_MODE_LABELS,
  SITE_MODE_DESCRIPTIONS,
} from '@core/types';
import { updateGlobalSettings } from '@shared/hooks/useMessaging';

interface GlobalSettingsProps {
  currentDefault: SiteMode;
  onChanged: () => void;
}

const MODES = [SiteMode.Normal, SiteMode.Safe, SiteMode.Disabled] as const;

export function GlobalSettings({
  currentDefault,
  onChanged,
}: GlobalSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(mode: SiteMode) {
    if (mode === currentDefault) return;
    setSaving(true);
    setError(null);
    try {
      await updateGlobalSettings({ defaultMode: mode });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Global Default Mode</h2>
      <p style={descStyle}>
        This mode applies to all sites unless you set a site-specific rule.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MODES.map((mode) => {
          const isActive = mode === currentDefault;
          return (
            <label
              key={mode}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                border: isActive ? '2px solid #2563eb' : '1px solid #e5e7eb',
                borderRadius: 8,
                background: isActive ? '#eff6ff' : '#fff',
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              <input
                type="radio"
                name="defaultMode"
                checked={isActive}
                onChange={() => handleChange(mode)}
                disabled={saving}
                style={{ marginTop: 2 }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  {SITE_MODE_LABELS[mode]}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  {SITE_MODE_DESCRIPTIONS[mode]}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {error && <div style={errorStyle}>{error}</div>}
    </section>
  );
}

const sectionStyle: React.CSSProperties = {
  marginBottom: 32,
};

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

const errorStyle: React.CSSProperties = {
  marginTop: 10,
  padding: '8px 12px',
  background: '#fef2f2',
  color: '#991b1b',
  fontSize: 12,
  borderRadius: 6,
};
