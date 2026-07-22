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

  const [fromVal, setFromVal] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setFromVal(new URLSearchParams(window.location.search).get('from'));
    }
  }, [pathname]);

  const navItems = [
    {
      href: '/',
      label: 'Pension Dashboard',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
    },
    {
      href: '/pension-report',
      label: 'Pension Report',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
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
            <div className="logo-sub">Pension Management</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Main Menu</div>
        {navItems.map((item) => {
          let isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          if (pathname.startsWith('/employees/')) {
            if (item.href === '/pension-report') {
              isActive = fromVal === 'report';
            } else if (item.href === '/') {
              isActive = fromVal !== 'report';
            }
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
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
              background: role === 'Group School' ? 'rgba(245, 158, 11, 0.12)' : (role === 'TPEO' ? 'rgba(59, 130, 246, 0.12)' : (role === 'DPEO' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(168, 85, 247, 0.12)')),
              color: role === 'Group School' ? 'var(--accent-orange)' : (role === 'TPEO' ? 'var(--accent-primary)' : (role === 'DPEO' ? 'var(--accent-green)' : '#a855f7')),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.7rem'
            }}>
              {role === 'Group School' ? 'GS' : (role === 'TPEO' ? 'T' : (role === 'DPEO' ? 'D' : 'DP'))}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Role: {role}</div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('user_role');
                localStorage.removeItem('user_name');
                localStorage.removeItem('user_taluka');
                window.location.reload();
              }}
              title="Sign Out"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                color: 'var(--text-muted)',
                padding: '0.2rem'
              }}
            >
              🚪
            </button>
          </div>
        ) : (
          <Link href="/login" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem' }}>
            🔒 Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}
