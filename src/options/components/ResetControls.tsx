import { useState } from 'react';
import { resetAllSettings } from '@shared/hooks/useMessaging';

interface ResetControlsProps {
  onReset: () => void;
}

export function ResetControls({ onReset }: ResetControlsProps) {
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    setResetting(true);
    setError(null);
    try {
      await resetAllSettings();
      setConfirming(false);
      onReset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset');
    } finally {
      setResetting(false);
    }
  }

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={headingStyle}>Danger Zone</h2>

      <div
        style={{
          padding: 16,
          background: '#fff',
          border: '1px solid #fecaca',
          borderRadius: 10,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: '#991b1b' }}>
          Reset All Settings
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '6px 0 12px 0' }}>
          This will delete all your settings, site rules, and extension state.
          The extension will return to its initial state as if freshly installed.
        </p>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            style={{
              padding: '8px 16px',
              background: '#fff',
              border: '1px solid #fca5a5',
              borderRadius: 6,
              color: '#dc2626',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reset Everything...
          </button>
        ) : (
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#991b1b',
                margin: '0 0 10px 0',
              }}
            >
              Are you sure? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleReset}
                disabled={resetting}
                style={{
                  padding: '8px 16px',
                  background: '#dc2626',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: resetting ? 'wait' : 'pointer',
                  opacity: resetting ? 0.6 : 1,
                }}
              >
                {resetting ? 'Resetting...' : 'Yes, Reset Everything'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={resetting}
                style={{
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  color: '#374151',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 10,
              padding: '8px 12px',
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
    </section>
  );
}

const headingStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: '#111827',
  margin: '0 0 12px 0',
};
