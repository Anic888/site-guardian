import { useState } from 'react';
import {
  useStorageInfo,
  enableSync as doEnableSync,
  disableSync as doDisableSync,
} from '@shared/hooks/useMessaging';

interface SyncSettingsProps {
  syncEnabled: boolean;
  onChanged: () => void;
}

export function SyncSettings({ syncEnabled, onChanged }: SyncSettingsProps) {
  const storageInfo = useStorageInfo();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setLoading(true);
    setError(null);
    try {
      if (syncEnabled) {
        await doDisableSync();
      } else {
        await doEnableSync();
      }
      onChanged();
      storageInfo.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change sync setting.');
    } finally {
      setLoading(false);
    }
  }

  const info = storageInfo.data;

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={headingStyle}>Cloud Sync</h2>
      <p style={descStyle}>
        Sync your settings, site rules, and auto-rules across devices using your browser&apos;s
        built-in sync (Chrome via Google account, Firefox via Firefox Sync).
      </p>

      <div style={{ padding: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
              Browser Sync
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {syncEnabled ? 'Settings sync across your devices' : 'All data stays on this device only'}
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={loading}
            style={{
              padding: '6px 16px',
              fontSize: 12,
              fontWeight: 600,
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              background: syncEnabled ? '#fef2f2' : '#dcfce7',
              color: syncEnabled ? '#dc2626' : '#166534',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '...' : syncEnabled ? 'Disable Sync' : 'Enable Sync'}
          </button>
        </div>

        {info && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
              <div>
                <span style={{ color: '#6b7280' }}>Active backend: </span>
                <span style={{ fontWeight: 600, color: '#111827' }}>{info.activeBackend}</span>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Sync available: </span>
                <span style={{ fontWeight: 600, color: info.syncAvailable ? '#166534' : '#dc2626' }}>
                  {info.syncAvailable ? 'Yes' : 'No'}
                </span>
              </div>
              {info.localBytesUsed >= 0 && (
                <div>
                  <span style={{ color: '#6b7280' }}>Local storage: </span>
                  <span style={{ color: '#111827' }}>{(info.localBytesUsed / 1024).toFixed(1)} KB</span>
                </div>
              )}
              {info.syncBytesUsed >= 0 && (
                <div>
                  <span style={{ color: '#6b7280' }}>Sync storage: </span>
                  <span style={{ color: '#111827' }}>
                    {(info.syncBytesUsed / 1024).toFixed(1)} / {(info.syncQuotaBytes / 1024).toFixed(0)} KB
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 8, padding: '8px 10px', background: '#fef2f2', borderRadius: 6, fontSize: 12, color: '#991b1b' }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
        Sync uses your browser&apos;s built-in sync service. No external servers. No Site Guardian accounts.
      </div>
    </section>
  );
}

const headingStyle: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 6px 0' };
const descStyle: React.CSSProperties = { fontSize: 13, color: '#6b7280', margin: '0 0 16px 0' };
