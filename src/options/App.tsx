import {
  useGlobalSettings,
  useAllSiteRules,
} from '@shared/hooks/useMessaging';
import { GlobalSettings } from './components/GlobalSettings';
import { SiteRulesList } from './components/SiteRulesList';
import { AutoRulesSection } from './components/AutoRulesSection';
import { ExtensionDashboard } from './components/ExtensionDashboard';
import { SyncSettings } from './components/SyncSettings';
import { TransparencySection } from './components/TransparencySection';
import { ResetControls } from './components/ResetControls';

export function App() {
  const settings = useGlobalSettings();
  const rules = useAllSiteRules();

  const loading = settings.loading || rules.loading;
  const error = settings.error || rules.error;

  function refetchAll() {
    settings.refetch();
    rules.refetch();
  }

  return (
    <div
      style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '32px 24px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
          Site Guardian
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0 0' }}>
          Settings, Extensions &amp; Transparency
        </p>
      </div>

      {loading && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af' }}>
          Loading settings...
        </div>
      )}

      {error && (
        <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 13, marginBottom: 24 }}>
          <strong>Error:</strong> {error}
          <button onClick={refetchAll} style={{ display: 'block', marginTop: 8, padding: '6px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            Retry
          </button>
        </div>
      )}

      {settings.data && rules.data && (
        <>
          <GlobalSettings
            currentDefault={settings.data.defaultMode}
            onChanged={refetchAll}
          />

          <SiteRulesList rules={rules.data} onChanged={rules.refetch} />

          <AutoRulesSection />

          <ExtensionDashboard />

          <SyncSettings
            syncEnabled={settings.data.syncEnabled ?? false}
            onChanged={refetchAll}
          />

          <TransparencySection />

          <ResetControls onReset={refetchAll} />
        </>
      )}

      {/* Version footer */}
      <div
        style={{
          marginTop: 40,
          paddingTop: 16,
          borderTop: '1px solid #e5e7eb',
          fontSize: 11,
          color: '#9ca3af',
          textAlign: 'center',
        }}
      >
        Site Guardian v0.3.0 — Local-first. No analytics. Open and transparent.
      </div>
    </div>
  );
}
