'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState(null);
  const [name, setName] = useState('');

  useEffect(() => {
    setRole(localStorage.getItem('user_role'));
    setName(localStorage.getItem('user_name') || '');
  }, []);

  const navItems = [
    {
      href: '/',
      label: 'Dashboard',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      href: '/employees',
      label: 'Employees',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      href: '/seed',
      label: 'Data Import',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-badge">
          <div className="logo-icon">🎓</div>
          <div>
            <div className="logo-text">EduBVN</div>
            <div className="logo-sub">Employee Management</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)) ? 'active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        <div className="nav-section-label" style={{ marginTop: '1.5rem' }}>Quick Info</div>
        <div style={{ padding: '0.5rem 0.75rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>District</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Bhavnagar, Gujarat</div>
        </div>
        <div style={{ padding: '0.25rem 0.75rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Data Source</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Teacher Report XLS</div>
        </div>
      </nav>

      <div className="sidebar-footer">
        {role ? (
          <div style={{
            background: 'var(--bg-primary)',
            padding: '0.65rem 0.75rem',
            borderRadius: '8px',
            marginBottom: '0.75rem',
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: role === 'Clerk' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              color: role === 'Clerk' ? 'var(--accent-orange)' : 'var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.75rem'
            }}>
              {role === 'Clerk' ? 'C' : 'A'}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Role: {role}</div>
            </div>
          </div>
        ) : (
          <Link href="/login" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginBottom: '0.75rem', fontSize: '0.75rem' }}>
            🔒 Sign In
          </Link>
        )}
        <div className="db-status">
          <div className="db-dot" />
          Neon PostgreSQL Connected
        </div>
      </div>
    </aside>
  );
}
