import { useState, type ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  badge,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ padding: '8px 0' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: 0,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          marginBottom: open ? 8 : 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {title}
          </span>
          {badge}
        </div>
        <span style={{ fontSize: 10, color: '#9ca3af' }}>
          {open ? '\u25B2' : '\u25BC'}
        </span>
      </button>
      {open && children}
    </div>
  );
}
