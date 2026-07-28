'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

const TALUKA_LIST = [
  'BHAVNAGAR', 'GARIYADHAR', 'GHOGHA', 'JESAR', 'MAHUVA',
  'PALITANA', 'SHIHOR', 'TALAJA', 'UMRALA', 'VALLBHIPUR',
];

function checkIsApprovedFn(p) {
  return p.status === 'Approved' || p.status?.startsWith('Settled');
}

function getProposalYearHelper(p) {
  const tryDate = p.retirement_date || p.worksheet_date || p.created_at || '';
  if (!tryDate) return null;
  const dmy = String(tryDate).match(/^\d{2}-\d{2}-(\d{4})/);
  if (dmy) return parseInt(dmy[1]);
  const isoMatch = String(tryDate).match(/^(\d{4})-\d{2}-\d{2}/);
  if (isoMatch) return parseInt(isoMatch[1]);
  if (tryDate instanceof Date || (typeof tryDate === 'string' && tryDate.length > 7)) {
    const d = new Date(tryDate);
    if (!isNaN(d.getTime())) return d.getFullYear();
  }
  return null;
}

export const dynamic = 'force-dynamic';

function ProposalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'pending';
  const urlYear = searchParams.get('year') ? parseInt(searchParams.get('year')) : null;
  const urlHandler = searchParams.get('handler') || null;

  const [authChecked, setAuthChecked] = useState(false);
  const [role, setRole] = useState(null);
  const [userTaluka, setUserTaluka] = useState(null);
  const [userSalarySchool, setUserSalarySchool] = useState(null);

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const [subTab, setSubTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [taluka, setTaluka] = useState('');

  // Sync state if initialTab changes in URL
  useEffect(() => {
    setSubTab(initialTab);
  }, [initialTab]);

  // Auth check
  useEffect(() => {
    const savedRole = localStorage.getItem('user_role');
    if (!savedRole) {
      router.replace('/login');
    } else {
      setRole(savedRole);
      setUserTaluka(localStorage.getItem('user_taluka'));
      setUserSalarySchool(localStorage.getItem('user_salary_school'));
      setAuthChecked(true);
    }
  }, [router]);

  // Fetch proposals
  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proposals');
      const json = await res.json();
      if (json.success) setProposals(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProposals(); }, [fetchProposals]);

  const checkIsPendingAction = (p) => {
    if (checkIsApprovedFn(p)) return false;
    if (role === 'TPEO') return p.current_handler === 'TPEO' && p.taluka?.toUpperCase() === userTaluka?.toUpperCase();
    if (role === 'DPEO') return p.current_handler === 'DPEO';
    if (role === 'Salary School') return p.current_handler === 'Salary School';
    if (role === 'DPPF') return p.current_handler === 'DPPF' || p.current_handler === 'DPPF / Settle';
    return false;
  };

  // Role-scoped proposals
  const roleScopedProposals = proposals.filter((p) => {
    if (role === 'TPEO' && userTaluka) {
      return p.taluka?.toUpperCase() === userTaluka.toUpperCase();
    }
    return true;
  });

  // Filtered by tab + search + taluka + year query + handler query
  const filteredProposals = roleScopedProposals.filter((p) => {
    const isApproved = checkIsApprovedFn(p);
    if (subTab === 'pending' && isApproved) return false;
    if (subTab === 'approved' && !isApproved) return false;

    // Filter by year query param
    if (urlYear) {
      const pYear = getProposalYearHelper(p);
      if (pYear !== urlYear) return false;
    }

    // Filter by handler query param
    if (urlHandler) {
      if (urlHandler === 'Approved') {
        if (!isApproved) return false;
      } else {
        if (p.current_handler !== urlHandler) return false;
      }
    }

    const matchesSearch =
      !search ||
      p.teacher_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(p.teacher_code).includes(search) ||
      p.worksheet_no?.toLowerCase().includes(search.toLowerCase());

    const matchesTaluka = !taluka || p.taluka?.toUpperCase() === taluka?.toUpperCase();
    return matchesSearch && matchesTaluka;
  });

  const pendingCount  = roleScopedProposals.filter(p => !checkIsApprovedFn(p)).length;
  const approvedCount = roleScopedProposals.filter(checkIsApprovedFn).length;
  const totalCount    = roleScopedProposals.length;

  const handleDelete = async (prop) => {
    if (!window.confirm(`Delete pension proposal for ${prop.teacher_name}?\n\nThis cannot be undone.`)) return;
    setDeletingId(prop.id);
    try {
      const res = await fetch(`/api/proposals?id=${prop.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) fetchProposals();
      else alert('Failed to delete: ' + (json.error || 'Unknown'));
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const TABS = [
    { key: 'pending',  label: 'Pending Proposals',  icon: '⏳', count: pendingCount,  accent: '#ea580c' },
    { key: 'approved', label: 'Approved Proposals', icon: '✅', count: approvedCount, accent: '#16a34a' },
    { key: 'all',      label: 'All Proposals',      icon: '📋', count: totalCount,    accent: '#2563eb' },
  ];
  const activeTab = TABS.find(t => t.key === subTab) || TABS[0];

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="topbar-title">📋 Pension Proposals</div>
            <div className="topbar-subtitle">
              {role === 'TPEO'
                ? `Showing proposals for ${userTaluka} Taluka`
                : 'All pension proposals across the district'}
            </div>
          </div>
          <div className="topbar-actions">
            <button onClick={fetchProposals} className="btn btn-ghost btn-sm" disabled={loading}>
              ⚡ Refresh
            </button>
          </div>
        </div>

        <div className="page-container" style={{ paddingTop: '1.5rem' }}>

          {/* ── Tab Bar ─────────────────────────────────────────────── */}
          <div className="pension-tabs fade-in stagger-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`pension-tab ${subTab === tab.key ? 'active' : ''}`}
                onClick={() => {
                  setSubTab(tab.key);
                  router.push(`/proposals?tab=${tab.key}`);
                }}
              >
                {tab.icon} {tab.label}
                {tab.count > 0 && (
                  <span className="pension-tab-badge" style={{
                    background: subTab === tab.key ? tab.accent : '#94a3b8',
                    color: 'white'
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Table Card ──────────────────────────────────────────── */}
          <div className="table-card fade-in stagger-2">
            <div className="table-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', width: '100%' }}>
                <div>
                  <div className="table-title">
                    {urlYear || urlHandler ? (
                      <span>
                        🎯 Filtered Proposals ({urlYear ? `Year ${urlYear}` : ''} {urlHandler ? `· ${urlHandler}` : ''})
                      </span>
                    ) : (
                      <span>{activeTab.icon} {activeTab.label}</span>
                    )}
                  </div>
                  <div className="table-meta">
                    {filteredProposals.length} records found
                    {(urlYear || urlHandler || search || taluka) && (
                      <button
                        onClick={() => {
                          setSearch('');
                          setTaluka('');
                          router.push(`/proposals?tab=${subTab}`);
                        }}
                        className="btn btn-ghost btn-sm"
                        style={{ marginLeft: '0.75rem', padding: '0.1rem 0.4rem', fontSize: '0.72rem', color: '#ea580c' }}
                      >
                        Reset Filters ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Toolbar */}
                <div className="table-toolbar">
                  <div className="search-wrapper">
                    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      className="search-input"
                      placeholder="Search name, code, letter..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{ width: 220 }}
                    />
                  </div>

                  {role === 'TPEO' ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.3rem 0.75rem', borderRadius: '8px',
                      background: '#fff7ed', border: '1.5px solid #ea580c',
                      color: '#ea580c', fontWeight: 600, fontSize: '0.78rem',
                    }}>
                      📍 {userTaluka} Taluka
                    </span>
                  ) : (
                    <select className="filter-select" value={taluka} onChange={e => setTaluka(e.target.value)}>
                      <option value="">All Talukas</option>
                      {TALUKA_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="loading-overlay">
                <div className="loading-spinner" style={{ borderTopColor: 'var(--accent-primary)', borderColor: 'var(--border)', width: 32, height: 32 }}/>
                <span>Loading proposals…</span>
              </div>
            ) : filteredProposals.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📁</div>
                <div className="empty-title">No proposals found</div>
                <p>No proposals match your current filter.</p>
                <button
                  onClick={() => { setSearch(''); setTaluka(''); setSubTab('all'); }}
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '0.75rem' }}
                >
                  Show All Proposals
                </button>
              </div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Employee</th>
                      <th>Taluka</th>
                      <th>Current Status</th>
                      <th>Current Handler</th>
                      <th style={{ width: 110 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProposals.map((prop, idx) => {
                      const isPendingAction = checkIsPendingAction(prop);
                      const isApproved = checkIsApprovedFn(prop);
                      return (
                        <tr key={prop.id} className={isPendingAction ? 'pension-row-urgent' : ''}>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{idx + 1}</td>
                          <td>
                            <Link href={`/employees/${prop.teacher_id}`} className="pension-emp-link" style={{ display: 'block' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>{prop.teacher_name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>#{prop.teacher_code}</div>
                            </Link>
                          </td>
                          <td><span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{prop.taluka}</span></td>
                          <td>
                            <span className={`badge ${isApproved ? 'badge-green' : prop.status?.startsWith('Queried') ? 'badge-red' : 'badge-blue'}`}>
                              {prop.status}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                              {prop.current_handler}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                              <Link
                                href={`/employees/${prop.teacher_id}`}
                                className="btn btn-primary btn-sm"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                              >
                                {isPendingAction ? 'Process' : 'View'}
                              </Link>
                              {(role === 'DPEO' || role === 'DPPF') && (
                                <button
                                  title="Delete proposal"
                                  disabled={deletingId === prop.id}
                                  onClick={() => handleDelete(prop)}
                                  style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '28px', height: '28px', borderRadius: '6px',
                                    border: '1px solid #fecaca', background: '#fff',
                                    cursor: deletingId === prop.id ? 'not-allowed' : 'pointer',
                                    color: '#ef4444', transition: 'all 0.15s ease', flexShrink: 0
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                                >
                                  {deletingId === prop.id ? (
                                    <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #fca5a5', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                  ) : (
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polyline points="3 6 5 6 21 6"/>
                                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                      <path d="M10 11v6"/><path d="M14 11v6"/>
                                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                    </svg>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          

        </div>
      </main>
    </div>
  );
}

export default function ProposalsPage() {
  return (
    <React.Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4fbf7' }}>
        <div className="loading-spinner" />
      </div>
    }>
      <ProposalsContent />
    </React.Suspense>
  );
}
