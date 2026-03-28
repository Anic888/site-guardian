import { useState } from 'react';
import {
  SiteMode,
  SITE_MODE_LABELS,
  SITE_MODE_DESCRIPTIONS,
} from '@core/types';
import { setSiteMode, removeSiteRule } from '@shared/hooks/useMessaging';

interface ModeSelectorProps {
  hostname: string;
  currentMode: SiteMode;
  hasExplicitRule: boolean;
  onModeChanged: () => void;
}

const MODES = [SiteMode.Normal, SiteMode.Safe, SiteMode.Disabled] as const;

export function ModeSelector({
  hostname,
  currentMode,
  hasExplicitRule,
  onModeChanged,
}: ModeSelectorProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleModeChange(mode: SiteMode) {
    if (mode === currentMode && hasExplicitRule) return;

    setSaving(true);
    setError(null);

    try {
      await setSiteMode(hostname, mode);
      onModeChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetToDefault() {
    setSaving(true);
    setError(null);

    try {
      await removeSiteRule(hostname);
      onModeChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset');
    } finally {
      setSaving(false);
    }
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
        Site Mode
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {MODES.map((mode) => {
          const isActive = mode === currentMode;
          return (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              disabled={saving}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '10px 12px',
                border: isActive ? '2px solid #2563eb' : '1px solid #e5e7eb',
                borderRadius: 8,
                background: isActive ? '#eff6ff' : '#fff',
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.6 : 1,
                textAlign: 'left',
                width: '100%',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: isActive ? '#2563eb' : '#374151',
                }}
              >
                {SITE_MODE_LABELS[mode]}
              </span>
              <span style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                {SITE_MODE_DESCRIPTIONS[mode]}
              </span>
            </button>
          );
        })}
      </div>

      {hasExplicitRule && (
        <button
          onClick={handleResetToDefault}
          disabled={saving}
          style={{
            marginTop: 8,
            padding: '6px 0',
            background: 'none',
            border: 'none',
            color: '#6b7280',
            fontSize: 12,
            cursor: 'pointer',
            textDecoration: 'underline',
            width: '100%',
            textAlign: 'center',
          }}
        >
          Reset to global default
        </button>
      )}

      {error && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            background: '#fef2f2',
            color: '#991b1b',
            fontSize: 12,
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
