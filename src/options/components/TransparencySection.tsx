import { PERMISSION_EXPLANATIONS, PRIVACY_FACTS } from '@core/types';

export function TransparencySection() {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={headingStyle}>Transparency &amp; Privacy</h2>
      <p style={descStyle}>
        Site Guardian is designed to be fully transparent. Here is exactly what
        this extension can and cannot do.
      </p>

      {/* Privacy facts */}
      <div style={cardStyle}>
        <h3 style={subheadingStyle}>Privacy Commitment</h3>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {PRIVACY_FACTS.map((fact) => (
            <li
              key={fact}
              style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}
            >
              {fact}
            </li>
          ))}
        </ul>
      </div>

      {/* Permission explanations */}
      <div style={{ ...cardStyle, marginTop: 12 }}>
        <h3 style={subheadingStyle}>Permissions Explained</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PERMISSION_EXPLANATIONS.map((perm) => (
            <div
              key={perm.permission}
              style={{
                padding: '10px 12px',
                background: '#f9fafb',
                borderRadius: 6,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                <code
                  style={{
                    background: '#e5e7eb',
                    padding: '1px 6px',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  {perm.permission}
                </code>
              </div>
              <div style={{ fontSize: 12, color: '#374151', marginTop: 6 }}>
                <strong>Why:</strong> {perm.reason}
              </div>
              <div style={{ fontSize: 12, color: '#374151', marginTop: 3 }}>
                <strong>Allows:</strong> {perm.capability}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                <strong>Does NOT allow:</strong> {perm.limitation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What is stored */}
      <div style={{ ...cardStyle, marginTop: 12 }}>
        <h3 style={subheadingStyle}>What Is Stored</h3>
        <div style={{ fontSize: 13, color: '#374151' }}>
          <p style={{ margin: '0 0 8px 0' }}>
            All data is stored locally in your browser using the standard
            extension storage API. Nothing is sent externally.
          </p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li style={{ marginBottom: 4 }}>
              <strong>Global settings</strong> — your default mode preference
            </li>
            <li style={{ marginBottom: 4 }}>
              <strong>Site rules</strong> — per-site mode overrides you have set
            </li>
            <li>
              <strong>Extension state</strong> — install date and last active
              timestamp (for internal use only)
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

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

const subheadingStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: '#111827',
  margin: '0 0 10px 0',
};

const cardStyle: React.CSSProperties = {
  padding: '16px',
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
};
