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
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_taluka');
    window.location.href = '/login';
  };

  return (
    <aside className="sidebar" style={{ fontFamily: "'Lexend', sans-serif", borderRight: '1px solid #dbeafe', display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'space-between', paddingBottom: '1rem' }}>
      <div>
        {/* Sleek Logo Banner */}
        <div className="sidebar-logo" style={{ padding: '1.75rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(to right, #eff6ff, #ffffff)' }}>
          <div className="logo-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="logo-icon" style={{ fontSize: '1.75rem', background: '#3b82f6', color: '#ffffff', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)' }}>
              🏛️
            </div>
            <div>
              <div className="logo-text" style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e3a8a', letterSpacing: '-0.02em' }}>EduBVN</div>
              <div className="logo-sub" style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pension Portal</div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav" style={{ padding: '1.5rem 1rem' }}>
          <div className="nav-section-label" style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
            Main Menu
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: isActive ? '#2563eb' : '#64748b',
                    background: isActive ? '#eff6ff' : 'transparent',
                    borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ color: isActive ? '#2563eb' : '#94a3b8' }}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Styled Footer containing User Identity & proper Logout */}
      <div className="sidebar-footer" style={{ padding: '0 1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
        {role ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* User Profile Info Summary Card */}
            <div style={{
              background: '#f8fafc',
              padding: '0.85rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              {/* Profile Avatar Icon Badge */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: role === 'Group School' ? '#fef3c7' : (role === 'TPEO' ? '#dbeafe' : (role === 'DPEO' ? '#d1fae5' : '#f3e8ff')),
                color: role === 'Group School' ? '#d97706' : (role === 'TPEO' ? '#2563eb' : (role === 'DPEO' ? '#059669' : '#7c3aed')),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.75rem'
              }}>
                {role === 'Group School' ? 'GS' : (role === 'TPEO' ? 'T' : (role === 'DPEO' ? 'D' : 'DP'))}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>Role: {role}</div>
              </div>
            </div>

            {/* Standard Red Sign Out Button */}
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: '10px',
                padding: '0.7rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#b91c1c',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fee2e2';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fef2f2';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="btn btn-primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              borderRadius: '10px',
              padding: '0.75rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: '#2563eb',
              textDecoration: 'none',
              color: '#ffffff'
            }}
          >
            🔒 Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}
