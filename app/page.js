'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

// ── helpers ────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
  }
  return dateStr;
}

export default function PensionDashboardPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [subTab, setSubTab] = useState('pending'); // 'pending' | 'approved' | 'all'
  const [filterType, setFilterType] = useState('all'); // 'all' | 'action_required' | 'queried'
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [taluka, setTaluka] = useState('');

  // Authenticated user context
  const [role, setRole] = useState(null);
  const [userTaluka, setUserTaluka] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const TALUKA_LIST = [
    'Bhavnagar', 'Gariadhar', 'Ghogha', 'Jesar', 'Mahuva',
    'Palitana', 'Shihor', 'Talaja', 'Umrala', 'Vallabhipur',
  ];

  // Fetch role and taluka
  useEffect(() => {
    const savedRole = localStorage.getItem('user_role');
    if (!savedRole) {
      router.replace('/login');
    } else {
      setRole(savedRole);
      setUserTaluka(localStorage.getItem('user_taluka'));
      setAuthChecked(true);
    }
  }, [router]);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proposals');
      const json = await res.json();
      if (json.success) {
        setProposals(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleDeleteProposal = async (prop) => {
    const confirmMsg = `Delete pension proposal for ${prop.teacher_name}?\n\nThis action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    setDeletingId(prop.id);
    try {
      const res = await fetch(`/api/proposals/${prop.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setProposals(prev => prev.filter(p => p.id !== prop.id));
      } else {
        alert('Failed to delete: ' + (json.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const checkIsApproved = (p) => {
    return p.status === 'Approved' || p.status?.startsWith('Settled');
  };

  // Helper check for action required
  const checkIsPendingAction = (p) => {
    if (checkIsApproved(p)) return false;
    if (role === 'TPEO') return p.current_handler === 'TPEO' && p.taluka?.toUpperCase() === userTaluka?.toUpperCase();
    if (role === 'DPEO') return p.current_handler === 'DPEO';
    if (role === 'Group School') return p.current_handler === 'Group School';
    if (role === 'DPPF') return p.current_handler === 'DPPF' || p.current_handler === 'DPPF / Settle';
    return false;
  };

  // Client-side filtering
  const filteredProposals = proposals.filter((p) => {
    // 1. Pending vs Approved Tab check
    const isApproved = checkIsApproved(p);
    if (subTab === 'pending' && isApproved) return false;
    if (subTab === 'approved' && !isApproved) return false;

    // 2. Quick Stat Card Filter Types
    if (filterType === 'action_required' && !checkIsPendingAction(p)) return false;
    if (filterType === 'queried' && !p.status?.startsWith('Queried')) return false;

    // 3. Search filter
    const matchesSearch =
      !search ||
      p.teacher_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(p.teacher_code).includes(search) ||
      p.worksheet_no?.toLowerCase().includes(search.toLowerCase());

    // 4. Taluka filter
    const matchesTaluka = !taluka || p.taluka?.toUpperCase() === taluka?.toUpperCase();

    // 5. Role-based visibility
    const matchesRoleTaluka = role !== 'TPEO' || p.taluka?.toUpperCase() === userTaluka?.toUpperCase();

    return matchesSearch && matchesTaluka && matchesRoleTaluka;
  });

  // Stats calculation
  const totalCount = proposals.length;
  const pendingActionCount = proposals.filter(checkIsPendingAction).length;
  const queriedCount = proposals.filter(p => p.status?.startsWith('Queried')).length;
  const approvedCount = proposals.filter(checkIsApproved).length;

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
            <div className="topbar-title">🏛️ Pension Dashboard</div>
            <div className="topbar-subtitle">Pending and Approved Pension Proposals workflow management</div>
          </div>
          <div className="topbar-actions">
            <button onClick={fetchProposals} className="btn btn-ghost btn-sm" disabled={loading}>
              ⚡ Refresh
            </button>
          </div>
        </div>

        <div className="page-container" style={{ paddingTop: '1.5rem' }}>

          {/* ── Stats Row with Interactive Links ──────────────────────── */}
          <div className="pension-stats-row fade-in">
            {/* Total Proposals */}
            <div
              className={`pension-stat-card pension-stat-blue ${subTab === 'all' && filterType === 'all' ? 'active-stat' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => { setSubTab('all'); setFilterType('all'); }}
              title="Click to view all proposals (Total count)"
            >
              <div className="pension-stat-icon">📂</div>
              <div className="pension-stat-body">
                <div className="pension-stat-value" style={{ textDecoration: 'underline', color: 'var(--accent-primary)' }}>
                  {totalCount}
                </div>
                <div className="pension-stat-label">Total Proposals</div>
              </div>
            </div>

            {/* Requires Your Action */}
            <div
              className={`pension-stat-card pension-stat-red ${filterType === 'action_required' ? 'active-stat' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => { setSubTab('pending'); setFilterType('action_required'); }}
              title="Click to filter proposals requiring your action"
            >
              <div className="pension-stat-icon">⚡</div>
              <div className="pension-stat-body">
                <div className="pension-stat-value" style={{ textDecoration: 'underline', color: 'var(--accent-red)' }}>
                  {pendingActionCount}
                </div>
                <div className="pension-stat-label">Requires Your Action</div>
              </div>
            </div>

            {/* Queried Cases */}
            <div
              className={`pension-stat-card pension-stat-orange ${filterType === 'queried' ? 'active-stat' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => { setSubTab('pending'); setFilterType('queried'); }}
              title="Click to filter queried cases"
            >
              <div className="pension-stat-icon">❓</div>
              <div className="pension-stat-body">
                <div className="pension-stat-value" style={{ textDecoration: 'underline', color: 'var(--accent-orange)' }}>
                  {queriedCount}
                </div>
                <div className="pension-stat-label">Queried Cases</div>
              </div>
            </div>

            {/* Approved & Settled */}
            <div
              className={`pension-stat-card pension-stat-green ${subTab === 'approved' ? 'active-stat' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => { setSubTab('approved'); setFilterType('all'); }}
              title="Click to view approved & settled cases"
            >
              <div className="pension-stat-icon">✅</div>
              <div className="pension-stat-body">
                <div className="pension-stat-value" style={{ textDecoration: 'underline', color: 'var(--accent-green)' }}>
                  {approvedCount}
                </div>
                <div className="pension-stat-label">Approved & Settled</div>
              </div>
            </div>
          </div>

          {/* ── Tab Bar ────────────────────────────────────────────────── */}
          <div className="pension-tabs fade-in stagger-1">
            <button
              className={`pension-tab ${subTab === 'pending' ? 'active' : ''}`}
              onClick={() => { setSubTab('pending'); setFilterType('all'); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 16 14"/>
              </svg>
              Pending Proposals
              {(totalCount - approvedCount) > 0 && (
                <span className="pension-tab-badge" style={{ background: 'var(--accent-orange)' }}>
                  {totalCount - approvedCount}
                </span>
              )}
            </button>
            <button
              className={`pension-tab ${subTab === 'approved' ? 'active' : ''}`}
              onClick={() => { setSubTab('approved'); setFilterType('all'); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Approved Proposals
              {approvedCount > 0 && (
                <span className="pension-tab-badge" style={{ background: 'var(--accent-green)', color: 'white' }}>
                  {approvedCount}
                </span>
              )}
            </button>
            <button
              className={`pension-tab ${subTab === 'all' ? 'active' : ''}`}
              onClick={() => { setSubTab('all'); setFilterType('all'); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              All Proposals
              {totalCount > 0 && (
                <span className="pension-tab-badge" style={{ background: 'var(--accent-primary)', color: 'white' }}>
                  {totalCount}
                </span>
              )}
            </button>
          </div>

          {/* ── Main Table Card ────────────────────────────────────────── */}
          <div className="table-card fade-in stagger-2">
            <div className="table-header">
              <div>
                <div className="table-title">
                  {subTab === 'pending' && filterType === 'all' && '📁 Pending Pension Proposals'}
                  {subTab === 'pending' && filterType === 'action_required' && '⚡ Action Required Proposals'}
                  {subTab === 'pending' && filterType === 'queried' && '❓ Queried Pension Cases'}
                  {subTab === 'approved' && '✅ Approved Pension Proposals (Settled)'}
                  {subTab === 'all' && '📂 All Pension Proposals'}
                </div>
                <div className="table-meta">
                  {filteredProposals.length} records found
                  {(filterType !== 'all' || subTab === 'all') && (
                    <button
                      onClick={() => { setSubTab('pending'); setFilterType('all'); }}
                      className="btn btn-ghost btn-sm"
                      style={{ marginLeft: '0.75rem', padding: '0.1rem 0.4rem', fontSize: '0.72rem' }}
                    >
                      Reset Filters ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Toolbar */}
              <div className="table-toolbar">
                {/* Search */}
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

                {/* Taluka filter */}
                <select className="filter-select" value={taluka} onChange={e => setTaluka(e.target.value)}>
                  <option value="">All Talukas</option>
                  {TALUKA_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
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
                <p>There are no proposals matching your current selection.</p>
                <button onClick={() => { setSubTab('all'); setFilterType('all'); setSearch(''); setTaluka(''); }} className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
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
                      <th style={{ width: 100 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProposals.map((prop, idx) => {
                      const isPendingAction = checkIsPendingAction(prop);

                      return (
                        <tr key={prop.id} className={isPendingAction ? 'pension-row-urgent' : ''}>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{idx + 1}</td>
                          <td>
                            <Link href={`/employees/${prop.teacher_id}`} className="pension-emp-link" style={{ display: 'block' }}>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                                  {prop.teacher_name}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  #{prop.teacher_code}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{prop.taluka}</span>
                          </td>
                          <td>
                            <span className={`badge ${
                              checkIsApproved(prop) ? 'badge-green' : (prop.status?.startsWith('Queried') ? 'badge-red' : 'badge-blue')
                            }`}>
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
                              <Link href={`/employees/${prop.teacher_id}`} className="btn btn-primary btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}>
                                {isPendingAction ? 'Process' : 'View'}
                              </Link>
                              {(role === 'DPEO' || role === 'DPPF') && (
                                <button
                                  title="Delete proposal"
                                  disabled={deletingId === prop.id}
                                  onClick={() => handleDeleteProposal(prop)}
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
                                    <span style={{
                                      display: 'inline-block', width: '12px', height: '12px',
                                      border: '2px solid #fca5a5', borderTopColor: '#ef4444',
                                      borderRadius: '50%', animation: 'spin 0.7s linear infinite'
                                    }} />
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

          {/* Help legend */}
          <div className="pension-legend fade-in stagger-3">
            <div className="pension-legend-item">
              <div className="pension-legend-dot" style={{ background: 'rgba(245,158,11,0.15)' }}/>
              <span>Highlight indicates proposal requires action from your role</span>
            </div>
            <div className="pension-legend-item" style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              💡 Click stat numbers to filter proposals
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
