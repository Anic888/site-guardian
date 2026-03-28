import { useState, useEffect, useRef } from 'react';
import type { TroubleshootSession } from '@core/types';
import {
  startTroubleshoot,
  stopTroubleshoot,
} from '@shared/hooks/useMessaging';

interface TroubleshootPanelProps {
  session: TroubleshootSession | null;
  onChanged: () => void;
}

export function TroubleshootPanel({ session, onChanged }: TroubleshootPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const isActive = session?.active === true;

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      await startTroubleshoot();
      if (mountedRef.current) onChanged();
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to start');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  async function handleStop() {
    setLoading(true);
    setError(null);
    try {
      await stopTroubleshoot();
      if (mountedRef.current) onChanged();
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to stop');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  if (isActive) {
    return (
      <div
        style={{
          padding: '10px 12px',
          background: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: 8,
          marginBottom: 8,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>
          Troubleshoot Mode Active
        </div>
        <div style={{ fontSize: 11, color: '#92400e', marginTop: 4, lineHeight: '16px' }}>
          {session.disabledExtensionIds.length} extension{session.disabledExtensionIds.length === 1 ? '' : 's'} temporarily disabled.
          If the site works now, one of them was causing the problem.
        </div>
        <button
          onClick={handleStop}
          disabled={loading}
          style={{
            marginTop: 8,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            background: '#fff',
            border: '1px solid #fde68a',
            borderRadius: 6,
            color: '#92400e',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Restoring...' : 'End Troubleshoot & Restore'}
        </button>
        {error && (
          <div style={{ marginTop: 6, fontSize: 11, color: '#dc2626' }}>{error}</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0 8px' }}>
      <button
        onClick={handleStart}
        disabled={loading}
        style={{
          width: '100%',
          padding: '8px 14px',
          fontSize: 12,
          fontWeight: 600,
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          color: '#374151',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Starting...' : 'Troubleshoot — Disable All Other Extensions'}
      </button>
      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>
        Temporarily disables all other extensions to find the culprit.
      </div>
      {error && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#dc2626', padding: '4px 8px', background: '#fef2f2', borderRadius: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}
