'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

export default function EmployeesPage() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [taluka, setTaluka] = useState('');
  const [salaryType, setSalaryType] = useState('');
  const [payLevel, setPayLevel] = useState('');
  const [retirementWithin, setRetirementWithin] = useState('');
  const [sort, setSort] = useState('id');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [talukas, setTalukas] = useState([]);

  // Fetch talukas for filter
  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => setTalukas(d.byTaluka?.map((t) => t.taluka) || []));
  }, []);

  const fetchData = useCallback((params) => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: params.page,
      limit: 50,
      search: params.search,
      taluka: params.taluka,
      salary_type: params.salaryType,
      pay_level: params.payLevel,
      retirement_within: params.retirementWithin,
      sort: params.sort,
      order: params.order,
    });
    fetch(`/api/employees?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d.data || []);
        setPagination(d.pagination || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const debouncedFetch = useMemo(() => debounce(fetchData, 400), [fetchData]);

  useEffect(() => {
    debouncedFetch({ page, search, taluka, salaryType, payLevel, retirementWithin, sort, order });
  }, [page, search, taluka, salaryType, payLevel, retirementWithin, sort, order, debouncedFetch]);

  const handleSort = (col) => {
    if (sort === col) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(col);
      setOrder('asc');
    }
    setPage(1);
  };

  const SortIcon = ({ col }) => {
    if (sort !== col) return <span style={{ color: 'var(--text-muted)' }}> ↕</span>;
    return <span style={{ color: 'var(--accent-primary)' }}>{order === 'asc' ? ' ↑' : ' ↓'}</span>;
  };

  const handleExport = async () => {
    const qs = new URLSearchParams({ page: 1, limit: 9999, search, taluka, salary_type: salaryType, pay_level: payLevel, retirement_within: retirementWithin });
    const res = await fetch(`/api/employees?${qs}`);
    const json = await res.json();
    const rows = json.data || [];
    if (!rows.length) return;

    const headers = ['ID', 'Name (English)', 'Name (Gujarati)', 'Taluka', 'School', 'Designation', 'Salary Type', 'Grade Pay', '7th Pay', 'PAN', 'DOB', 'Joined School', 'Retirement Date'];
    const csvRows = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.id, `"${r.name_english || ''}"`, `"${r.name_gujarati || ''}"`,
          r.taluka, `"${r.school_name || ''}"`, `"${r.designation || ''}"`,
          r.salary_type, `"${r.grade_pay || ''}"`, r.pay_7th || '', r.pan_number || '',
          r.dob || '', r.joined_school || '', r.retirement_date || '',
        ].join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teachers_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderPages = () => {
    const pages = [];
    const { totalPages } = pagination;
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    if (start > 1) pages.push(<button key="first" className="page-btn" onClick={() => setPage(1)}>1</button>);
    if (start > 2) pages.push(<span key="dots1" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>…</span>);
    for (let i = start; i <= end; i++) {
      pages.push(
        <button key={i} className={`page-btn ${i === page ? 'active' : ''}`} onClick={() => setPage(i)}>{i}</button>
      );
    }
    if (end < totalPages - 1) pages.push(<span key="dots2" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>…</span>);
    if (end < totalPages) pages.push(<button key="last" className="page-btn" onClick={() => setPage(totalPages)}>{totalPages}</button>);
    return pages;
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Employees</div>
            <div className="topbar-subtitle">
              {pagination.total ? `${pagination.total.toLocaleString()} total records` : 'Loading...'}
            </div>
          </div>
          <div className="topbar-actions">
            <button onClick={handleExport} className="btn btn-ghost btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        <div className="page-container">
          <div className="table-card">
            {/* Toolbar */}
            <div className="table-header">
              <div>
                <div className="table-title">All Employees</div>
                <div className="table-meta">Page {page} of {pagination.totalPages || 1}</div>
              </div>
              <div className="table-toolbar">
                <div className="search-wrapper">
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search name, code, PAN..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    id="employee-search"
                  />
                </div>

                <select className="filter-select" value={taluka} onChange={(e) => { setTaluka(e.target.value); setPage(1); }}>
                  <option value="">All Talukas</option>
                  {talukas.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>

                <select className="filter-select" value={salaryType} onChange={(e) => { setSalaryType(e.target.value); setPage(1); }}>
                  <option value="">All Salary Types</option>
                  <option value="Fix">Fix</option>
                  <option value="Full">Full</option>
                </select>

                <select className="filter-select" value={payLevel} onChange={(e) => { setPayLevel(e.target.value); setPage(1); }}>
                  <option value="">All Pay Levels</option>
                  <option value="Low">Low</option>
                  <option value="High">High</option>
                </select>

                <select className="filter-select" value={retirementWithin} onChange={(e) => { setRetirementWithin(e.target.value); setPage(1); }}>
                  <option value="">All Retirement Dates</option>
                  <option value="1">Retiring within 1 Year</option>
                  <option value="2">Retiring within 2 Years</option>
                  <option value="3">Retiring within 3 Years</option>
                  <option value="4">Retiring within 4 Years</option>
                  <option value="5">Retiring within 5 Years</option>
                </select>

                {(search || taluka || salaryType || payLevel || retirementWithin) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setTaluka(''); setSalaryType(''); setPayLevel(''); setRetirementWithin(''); setPage(1); }}>
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="table-scroll">
              {loading ? (
                <div className="loading-overlay">
                  <div className="loading-spinner" />
                  Loading employees...
                </div>
              ) : data.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <div className="empty-title">No employees found</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Try adjusting your search or filters</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('id')} className={sort === 'id' ? 'sorted' : ''}>#<SortIcon col="id" /></th>
                      <th onClick={() => handleSort('name_english')} className={sort === 'name_english' ? 'sorted' : ''}>Name<SortIcon col="name_english" /></th>
                      <th onClick={() => handleSort('taluka')} className={sort === 'taluka' ? 'sorted' : ''}>Taluka<SortIcon col="taluka" /></th>
                      <th>School</th>
                      <th>Designation</th>
                      <th onClick={() => handleSort('salary_type')} className={sort === 'salary_type' ? 'sorted' : ''}>Salary<SortIcon col="salary_type" /></th>
                      <th onClick={() => handleSort('pay_7th')} className={sort === 'pay_7th' ? 'sorted' : ''}>7th Pay<SortIcon col="pay_7th" /></th>
                      <th>PAN</th>
                      <th onClick={() => handleSort('dob')} className={sort === 'dob' ? 'sorted' : ''}>DOB<SortIcon col="dob" /></th>
                      <th onClick={() => handleSort('retirement_date')} className={sort === 'retirement_date' ? 'sorted' : ''}>Retirement<SortIcon col="retirement_date" /></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((emp) => (
                      <tr key={emp.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{emp.id}</td>
                        <td className="name-cell" style={{ maxWidth: '200px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name_english}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name_gujarati}</div>
                        </td>
                        <td>{emp.taluka}</td>
                        <td title={emp.school_name}>{emp.school_name?.substring(0, 22)}{emp.school_name?.length > 22 ? '…' : ''}</td>
                        <td>{emp.designation || '—'}</td>
                        <td>
                          <span className={`badge ${emp.salary_type === 'Fix' ? 'badge-orange' : 'badge-green'}`}>
                            {emp.salary_type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500, color: 'var(--accent-green)' }}>
                          {emp.pay_7th ? `₹${Number(emp.pay_7th).toLocaleString()}` : '—'}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{emp.pan_number || '—'}</td>
                        <td>{emp.dob || '—'}</td>
                        <td>{emp.retirement_date || '—'}</td>
                        <td>
                          <Link href={`/employees/${emp.id}`} className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', borderRadius: '4px' }}>View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {!loading && data.length > 0 && (
              <div className="table-footer">
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, pagination.total)} of {pagination.total?.toLocaleString()} records
                </div>
                <div className="pagination">
                  <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</button>
                  {renderPages()}
                  <button className="page-btn" onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}>→</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
