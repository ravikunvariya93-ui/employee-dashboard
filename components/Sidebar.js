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

  const baseNavItems = [
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
      href: '/proposals?tab=pending',
      label: 'Pending Proposals',
      tabKey: 'pending',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
    },
    {
      href: '/proposals?tab=approved',
      label: 'Approved Proposals',
      tabKey: 'approved',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
    },
    {
      href: '/proposals?tab=all',
      label: 'All Proposals',
      tabKey: 'all',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      ),
    },
  ];

  const adminNavItem = {
    href: '/users',
    label: 'User Management',
    isDpeoOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  };

  const navItems = (role === 'DPEO' || role === null) ? [...baseNavItems, adminNavItem] : baseNavItems;

  const handleLogout = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_taluka');
    window.location.href = '/login';
  };

  return (
    <aside className="sidebar" style={{ fontFamily: "'Lexend', sans-serif", borderRight: '1px solid #a7f3d0', display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'space-between', paddingBottom: '1rem', background: '#ffffff' }}>
      <div>
        {/* Sleek Logo Banner */}
        <div className="sidebar-logo" style={{ padding: '1.75rem 1.5rem', borderBottom: '1px solid #a7f3d0', background: 'linear-gradient(to right, #ecfdf5, #ffffff)' }}>
          <div className="logo-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="logo-icon" style={{ fontSize: '1.75rem', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#ffffff', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)' }}>
              🏫
            </div>
            <div>
              <div className="logo-text" style={{ fontWeight: 800, fontSize: '1.08rem', color: '#064e3b', letterSpacing: '-0.02em' }}>EduBVN</div>
              <div className="logo-sub" style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pension Portal</div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav" style={{ padding: '1.5rem 1rem' }}>
          <div className="nav-section-label" style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#047857', letterSpacing: '0.08em', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
            Main Menu
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {navItems.map((item) => {
              let isActive = false;
              if (item.tabKey) {
                // Proposal items: active when on /proposals with matching tab param
                const currentTab = typeof window !== 'undefined'
                  ? new URLSearchParams(window.location.search).get('tab') || 'pending'
                  : 'pending';
                isActive = pathname === '/proposals' && currentTab === item.tabKey;
              } else if (item.href === '/') {
                isActive = pathname === '/';
              } else {
                isActive = pathname !== '/' && pathname.startsWith(item.href.split('?')[0]);
              }
              // Employee detail page: keep dashboard active
              if (pathname.startsWith('/employees/')) {
                if (item.href === '/') {
                  isActive = fromVal !== 'proposals';
                } else if (item.href.startsWith('/proposals')) {
                  isActive = fromVal === 'proposals';
                } else {
                  isActive = false;
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
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: isActive ? '#059669' : '#475569',
                    background: isActive ? '#ecfdf5' : 'transparent',
                    borderLeft: isActive ? '3px solid #059669' : '3px solid transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: isActive ? '#059669' : '#64748b' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.isDpeoOnly && (
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      color: '#ffffff',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '10px',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
                    }}>
                      Admin
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Styled Footer containing User Identity & proper Logout */}
      <div className="sidebar-footer" style={{ padding: '0 1rem', borderTop: '1px solid #a7f3d0', paddingTop: '1.25rem' }}>
        {role ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* User Profile Info Summary Card */}
            <div style={{
              background: '#f0fdf4',
              padding: '0.85rem',
              borderRadius: '12px',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              {/* Profile Avatar Icon Badge */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#d1fae5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.75rem'
              }}>
                {role === 'Salary School' ? 'SS' : (role === 'TPEO' ? 'T' : (role === 'DPEO' ? 'D' : 'DP'))}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#064e3b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                <div style={{ fontSize: '0.68rem', color: '#047857', fontWeight: 500 }}>Role: {role}</div>
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
