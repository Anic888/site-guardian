import { useState } from 'react';
import { browser } from '@core/browser-api';
import {
  SITE_MODE_LABELS,
  SITE_MODE_DESCRIPTIONS,
  SiteMode,
  PRIVACY_FACTS,
} from '@core/types';
import { markFirstRunComplete } from '@shared/hooks/useMessaging';

const TOTAL_STEPS = 5;

export function App() {
  const [step, setStep] = useState(0);

  function next() {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    }
  }

  function prev() {
    if (step > 0) {
      setStep(step - 1);
    }
  }

  async function finish() {
    try {
      await markFirstRunComplete();
    } catch {
      // Non-critical — extension works without this flag
    }
    // Open the options page and close the onboarding tab
    void browser.runtime.openOptionsPage();
    window.close();
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Progress indicator */}
        <div style={progressBarContainerStyle}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= step ? '#2563eb' : '#e5e7eb',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <div style={{ minHeight: 320 }}>
          {step === 0 && <StepWelcome />}
          {step === 1 && <StepExtensionMonitoring />}
          {step === 2 && <StepModes />}
          {step === 3 && <StepSafeMode />}
          {step === 4 && <StepPrivacy />}
        </div>

        {/* Navigation */}
        <div style={navStyle}>
          {step > 0 ? (
            <button onClick={prev} style={secondaryBtnStyle}>
              Back
            </button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS - 1 ? (
            <button onClick={next} style={primaryBtnStyle}>
              Next
            </button>
          ) : (
            <button onClick={finish} style={primaryBtnStyle}>
              Get Started
            </button>
          )}
        </div>
      </div>

      {/* Skip link */}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={finish} style={skipBtnStyle}>
          Skip and go to settings
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

function StepWelcome() {
  return (
    <div>
      <h1 style={titleStyle}>Welcome to Site Guardian</h1>
      <p style={bodyStyle}>
        Site Guardian gives you control over how this extension behaves on every
        website you visit.
      </p>

      <div style={featureListStyle}>
        <Feature
          title="Extension monitor"
          desc="See which extensions are active on every page."
        />
        <Feature
          title="Conflict detection"
          desc="Get warned when extensions might clash."
        />
        <Feature
          title="Troubleshoot mode"
          desc="One click to find which extension breaks a site."
        />
        <Feature
          title="Full transparency"
          desc="Every permission explained. Every setting visible."
        />
      </div>

      <p style={{ ...bodyStyle, marginTop: 20 }}>
        This takes about 30 seconds. Let&apos;s walk through the basics.
      </p>
    </div>
  );
}

function StepExtensionMonitoring() {
  return (
    <div>
      <h1 style={titleStyle}>See What Extensions Do</h1>
      <p style={bodyStyle}>
        Site Guardian monitors all your installed extensions and shows you
        exactly which ones are active on each page.
      </p>

      <div style={{ ...highlightBoxStyle, marginTop: 16, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1e40af', margin: '0 0 8px 0' }}>
          What you get:
        </h3>
        <ul style={listStyle}>
          <li>List of extensions injecting scripts on the current page</li>
          <li>Risk assessment for each extension (Low / Medium / High)</li>
          <li>Conflict warnings when multiple extensions overlap</li>
          <li>One-click enable/disable for any extension</li>
          <li>Troubleshoot Mode to find the culprit fast</li>
        </ul>
      </div>

      <p style={{ ...bodyStyle, marginTop: 16, fontSize: 12 }}>
        Extension analysis is done entirely on your device. Your extension list
        is never sent anywhere.
      </p>
    </div>
  );
}

function StepModes() {
  const modes = [SiteMode.Normal, SiteMode.Safe, SiteMode.Disabled] as const;

  return (
    <div>
      <h1 style={titleStyle}>Three Modes, Your Choice</h1>
      <p style={bodyStyle}>
        Every site runs in one of three modes. You pick which one, or let the
        global default apply.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        {modes.map((mode) => (
          <div key={mode} style={modeCardStyle}>
            <div style={modeCardDotStyle(mode)} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
                {SITE_MODE_LABELS[mode]}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                {SITE_MODE_DESCRIPTIONS[mode]}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p style={{ ...bodyStyle, marginTop: 16, fontSize: 12 }}>
        You can change modes anytime from the extension popup.
      </p>
    </div>
  );
}

function StepSafeMode() {
  return (
    <div>
      <h1 style={titleStyle}>Safe Mode Explained</h1>
      <p style={bodyStyle}>
        If a website isn&apos;t working right and you suspect the extension might
        be the cause, switch to Safe Mode.
      </p>

      <div style={highlightBoxStyle}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#854d0e', margin: '0 0 8px 0' }}>
          What Safe Mode does:
        </h3>
        <ul style={listStyle}>
          <li>Disables content script injection</li>
          <li>Blocks DOM interaction with the page</li>
          <li>Keeps monitoring and diagnostics active</li>
          <li>The page behaves as if the extension were not installed</li>
        </ul>
      </div>

      <p style={{ ...bodyStyle, marginTop: 16 }}>
        If problems go away in Safe Mode, the extension was likely the cause.
        If problems persist, another extension or the site itself may be the issue.
      </p>

      <p style={{ ...bodyStyle, fontSize: 12 }}>
        Safe Mode is set per-site. It won&apos;t affect other websites.
      </p>
    </div>
  );
}

function StepPrivacy() {
  return (
    <div>
      <h1 style={titleStyle}>Privacy First</h1>
      <p style={bodyStyle}>
        Site Guardian is built with a strict privacy-first architecture.
      </p>

      <div
        style={{
          marginTop: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {PRIVACY_FACTS.map((fact) => (
          <div key={fact} style={privacyFactStyle}>
            <span style={{ color: '#16a34a', flexShrink: 0 }}>{'\u2713'}</span>
            <span style={{ fontSize: 13, color: '#374151' }}>{fact}</span>
          </div>
        ))}
      </div>

      <p style={{ ...bodyStyle, marginTop: 20, fontWeight: 500 }}>
        You can review all permissions, storage details, and privacy
        information anytime from Settings.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small components
// ---------------------------------------------------------------------------

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ color: '#2563eb', fontSize: 16, flexShrink: 0, marginTop: 1 }}>
        {'\u25CF'}
      </span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{title}</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>{desc}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: 24,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  background: '#f8f9fa',
};

const cardStyle: React.CSSProperties = {
  maxWidth: 520,
  width: '100%',
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  padding: '28px 32px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const progressBarContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginBottom: 28,
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 24,
  paddingTop: 20,
  borderTop: '1px solid #f3f4f6',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  background: '#f3f4f6',
  color: '#374151',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

const skipBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#9ca3af',
  fontSize: 12,
  cursor: 'pointer',
  textDecoration: 'underline',
};

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: '#111827',
  margin: '0 0 8px 0',
};

const bodyStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#6b7280',
  lineHeight: '22px',
  margin: '0 0 0 0',
};

const featureListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  marginTop: 20,
};

const MODE_DOT_COLORS: Record<SiteMode, string> = {
  [SiteMode.Normal]: '#16a34a',
  [SiteMode.Safe]: '#eab308',
  [SiteMode.Disabled]: '#9ca3af',
};

const modeCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  padding: '12px 14px',
  background: '#f9fafb',
  borderRadius: 8,
  border: '1px solid #f3f4f6',
};

function modeCardDotStyle(mode: SiteMode): React.CSSProperties {
  return {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: MODE_DOT_COLORS[mode],
    flexShrink: 0,
    marginTop: 5,
  };
}

const highlightBoxStyle: React.CSSProperties = {
  marginTop: 16,
  padding: '14px 16px',
  background: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: 8,
};

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 13,
  color: '#374151',
  lineHeight: '22px',
};

const privacyFactStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  background: '#f0fdf4',
  borderRadius: 6,
};
