'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

function getRetirementYear(p) {
  const tryDate = p.worksheet_date || p.created_at || '';
  if (!tryDate) return null;
  const isoMatch = String(tryDate).match(/^(\d{4})-\d{2}-\d{2}/);
  if (isoMatch) return parseInt(isoMatch[1]);
  const dmy = String(tryDate).match(/^\d{2}-\d{2}-(\d{4})/);
  if (dmy) return parseInt(dmy[1]);
  if (tryDate instanceof Date || (typeof tryDate === 'string' && tryDate.length > 7)) {
    const d = new Date(tryDate);
    if (!isNaN(d.getTime())) return d.getFullYear();
  }
  return null;
}

export default function PensionDashboardPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [yearFilter, setYearFilter] = useState(null);
  const [handlerFilter, setHandlerFilter] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Authenticated user context
  const [role, setRole] = useState(null);
  const [userTaluka, setUserTaluka] = useState(null);
  const [userSalarySchool, setUserSalarySchool] = useState(null);

  // Retire employee list (from teachers table, shown when clicking "No. of Employees" in summary)
  const [retireYear, setRetireYear] = useState(null);      // active year clicked
  const [retireEmployees, setRetireEmployees] = useState([]); // fetched teachers
  const [retireLoading, setRetireLoading] = useState(false);

  const TALUKA_LIST = [
    'BHAVNAGAR', 'GARIYADHAR', 'GHOGHA', 'JESAR', 'MAHUVA',
    'PALITANA', 'SHIHOR', 'TALAJA', 'UMRALA', 'VALLBHIPUR',
  ];

  // Fetch role, taluka, and salary school
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

  // Fetch teachers retiring in a specific year or total (from teachers table)
  const fetchRetireEmployees = useCallback(async (yr) => {
    setRetireLoading(true);
    try {
      let queryParams = [`limit=1000`];
      if (yr === 'Total') {
        queryParams.push(`years=2026,2027,2028`);
      } else if (yr) {
        queryParams.push(`year=${yr}`);
      }
      if (role === 'TPEO' && userTaluka) {
        queryParams.push(`taluka=${encodeURIComponent(userTaluka)}`);
      }
      if (role === 'Salary School' && userSalarySchool) {
        queryParams.push(`salary_school=${encodeURIComponent(userSalarySchool)}`);
      }
      const res = await fetch(`/api/pension?${queryParams.join('&')}`);
      const json = await res.json();
      setRetireEmployees(json.data || []);
    } catch (err) {
      console.error(err);
      setRetireEmployees([]);
    } finally {
      setRetireLoading(false);
    }
  }, [role, userTaluka, userSalarySchool]);

  // Toggle retire employees list for a given year
  const handleYearEmployeesClick = useCallback((yr) => {
    if (retireYear === yr) {
      // Deselect — go back to proposals view
      setRetireYear(null);
      setRetireEmployees([]);
    } else {
      setRetireYear(yr);
      setYearFilter(null);
      setHandlerFilter(null);
      fetchRetireEmployees(yr);
    }
  }, [retireYear, fetchRetireEmployees]);

  const checkIsApproved = (p) => p.status === 'Approved' || p.status?.startsWith('Settled');

  // Jurisdiction rule scoping for summary table proposal counts
  const roleScopedProposals = proposals.filter((p) => {
    if (role === 'TPEO' && userTaluka) {
      return p.taluka?.toUpperCase() === userTaluka.toUpperCase();
    }
    if (role === 'Salary School' && userSalarySchool) {
      return p.salary_school?.toUpperCase() === userSalarySchool.toUpperCase();
    }
    return true;
  });

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
            <div className="topbar-subtitle">
              {role === 'TPEO'
                ? `Jurisdiction: TPEO - ${userTaluka || 'Taluka'} (Employees of ${userTaluka || 'Taluka'} Taluka)`
                : role === 'Salary School'
                ? `Jurisdiction: Salary School - ${userSalarySchool || 'Pay Center'} (Schools under ${userSalarySchool || 'Pay Center'})`
                : role === 'DPEO' || role === 'DPPF'
                ? `Jurisdiction: ${role} (All District Employees under DPEO & DPPF)`
                : 'Pending and Approved Pension Proposals workflow management'}
            </div>
          </div>
          <div className="topbar-actions">
            <button onClick={fetchProposals} className="btn btn-ghost btn-sm" disabled={loading}>
              ⚡ Refresh
            </button>
          </div>
        </div>

        <div className="page-container" style={{ paddingTop: '1.5rem' }}>

          {/* ── Year-wise Retirement Summary Table (Interactive Filter) ────── */}
          <RetirementSummaryTable
            proposals={roleScopedProposals}
            yearFilter={yearFilter}
            setYearFilter={setYearFilter}
            handlerFilter={handlerFilter}
            setHandlerFilter={setHandlerFilter}
            role={role}
            userTaluka={userTaluka}
            userSalarySchool={userSalarySchool}
            retireYear={retireYear}
            onYearEmployeesClick={handleYearEmployeesClick}
          />

          {/* ── Show retire employees list OR proposals depending on what was clicked ── */}
          {retireYear ? (
            /* ── Retire Employees Table (from teachers table) ────────────── */
            <div className="table-card fade-in stagger-2">
              <div className="table-header">
                <div>
                  <div className="table-title">
                    👥 Employees Retiring {retireYear === 'Total' ? 'in Total (All Years)' : `in ${retireYear}`}
                  </div>
                  <div className="table-meta">
                    {retireLoading ? 'Loading…' : `${retireEmployees.length} employees found`}
                    <button
                      onClick={() => { setRetireYear(null); setRetireEmployees([]); }}
                      className="btn btn-ghost btn-sm"
                      style={{ marginLeft: '0.75rem', padding: '0.1rem 0.5rem', fontSize: '0.72rem', color: '#ea580c' }}
                    >
                      ← Back to Proposals
                    </button>
                  </div>
                </div>
              </div>

              {retireLoading ? (
                <div className="loading-overlay">
                  <div className="loading-spinner" style={{ borderTopColor: 'var(--accent-primary)', borderColor: 'var(--border)', width: 32, height: 32 }}/>
                  <span>Loading employees…</span>
                </div>
              ) : retireEmployees.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <div className="empty-title">No employees found</div>
                  <p>No employees have retirement date in {retireYear}.</p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Employee</th>
                        <th>Taluka</th>
                        <th>School</th>
                        <th>Retirement Date</th>
                        <th>Proposal Status</th>
                        <th style={{ width: 80 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retireEmployees.map((emp, idx) => (
                        <tr key={emp.id}>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{idx + 1}</td>
                          <td>
                            <Link href={`/employees/${emp.id}`} className="pension-emp-link" style={{ display: 'block' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>{emp.name_english}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>#{emp.teacher_code}</div>
                            </Link>
                          </td>
                          <td><span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{emp.taluka}</span></td>
                          <td><span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{emp.school_name || '—'}</span></td>
                          <td>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ea580c' }}>
                              {emp.retirement_date || '—'}
                            </span>
                          </td>
                          <td>
                            {emp.proposal_status ? (
                              <span className={`badge ${
                                emp.proposal_status === 'Approved' || emp.proposal_status?.startsWith('Settled')
                                  ? 'badge-green'
                                  : emp.proposal_status?.startsWith('Queried')
                                  ? 'badge-red'
                                  : 'badge-blue'
                              }`}>{emp.proposal_status}</span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No proposal</span>
                            )}
                          </td>
                          <td>
                            <Link href={`/employees/${emp.id}`} className="btn btn-primary btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}>
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

const SUMMARY_YEARS = [2026, 2027, 2028];

function RetirementSummaryTable({ proposals, role, userTaluka, userSalarySchool, retireYear, onYearEmployeesClick }) {
  const router = useRouter();

  // Actual teacher retirement counts per year (from teachers table via API)
  const [teacherCounts, setTeacherCounts] = useState({});
  const [countsLoading, setCountsLoading] = useState(true);

  useEffect(() => {
    async function fetchTeacherCounts() {
      setCountsLoading(true);
      try {
        let queryParams = [];
        if (role === 'TPEO' && userTaluka) {
          queryParams.push(`taluka=${encodeURIComponent(userTaluka)}`);
        }
        if (role === 'Salary School' && userSalarySchool) {
          queryParams.push(`salary_school=${encodeURIComponent(userSalarySchool)}`);
        }
        const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
        const res = await fetch(`/api/pension/summary${queryString}`);
        const json = await res.json();
        if (json.success && json.data) {
          const map = {};
          json.data.forEach(d => { map[d.year] = d.total_employees; });
          setTeacherCounts(map);
        }
      } catch (e) {
        console.error('Failed to fetch teacher retirement counts', e);
      } finally {
        setCountsLoading(false);
      }
    }
    if (role) fetchTeacherCounts();
  }, [role, userTaluka, userSalarySchool]);

  function getProposalYear(p) {
    // Match proposals to employee's retirement year (or worksheet_date / created_at fallback)
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

  const yearStats = useMemo(() => {
    return SUMMARY_YEARS.map(yr => {
      // "No. of Employees Retired / To be Retired" = actual count from teachers table
      const totalEmployees = teacherCounts[yr] ?? '…';
      // Proposal stats from proposals table
      const yearProps = proposals.filter(p => getProposalYear(p) === yr);
      const proposalPrepared = yearProps.length;
      const approved = yearProps.filter(p => p.status === 'Approved' || p.status?.startsWith('Settled')).length;
      const pending = yearProps.filter(p => p.status !== 'Approved' && !p.status?.startsWith('Settled'));
      const pendingSalarySchool = pending.filter(p => p.current_handler === 'Salary School').length;
      const pendingTPEO = pending.filter(p => p.current_handler === 'TPEO').length;
      const pendingDPEO = pending.filter(p => p.current_handler === 'DPEO').length;
      const pendingDPPF = pending.filter(p => p.current_handler === 'DPPF' || p.current_handler === 'DPPF / Settle').length;
      return { yr, totalEmployees, proposalPrepared, approved, pendingSalarySchool, pendingTPEO, pendingDPEO, pendingDPPF };
    });
  }, [proposals, teacherCounts]);

  const totals = useMemo(() => yearStats.reduce((acc, r) => ({
    totalEmployees: acc.totalEmployees + (typeof r.totalEmployees === 'number' ? r.totalEmployees : 0),
    proposalPrepared: acc.proposalPrepared + r.proposalPrepared,
    approved: acc.approved + r.approved,
    pendingSalarySchool: acc.pendingSalarySchool + r.pendingSalarySchool,
    pendingTPEO: acc.pendingTPEO + r.pendingTPEO,
    pendingDPEO: acc.pendingDPEO + r.pendingDPEO,
    pendingDPPF: acc.pendingDPPF + r.pendingDPPF,
  }), { totalEmployees: 0, proposalPrepared: 0, approved: 0, pendingSalarySchool: 0, pendingTPEO: 0, pendingDPEO: 0, pendingDPPF: 0 }), [yearStats]);

  const handleSelectYear = (yr) => {
    router.push(`/proposals?tab=all&year=${yr}`);
  };

  const handleSelectHandler = (yr, handler) => {
    if (handler === 'Approved') {
      router.push(`/proposals?tab=approved&year=${yr}`);
    } else {
      router.push(`/proposals?tab=pending&handler=${handler}&year=${yr}`);
    }
  };

  return (
    <div className="fade-in stagger-1" style={{
      marginBottom: '1.5rem',
      borderRadius: '8px',
      border: '1px solid #d4d4d4',
      overflow: 'hidden',
      background: '#ffffff',
      fontFamily: "'Segoe UI', Aptos, -apple-system, BlinkMacSystemFont, Roboto, sans-serif"
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          borderCollapse: 'collapse',
          width: '100%',
          fontSize: '0.82rem',
          color: '#242424',
          background: '#ffffff'
        }}>
          <thead>
            {/* Row 1 Header: Main Titles */}
            <tr style={{ background: '#059669', color: '#ffffff' }}>
              <th rowSpan={2} style={excelMainThStyle({ width: 80, borderRight: '2px solid #047857' })}>
                Year
              </th>
              <th rowSpan={2} style={excelMainThStyle({ minWidth: 140, borderRight: '1px solid #10b981' })}>
                No. of Employees<br />Retired / To be Retired
              </th>
              <th rowSpan={2} style={excelMainThStyle({ minWidth: 120, borderRight: '1px solid #10b981' })}>
                Proposal<br />Prepared
              </th>
              <th rowSpan={2} style={excelMainThStyle({ minWidth: 100, borderRight: '2px solid #047857' })}>
                Approved
              </th>
              <th colSpan={4} style={excelMainThStyle({ background: '#059669', borderBottom: '1px solid #10b981' })}>
                Pending at
              </th>
            </tr>

            {/* Row 2 Header: Pending sub-headers */}
            <tr style={{ background: '#059669', color: '#ffffff' }}>
              {['Salary School', 'TPEO', 'DPEO', 'DPPF'].map((label, idx) => (
                <th key={label} style={excelSubThStyle({
                  borderLeft: idx === 0 ? '2px solid #047857' : '1px solid #10b981'
                })}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {yearStats.map((row, idx) => {
              return (
                <tr key={row.yr} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f0fdf4' }}>
                  {/* Year — plain label, no click */}
                  <td
                    style={excelTdStyle({
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#064e3b',
                      background: '#ecfdf5',
                      borderRight: '2px solid #a7f3d0',
                    })}
                  >
                    {row.yr}
                  </td>

                  {/* No. of Employees — fetches actual teacher list from teachers table */}
                  <td
                    onClick={() => onYearEmployeesClick(row.yr)}
                    title="Click to view the full list of employees retiring this year"
                    style={excelTdStyle({
                      textAlign: 'center',
                      fontWeight: 700,
                      color: retireYear === row.yr ? '#059669' : '#064e3b',
                      background: retireYear === row.yr ? '#d1fae5' : undefined,
                      cursor: typeof row.totalEmployees === 'number' && row.totalEmployees > 0 ? 'pointer' : 'default',
                      textDecoration: typeof row.totalEmployees === 'number' && row.totalEmployees > 0 ? 'underline' : 'none',
                    })}
                  >
                    {row.totalEmployees}
                  </td>

                  {/* Proposal Prepared */}
                  <td
                    onClick={() => handleSelectYear(row.yr)}
                    title="Click to view concerned proposals prepared"
                    style={excelTdStyle({ textAlign: 'center', color: '#059669', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' })}
                  >
                    {row.proposalPrepared || '—'}
                  </td>

                  {/* Approved */}
                  <td
                    onClick={() => handleSelectHandler(row.yr, 'Approved')}
                    title="Click to view approved concerned employees"
                    style={excelTdStyle({
                      textAlign: 'center',
                      color: '#047857',
                      fontWeight: row.approved ? 600 : 400,
                      borderRight: '2px solid #a7f3d0',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    })}
                  >
                    {row.approved || '—'}
                  </td>

                  {/* Salary School */}
                  <td
                    onClick={() => handleSelectHandler(row.yr, 'Salary School')}
                    title="Click to filter concerned employees pending at Salary School"
                    style={excelTdStyle({
                      textAlign: 'center',
                      color: '#059669',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    })}
                  >
                    {row.pendingSalarySchool || '—'}
                  </td>

                  {/* TPEO */}
                  <td
                    onClick={() => handleSelectHandler(row.yr, 'TPEO')}
                    title="Click to filter concerned employees pending at TPEO"
                    style={excelTdStyle({
                      textAlign: 'center',
                      color: '#059669',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    })}
                  >
                    {row.pendingTPEO || '—'}
                  </td>

                  {/* DPEO */}
                  <td
                    onClick={() => handleSelectHandler(row.yr, 'DPEO')}
                    title="Click to filter concerned employees pending at DPEO"
                    style={excelTdStyle({
                      textAlign: 'center',
                      color: '#059669',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    })}
                  >
                    {row.pendingDPEO || '—'}
                  </td>

                  {/* DPPF */}
                  <td
                    onClick={() => handleSelectHandler(row.yr, 'DPPF')}
                    title="Click to filter concerned employees pending at DPPF"
                    style={excelTdStyle({
                      textAlign: 'center',
                      color: '#059669',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    })}
                  >
                    {row.pendingDPPF || '—'}
                  </td>
                </tr>
              );
            })}

            {/* Total Row — each cell clickable like per-year cells */}
            <tr style={{ background: '#ecfdf5', borderTop: '2px solid #059669', borderBottom: '3px double #047857' }}>
              {/* TOTAL label — plain, no click */}
              <td style={excelTdStyle({ textAlign: 'center', fontWeight: 800, color: '#064e3b', borderRight: '2px solid #a7f3d0', letterSpacing: '0.04em' })}>
                TOTAL
              </td>

              {/* No. of Employees total — click to view total list of retiring employees */}
              <td
                onClick={() => onYearEmployeesClick('Total')}
                title="Click to view total list of employees retiring across all years"
                style={excelTdStyle({
                  textAlign: 'center',
                  fontWeight: 800,
                  color: retireYear === 'Total' ? '#047857' : '#059669',
                  background: retireYear === 'Total' ? '#d1fae5' : undefined,
                  fontSize: '0.9rem',
                  cursor: typeof totals.totalEmployees === 'number' && totals.totalEmployees > 0 ? 'pointer' : 'default',
                  textDecoration: typeof totals.totalEmployees === 'number' && totals.totalEmployees > 0 ? 'underline' : 'none',
                })}
              >
                {totals.totalEmployees}
              </td>

              {/* Proposal Prepared total — click to show all proposals (clear filters) */}
              <td
                onClick={() => { router.push('/proposals?tab=all'); }}
                title="Click to show all proposals across all years"
                style={excelTdStyle({ textAlign: 'center', fontWeight: 800, color: '#059669', cursor: 'pointer', textDecoration: 'underline' })}
              >
                {totals.proposalPrepared}
              </td>

              {/* Approved total */}
              <td
                onClick={() => { router.push('/proposals?tab=approved'); }}
                title="Click to show all approved proposals"
                style={excelTdStyle({ textAlign: 'center', fontWeight: 800, color: '#047857', borderRight: '2px solid #a7f3d0', cursor: 'pointer', textDecoration: 'underline' })}
              >
                {totals.approved}
              </td>

              {/* Salary School total */}
              <td
                onClick={() => { router.push('/proposals?tab=pending&handler=Salary School'); }}
                title="Click to show all pending at Salary School"
                style={excelTdStyle({ textAlign: 'center', fontWeight: 800, color: '#059669', cursor: 'pointer', textDecoration: 'underline' })}
              >
                {totals.pendingSalarySchool}
              </td>

              {/* TPEO total */}
              <td
                onClick={() => { router.push('/proposals?tab=pending&handler=TPEO'); }}
                title="Click to show all pending at TPEO"
                style={excelTdStyle({ textAlign: 'center', fontWeight: 800, color: '#059669', cursor: 'pointer', textDecoration: 'underline' })}
              >
                {totals.pendingTPEO}
              </td>

              {/* DPEO total */}
              <td
                onClick={() => { router.push('/proposals?tab=pending&handler=DPEO'); }}
                title="Click to show all pending at DPEO"
                style={excelTdStyle({ textAlign: 'center', fontWeight: 800, color: '#059669', cursor: 'pointer', textDecoration: 'underline' })}
              >
                {totals.pendingDPEO}
              </td>

              {/* DPPF total */}
              <td
                onClick={() => { router.push('/proposals?tab=pending&handler=DPPF'); }}
                title="Click to show all pending at DPPF"
                style={excelTdStyle({ textAlign: 'center', fontWeight: 800, color: '#059669', cursor: 'pointer', textDecoration: 'underline' })}
              >
                {totals.pendingDPPF}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Table Style Helper Functions ──────────────────────────────────────────
function excelMainThStyle(extra = {}) {
  return {
    padding: '0.55rem 0.75rem',
    fontWeight: 700,
    fontSize: '0.78rem',
    color: '#ffffff',
    background: '#059669',
    borderRight: '1px solid #10b981',
    borderBottom: '1px solid #10b981',
    whiteSpace: 'nowrap',
    textAlign: 'center',
    verticalAlign: 'middle',
    ...extra
  };
}

function excelSubThStyle(extra = {}) {
  return {
    padding: '0.45rem 0.6rem',
    fontWeight: 600,
    fontSize: '0.75rem',
    color: '#ffffff',
    background: '#059669',
    borderRight: '1px solid #10b981',
    borderBottom: '1px solid #10b981',
    whiteSpace: 'nowrap',
    textAlign: 'center',
    ...extra
  };
}

function excelTdStyle(extra = {}) {
  return {
    padding: '0.5rem 0.75rem',
    borderRight: '1px solid #d1fae5',
    borderBottom: '1px solid #d1fae5',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
    ...extra
  };
}


