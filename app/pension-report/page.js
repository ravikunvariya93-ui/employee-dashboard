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

function getDaysFromNow(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const target = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

function getDaysLabel(days, tab) {
  if (days === null) return null;
  if (tab === 'upcoming') {
    if (days < 0) return { text: 'Retired', color: 'badge-gray' };
    if (days === 0) return { text: 'Retiring Today', color: 'badge-red' };
    if (days <= 30) return { text: `${days}d left`, color: 'badge-red' };
    if (days <= 90) return { text: `${Math.ceil(days / 30)}mo left`, color: 'badge-orange' };
    if (days <= 365) return { text: `${Math.ceil(days / 30)}mo left`, color: 'badge-orange' };
    return { text: `${Math.round(days / 365 * 10) / 10}yr left`, color: 'badge-blue' };
  } else {
    const ago = Math.abs(days);
    if (ago <= 30) return { text: `${ago}d ago`, color: 'badge-orange' };
    if (ago <= 365) return { text: `${Math.ceil(ago / 30)}mo ago`, color: 'badge-blue' };
    return { text: `${Math.round(ago / 365 * 10) / 10}yr ago`, color: 'badge-gray' };
  }
}

function getUrgencyColor(days, tab) {
  if (tab === 'upcoming') {
    if (days === null || days < 0) return '';
    if (days <= 30) return 'pension-row-critical';
    if (days <= 90) return 'pension-row-urgent';
    if (days <= 180) return 'pension-row-soon';
    return '';
  }
  return '';
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Cases', color: '' },
  { value: 'not_initiated', label: 'Not Initiated', color: 'badge-gray' },
  { value: 'Submitted to TPEO', label: 'Submitted to TPEO', color: 'badge-blue' },
  { value: 'Queried by TPEO', label: 'Queried by TPEO', color: 'badge-red' },
  { value: 'Submitted to DPEO', label: 'Submitted to DPEO', color: 'badge-blue' },
  { value: 'Queried by DPEO', label: 'Queried by DPEO', color: 'badge-red' },
  { value: 'Submitted to DPPF', label: 'Submitted to DPPF', color: 'badge-blue' },
  { value: 'Queried by DPPF', label: 'Queried by DPPF', color: 'badge-red' },
  { value: 'Approved', label: 'Approved', color: 'badge-green' },
];

function getCaseStatus(id) {
  if (typeof window === 'undefined') return 'pending';
  const data = JSON.parse(localStorage.getItem('pension_cases') || '{}');
  return data[id] || 'pending';
}

function setCaseStatus(id, status) {
  const data = JSON.parse(localStorage.getItem('pension_cases') || '{}');
  data[id] = status;
  localStorage.setItem('pension_cases', JSON.stringify(data));
}

function getPensionNote(id) {
  if (typeof window === 'undefined') return '';
  const data = JSON.parse(localStorage.getItem('pension_notes') || '{}');
  return data[id] || '';
}

function setPensionNote(id, note) {
  const data = JSON.parse(localStorage.getItem('pension_notes') || '{}');
  data[id] = note;
  localStorage.setItem('pension_notes', JSON.stringify(data));
}

export default function PensionReportPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState('upcoming');
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [taluka, setTaluka] = useState('');
  const [page, setPage] = useState(1);

  const [statusFilter, setStatusFilter] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [noteValue, setNoteValue] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const savedRole = localStorage.getItem('user_role');
    if (!savedRole) {
      router.replace('/login');
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  const TALUKA_LIST = [
    'Bhavnagar', 'Gariadhar', 'Ghogha', 'Jesar', 'Mahuva',
    'Palitana', 'Shihor', 'Talaja', 'Umrala', 'Vallabhipur',
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab,
        search,
        taluka,
        page: String(page),
        limit: '100',
      });
      const res = await fetch(`/api/pension?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setEmployees(json.data || []);
      setStats(json.stats || {});
      setPagination(json.pagination || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tab, search, taluka, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => { setPage(1); }, [tab, search, taluka]);

  const filteredEmployees = employees.filter(emp => {
    if (!statusFilter) return true;
    const s = emp.proposal_status || 'not_initiated';
    return s === statusFilter;
  });

  function handleStatusChange(id, newStatus) {
    setCaseStatus(id, newStatus);
    setTick(t => t + 1);
  }

  function handleNoteEdit(id) {
    setNoteValue(getPensionNote(id));
    setEditingNote(id);
  }

  function handleNoteSave(id) {
    setPensionNote(id, noteValue);
    setEditingNote(null);
    setTick(t => t + 1);
  }

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
            <div className="topbar-title">📊 Pension Report</div>
            <div className="topbar-subtitle">Retirement tracking & case management report</div>
          </div>
          <div className="topbar-actions">
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              As of {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="page-container" style={{ paddingTop: '1.5rem' }}>

          {/* Stats Row */}
          <div className="pension-stats-row fade-in">
            <div className="pension-stat-card pension-stat-red">
              <div className="pension-stat-icon">⚡</div>
              <div className="pension-stat-body">
                <div className="pension-stat-value">{stats.upcoming6mo ?? '…'}</div>
                <div className="pension-stat-label">Retiring in 6 Months</div>
              </div>
            </div>
            <div className="pension-stat-card pension-stat-orange">
              <div className="pension-stat-icon">📅</div>
              <div className="pension-stat-body">
                <div className="pension-stat-value">{stats.upcoming2yr ?? '…'}</div>
                <div className="pension-stat-label">Retiring in 2 Years</div>
              </div>
            </div>
            <div className="pension-stat-card pension-stat-blue">
              <div className="pension-stat-icon">🎓</div>
              <div className="pension-stat-body">
                <div className="pension-stat-value">{stats.recent1yr ?? '…'}</div>
                <div className="pension-stat-label">Retired This Year</div>
              </div>
            </div>
            <div className="pension-stat-card pension-stat-purple">
              <div className="pension-stat-icon">📂</div>
              <div className="pension-stat-body">
                <div className="pension-stat-value">{stats.recent2yr ?? '…'}</div>
                <div className="pension-stat-label">Retired Last 2 Years</div>
              </div>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="pension-tabs fade-in stagger-1">
            <button
              className={`pension-tab ${tab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setTab('upcoming')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Upcoming Retirements
              {stats.upcoming2yr > 0 && (
                <span className="pension-tab-badge">{stats.upcoming2yr}</span>
              )}
            </button>
            <button
              className={`pension-tab ${tab === 'recent' ? 'active' : ''}`}
              onClick={() => setTab('recent')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Recently Retired
              {stats.recent2yr > 0 && (
                <span className="pension-tab-badge pension-tab-badge-gray">{stats.recent2yr}</span>
              )}
            </button>
          </div>

          {/* Main Table Card */}
          <div className="table-card fade-in stagger-2">
            <div className="table-header">
              <div>
                <div className="table-title">
                  {tab === 'upcoming' && '📅 Upcoming Retirements (Next 2 Years)'}
                  {tab === 'recent' && '🏛️ Recently Retired (Last 2 Years)'}
                </div>
                <div className="table-meta">
                  {(pagination.total ?? 0)} records found
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
                    placeholder="Search name or code…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: 200 }}
                  />
                </div>

                <select className="filter-select" value={taluka} onChange={e => setTaluka(e.target.value)}>
                  <option value="">All Talukas</option>
                  {TALUKA_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="loading-overlay">
                <div className="loading-spinner" style={{ borderTopColor: 'var(--accent-primary)', borderColor: 'var(--border)', width: 32, height: 32 }}/>
                <span>Loading report data…</span>
              </div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Employee</th>
                      <th>Taluka / School</th>
                      <th>Designation</th>
                      <th>{tab === 'upcoming' ? 'Retirement Date' : 'Retired On'}</th>
                      <th>{tab === 'upcoming' ? 'Time Left' : 'Time Since'}</th>
                      <th>Pension Case</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp, idx) => {
                      const days = getDaysFromNow(emp.retirement_date);
                      const dayLabel = getDaysLabel(days, tab);
                      const urgency = getUrgencyColor(days, tab);

                      return (
                        <tr key={emp.id} className={urgency}>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {(page - 1) * 100 + idx + 1}
                          </td>
                          <td>
                            <Link href={`/employees/${emp.id}?from=report`} className="pension-emp-link">
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                                  {emp.name_english}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  #{emp.teacher_code}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{emp.taluka}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {emp.school_name}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.78rem' }}>{emp.designation || '—'}</span>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.82rem', fontWeight: 500, color: tab === 'upcoming' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                              {formatDate(emp.retirement_date)}
                            </div>
                          </td>
                          <td>
                            {dayLabel && (
                              <span className={`badge ${dayLabel.color}`}>{dayLabel.text}</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${
                              !emp.proposal_status ? 'badge-gray' : (emp.proposal_status === 'Approved' ? 'badge-green' : (emp.proposal_status.startsWith('Queried') ? 'badge-red' : 'badge-blue'))
                            }`}>
                              {emp.proposal_status || 'Not Initiated'}
                            </span>
                          </td>
                          <td>
                            <Link href={`/employees/${emp.id}?from=report`} className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}>
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {pagination.totalPages > 1 && (
              <div className="table-footer">
                <span className="table-meta">
                  Showing {(page - 1) * 100 + 1}–{Math.min(page * 100, pagination.total)} of {pagination.total}
                </span>
                <div className="pagination">
                  <button className="page-btn" disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>‹</button>
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      className={`page-btn ${p === page ? 'active' : ''}`}
                      onClick={() => setPage(p)}
                    >{p}</button>
                  ))}
                  <button className="page-btn" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>›</button>
                </div>
              </div>
            )}
          </div>

          <div className="pension-legend fade-in stagger-3">
            <div className="pension-legend-item">
              <div className="pension-legend-dot" style={{ background: 'rgba(239,68,68,0.18)' }}/>
              <span>Retiring within 30 days — Critical</span>
            </div>
            <div className="pension-legend-item">
              <div className="pension-legend-dot" style={{ background: 'rgba(245,158,11,0.15)' }}/>
              <span>Retiring within 90 days — Urgent</span>
            </div>
            <div className="pension-legend-item">
              <div className="pension-legend-dot" style={{ background: 'rgba(59,130,246,0.10)' }}/>
              <span>Retiring within 6 months — Attention needed</span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
