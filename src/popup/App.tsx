import { browser } from '@core/browser-api';
import { useTabStatus, useTroubleshootSession } from '@shared/hooks/useMessaging';
import { CollapsibleSection } from '@shared/ui/CollapsibleSection';
import { SiteStatus } from './components/SiteStatus';
import { ModeSelector } from './components/ModeSelector';
import { DiagnosticsSummary } from './components/DiagnosticsSummary';
import { ExtensionList } from './components/ExtensionList';
import { TroubleshootPanel } from './components/TroubleshootPanel';
import { PageHealthCard } from './components/PageHealthCard';

export function App() {
  const { data: status, loading, error, refetch } = useTabStatus();
  const troubleshoot = useTroubleshootSession();

  function openOptions() {
    void browser.runtime.openOptionsPage();
  }

  function refetchAll() {
    refetch();
    troubleshoot.refetch();
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 400,
        maxHeight: 580,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
          Site Guardian
        </div>
        <button
          onClick={openOptions}
          title="Settings"
          aria-label="Open settings"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            color: '#6b7280',
            padding: '2px 4px',
            borderRadius: 4,
            lineHeight: 1,
          }}
        >
          {'\u2699\uFE0F'}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            Loading...
          </div>
        )}

        {error && (
          <div style={{ padding: '16px 0' }}>
            <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 13 }}>
              <div style={{ fontWeight: 600 }}>Something went wrong</div>
              <div style={{ marginTop: 4, fontSize: 12 }}>{error}</div>
            </div>
            <button onClick={refetchAll} style={{ marginTop: 8, padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 12, width: '100%' }}>
              Retry
            </button>
          </div>
        )}

        {status && (
          <>
            <SiteStatus status={status} />

            {status.isWebPage && (
              <>
                {/* Troubleshoot */}
                <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />
                <TroubleshootPanel session={troubleshoot.data ?? null} onChanged={refetchAll} />

                {/* Extensions — always open */}
                {status.extensionReport && (
                  <>
                    <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />
                    <ExtensionList report={status.extensionReport} onChanged={refetchAll} />
                  </>
                )}

                {/* Page Health — open by default */}
                {status.pageHealth && (
                  <>
                    <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />
                    <PageHealthCard health={status.pageHealth} />
                  </>
                )}

                {/* Site Mode — collapsed by default */}
                <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />
                <CollapsibleSection title="Site Mode" defaultOpen={false}>
                  <ModeSelector
                    hostname={status.hostname}
                    currentMode={status.effectiveMode}
                    hasExplicitRule={status.hasExplicitRule}
                    onModeChanged={refetchAll}
                  />
                </CollapsibleSection>

                {/* Diagnostics — collapsed by default */}
                <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />
                <CollapsibleSection title="Diagnostics" defaultOpen={false}>
                  <DiagnosticsSummary diagnostics={status.diagnostics} />
                </CollapsibleSection>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={openOptions}
          style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Settings &amp; Extension Dashboard
        </button>
      </div>
    </div>
  );
}
