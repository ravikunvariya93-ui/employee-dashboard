'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';

function DetailCard({ title, icon, children, style }) {
  return (
    <div className="detail-card" style={style}>
      <div className="detail-card-header">
        {icon}
        {title}
      </div>
      <div className="detail-rows">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, accent }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value" style={accent ? { color: accent } : {}}>
        {value || <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </span>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  // Check if it's YYYY-MM-DD
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

function getRetirementBenefits(emp) {
  if (!emp) return null;
  const isFix = emp.salary_type === 'Fix';
  return { eligible: !isFix, reason: isFix ? 'Fix Salary employee (Contract/Probation period)' : '' };
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [role, setRole] = useState(null);
  const [userTaluka, setUserTaluka] = useState(null);
  
  // Proposal workflow states
  const [proposal, setProposal] = useState(null);
  const [showProposalForm, setShowProposalForm] = useState(false);
  
  // Form fields for Pension Proposal (simplified: only worksheet & remarks)
  const [worksheetNo, setWorksheetNo] = useState('');
  const [worksheetDate, setWorksheetDate] = useState('');
  const [clerkRemarks, setClerkRemarks] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Workflow action remarks
  const [approverRemarks, setApproverRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [backUrl, setBackUrl] = useState('/');
  const [backLabel, setBackLabel] = useState('Pension Dashboard');

  const benefits = getRetirementBenefits(emp);

  const [authChecked, setAuthChecked] = useState(false);

  // Load role & taluka on mount & check authentication
  useEffect(() => {
    const savedRole = localStorage.getItem('user_role');
    if (!savedRole) {
      router.replace('/login');
    } else {
      setRole(savedRole);
      setUserTaluka(localStorage.getItem('user_taluka'));
      setAuthChecked(true);

      if (typeof window !== 'undefined') {
        const from = new URLSearchParams(window.location.search).get('from');
        if (from === 'report') {
          setBackUrl('/pension-report');
          setBackLabel('Pension Report');
        }
      }
    }
  }, [router]);

  // Fetch teacher profile
  useEffect(() => {
    if (!id) return;
    fetch(`/api/employees/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Employee not found');
        return r.json();
      })
      .then((d) => { 
        setEmp(d); 
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [id]);

  // Fetch existing proposal for teacher
  const fetchProposalDetails = useCallback(() => {
    if (!id) return;
    fetch(`/api/proposals?teacher_id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data && d.data.length > 0) {
          const prop = d.data[0];
          setProposal(prop);
          setWorksheetNo(prop.worksheet_no || '');
          setWorksheetDate(prop.worksheet_date || '');
        } else {
          setProposal(null);
        }
      })
      .catch((err) => console.error('Error fetching proposal:', err));
  }, [id]);

  useEffect(() => {
    fetchProposalDetails();
  }, [id, fetchProposalDetails]);

  const handleSaveProposal = (e) => {
    e.preventDefault();
    if (!emp) return;
    setFormSubmitting(true);

    const newHistory = proposal
      ? `${proposal.history || ''}\n[${new Date().toLocaleString('en-IN')}] Resubmitted by Group School. Remarks: ${clerkRemarks || 'No remarks'}`
      : `[${new Date().toLocaleString('en-IN')}] Proposal initiated by Group School. Status: Submitted to TPEO.`;

    const method = proposal ? 'PATCH' : 'POST';
    const endpoint = proposal ? `/api/proposals/${proposal.id}` : '/api/proposals';

    const payload = {
      teacher_id: emp.id,
      teacher_name: emp.name_english,
      teacher_code: emp.teacher_code,
      submitted_by: 'Group School',
      benefit_type: 'Pension',
      worksheet_no: worksheetNo,
      worksheet_date: worksheetDate,
      taluka: emp.taluka,
      status: 'Submitted to TPEO',
      current_handler: 'TPEO',
      history: newHistory,
      remarks: clerkRemarks
    };

    fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((r) => r.json())
      .then((d) => {
        setFormSubmitting(false);
        if (d.success) {
          setShowProposalForm(false);
          setClerkRemarks('');
          fetchProposalDetails();
        } else {
          alert('Failed to submit proposal: ' + d.error);
        }
      })
      .catch((err) => {
        setFormSubmitting(false);
        alert('Error: ' + err.message);
      });
  };

  const handleWorkflowAction = (actionType) => {
    if (!proposal) return;
    
    let nextStatus = '';
    let nextHandler = '';
    let actionLabel = '';
    
    if (actionType === 'tpeo_forward') {
      nextStatus = 'Submitted to DPEO';
      nextHandler = 'DPEO';
      actionLabel = `Forwarded to DPEO by TPEO - ${userTaluka}`;
    } else if (actionType === 'tpeo_query') {
      if (!approverRemarks.trim()) {
        alert('Please specify the query in remarks.');
        return;
      }
      nextStatus = 'Queried by TPEO';
      nextHandler = 'Group School';
      actionLabel = `Query raised by TPEO - ${userTaluka}`;
    } else if (actionType === 'dpeo_approve') {
      nextStatus = 'Approved';
      nextHandler = 'DPPF / Settle';
      actionLabel = 'Approved & forwarded to DPPF by DPEO';
    } else if (actionType === 'dpeo_query') {
      if (!approverRemarks.trim()) {
        alert('Please specify the query in remarks.');
        return;
      }
      nextStatus = 'Queried by DPEO';
      nextHandler = 'TPEO';
      actionLabel = 'Query raised by DPEO (returned to TPEO)';
    } else if (actionType === 'dpeo_dppf_query') {
      if (!approverRemarks.trim()) {
        alert('Please specify the DPPF query in remarks.');
        return;
      }
      nextStatus = 'Queried by DPPF';
      nextHandler = 'TPEO';
      actionLabel = 'DPPF Query written and returned to TPEO by DPEO';
    } else if (actionType === 'dppf_query') {
      if (!approverRemarks.trim()) {
        alert('Please specify the DPPF query in remarks.');
        return;
      }
      nextStatus = 'Queried by DPPF';
      nextHandler = 'TPEO';
      actionLabel = 'Query raised by DPPF Officer (returned to TPEO)';
    } else if (actionType === 'dppf_settle') {
      nextStatus = 'Settled by DPPF';
      nextHandler = 'Completed';
      actionLabel = 'Approved & Settled by DPPF Officer';
    }

    setActionLoading(true);

    const newHistory = `${proposal.history || ''}\n[${new Date().toLocaleString('en-IN')}] ${actionLabel}. Remarks: ${approverRemarks || 'No remarks'}`;

    fetch(`/api/proposals/${proposal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: nextStatus,
        current_handler: nextHandler,
        history: newHistory,
        approved_by: nextStatus === 'Approved' ? 'DPEO' : proposal.approved_by,
        remarks: approverRemarks
      })
    })
      .then((r) => r.json())
      .then((d) => {
        setActionLoading(false);
        if (d.success) {
          setApproverRemarks('');
          fetchProposalDetails();
        } else {
          alert('Failed to perform action: ' + d.error);
        }
      })
      .catch((err) => {
        setActionLoading(false);
        alert('Error: ' + err.message);
      });
  };

  const initials = emp?.name_english
    ? emp.name_english.split(' ').slice(0, 2).map((n) => n[0]).join('')
    : '?';

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <div className="loading-overlay">
            <div className="loading-spinner" />
            Loading employee details...
          </div>
        </main>
      </div>
    );
  }

  if (error || !emp) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <div className="page-container">
            <div className="empty-state">
              <div className="empty-icon">😕</div>
              <div className="empty-title">{error || 'Employee not found'}</div>
              <Link href={backUrl} className="btn btn-primary" style={{ marginTop: '1rem' }}>← Back to {backLabel}</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isTpeoForThisTaluka = role === 'TPEO' && userTaluka?.toUpperCase() === emp?.taluka?.toUpperCase();

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Employee Detail</div>
            <div className="topbar-subtitle">ID #{emp.id}</div>
          </div>
          <div className="topbar-actions">
            <Link href={backUrl} className="btn btn-ghost btn-sm">← Back</Link>
          </div>
        </div>

        <div className="page-container">
          {/* Profile Hero */}
          <div className="profile-hero fade-in">
            <div className="profile-avatar">{initials}</div>
            <div className="profile-info">
              <div className="profile-name">{emp.name_english}</div>
              <div className="profile-name-guj">{emp.name_gujarati}</div>
              <div className="profile-badges">
                <span className={`badge ${emp.salary_type === 'Fix' ? 'badge-orange' : 'badge-green'}`}>
                  {emp.salary_type} Salary
                </span>
                {emp.designation && <span className="badge badge-purple">{emp.designation}</span>}
                {emp.taluka && <span className="badge badge-blue">{emp.taluka}</span>}
                {emp.pay_level && (
                  <span className="badge badge-gray">{emp.pay_level?.trim()} Pay Level</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                {emp.pay_7th ? `₹${Number(emp.pay_7th).toLocaleString()}` : '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>7th Pay Basic</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {emp.pay_6th ? `₹${Number(emp.pay_6th).toLocaleString()}` : '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>6th Pay Basic</div>
            </div>
          </div>

          {/* Detail Cards */}
          <div className="detail-grid">
            <DetailCard
              title="Identity & Codes"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              }
            >
              <DetailRow label="Teacher Code" value={emp.teacher_code} />
              <DetailRow label="PAN Number" value={emp.pan_number} accent="var(--accent-primary)" />
              <DetailRow label="PF Number" value={emp.pf_number} />
              <DetailRow label="Roster Number" value={emp.roster_number} />
              <DetailRow label="Recruitment Type" value={emp.recruitment_type} />
              <DetailRow label="Recruitment Date" value={emp.recruitment_date} />
            </DetailCard>

            <DetailCard
              title="School Information"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              }
            >
              <DetailRow label="School Name" value={emp.school_name} />
              <DetailRow label="Salary School" value={emp.salary_school} />
              <DetailRow label="DISE Code" value={emp.dise_code} />
              <DetailRow label="School Type" value={emp.school_type} />
              <DetailRow label="Taluka" value={emp.taluka} />
            </DetailCard>

            <DetailCard
              title="Salary & Pay"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
            >
              <DetailRow label="Salary Type" value={emp.salary_type} />
              <DetailRow label="Grade Pay" value={emp.grade_pay} />
              <DetailRow label="Pay Type" value={emp.pay_type} />
              <DetailRow label="Pay Level" value={emp.pay_level?.trim()} />
              <DetailRow label="6th Pay Basic" value={emp.pay_6th ? `₹${Number(emp.pay_6th).toLocaleString()}` : null} accent="var(--accent-orange)" />
              <DetailRow label="7th Pay Basic" value={emp.pay_7th ? `₹${Number(emp.pay_7th).toLocaleString()}` : null} accent="var(--accent-green)" />
              <DetailRow label="Higher Pay Scale" value={emp.higher_pay_scale} />
              <DetailRow label="HPS Date 1" value={emp.hps_date_1} />
              <DetailRow label="HPS Date 2" value={emp.hps_date_2} />
              <DetailRow label="HPS Date 3" value={emp.hps_date_3} />
            </DetailCard>

            <DetailCard
              title="Important Dates"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              }
            >
              <DetailRow label="Date of Birth" value={emp.dob} />
              <DetailRow label="Joined District" value={emp.joined_district} />
              <DetailRow label="District Transfer" value={emp.district_transfer} />
              <DetailRow label="Joined School" value={emp.joined_school} />
              <DetailRow label="Full Salary Date" value={emp.full_salary_date} />
              <DetailRow label="Recruitment Date" value={emp.recruitment_date} />
              <DetailRow label="Retirement Date" value={emp.retirement_date} accent="var(--accent-red)" />
            </DetailCard>

            <DetailCard
              title="Personal Information"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
              }
            >
              <DetailRow label="Address" value={emp.address} />
              <DetailRow label="Origin / Hometown" value={emp.origin} />
              <DetailRow label="House Advance" value={emp.house_advance} />
              <DetailRow label="Remarks" value={emp.remarks} />
            </DetailCard>

            {/* Extended Pension Proposal Section (Full Width) */}
            <DetailCard
              title="Pension Proposal & Settlement"
              style={{ gridColumn: '1 / -1' }}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              }
            >
              {proposal && !showProposalForm ? (
                /* CASE: Proposal Exists & Not Editing */
                <div style={{ padding: '0.25rem 0' }}>
                  <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Proposal Status:</span>
                    <span className={`badge ${
                      proposal.status === 'Approved' || proposal.status?.startsWith('Settled') ? 'badge-green' : (proposal.status?.startsWith('Queried') ? 'badge-red' : 'badge-blue')
                    }`}>
                      {proposal.status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem 1rem', padding: '0.5rem 0' }}>
                    <DetailRow label="Current Handler" value={proposal.current_handler} accent="var(--accent-primary)" />
                    <DetailRow label="Worksheet No." value={proposal.worksheet_no || 'Pending'} accent="var(--accent-orange)" />
                    <DetailRow label="Worksheet Date" value={formatDate(proposal.worksheet_date)} />
                    <DetailRow label="Submitted By" value={proposal.submitted_by} />
                  </div>

                  {proposal.history && (
                    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-light)', background: 'var(--bg-primary)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action Timeline</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderLeft: '2px solid var(--border)', paddingLeft: '0.75rem', marginLeft: '0.25rem' }}>
                        {proposal.history.split('\n').filter(Boolean).map((line, idx) => (
                          <div key={idx} style={{ position: 'relative', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            <div style={{
                              position: 'absolute',
                              left: '-16px',
                              top: '4px',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: 'var(--accent-primary)',
                              border: '2px solid var(--bg-card)'
                            }} />
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TPEO Actions */}
                  {role === 'TPEO' && proposal.current_handler === 'TPEO' && (
                    <div style={{ padding: '1rem', borderTop: '1px solid var(--border-light)', background: 'rgba(59, 130, 246, 0.02)' }}>
                      {!isTpeoForThisTaluka ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--accent-red)', fontWeight: 500, textAlign: 'center' }}>
                          ⚠️ This employee belongs to {emp.taluka} Taluka. Only TPEO - {emp.taluka} can process this proposal.
                        </div>
                      ) : (
                        <form onSubmit={(e) => { e.preventDefault(); }}>
                          <div style={{ marginBottom: '0.75rem' }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Officer Remarks / Query Details</label>
                            <textarea
                              placeholder="Enter action remarks or query details..."
                              className="search-input"
                              style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.78rem', height: '50px' }}
                              value={approverRemarks}
                              onChange={(e) => setApproverRemarks(e.target.value)}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button type="button" disabled={actionLoading} onClick={() => handleWorkflowAction('tpeo_query')} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)', borderColor: 'rgba(239,68,68,0.3)' }}>
                              ↩ Raise Query & Return
                            </button>
                            <button type="button" disabled={actionLoading} onClick={() => handleWorkflowAction('tpeo_forward')} className="btn btn-primary btn-sm">
                              Forward to DPEO ➔
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* DPEO Actions */}
                  {role === 'DPEO' && proposal.current_handler === 'DPEO' && (
                    <div style={{ padding: '1rem', borderTop: '1px solid var(--border-light)', background: 'rgba(59, 130, 246, 0.02)' }}>
                      <form onSubmit={(e) => { e.preventDefault(); }}>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>DPEO Remarks / Query Details</label>
                          <textarea
                            placeholder="Enter remarks or queries (including DPPF queries)..."
                            className="search-input"
                            style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.78rem', height: '50px' }}
                            value={approverRemarks}
                            onChange={(e) => setApproverRemarks(e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
                            <button type="button" disabled={actionLoading} onClick={() => handleWorkflowAction('dpeo_query')} className="btn btn-ghost btn-sm" style={{ flex: 1, color: 'var(--accent-orange)', borderColor: 'rgba(245,158,11,0.3)' }}>
                              ↩ Return DPEO Query
                            </button>
                            <button type="button" disabled={actionLoading} onClick={() => handleWorkflowAction('dpeo_dppf_query')} className="btn btn-ghost btn-sm" style={{ flex: 1, color: 'var(--accent-red)', borderColor: 'rgba(239,68,68,0.3)' }}>
                              ↩ Record DPPF Query & Return
                            </button>
                          </div>
                          <button type="button" disabled={actionLoading} onClick={() => handleWorkflowAction('dpeo_approve')} className="btn btn-success btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                            ✓ Approve & Forward to DPPF (Settle)
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* DPPF Actions */}
                  {role === 'DPPF' && (proposal.current_handler?.includes('DPPF') || proposal.status === 'Approved' || proposal.status === 'Settled by DPPF') && (
                    <div style={{ padding: '1rem', borderTop: '1px solid var(--border-light)', background: 'rgba(168, 85, 247, 0.03)' }}>
                      <form onSubmit={(e) => { e.preventDefault(); }}>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>DPPF Officer Remarks / Query Details</label>
                          <textarea
                            placeholder="Enter DPPF query details or settlement remarks..."
                            className="search-input"
                            style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.78rem', height: '50px' }}
                            value={approverRemarks}
                            onChange={(e) => setApproverRemarks(e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
                          <button type="button" disabled={actionLoading} onClick={() => handleWorkflowAction('dppf_query')} className="btn btn-ghost btn-sm" style={{ flex: 1, color: 'var(--accent-red)', borderColor: 'rgba(239,68,68,0.3)' }}>
                            ↩ Raise DPPF Query & Return
                          </button>
                          <button type="button" disabled={actionLoading} onClick={() => handleWorkflowAction('dppf_settle')} className="btn btn-success btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                            ✓ Finalize & Settle Pension
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Group School Resubmit Actions */}
                  {role === 'Group School' && proposal.current_handler === 'Group School' && (
                    <div style={{ padding: '1rem', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--accent-red)', fontWeight: 500, textAlign: 'center', marginBottom: '0.25rem' }}>
                        ↩ TPEO has queried this proposal. Please make required changes and resubmit.
                      </div>
                      <button onClick={() => setShowProposalForm(true)} className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                        📝 Edit & Resubmit Proposal
                      </button>
                    </div>
                  )}

                  {/* General waiting states */}
                  {proposal.status !== 'Approved' && proposal.current_handler !== role && (
                    <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)' }}>
                      ⏳ Awaiting action from current handler: <strong>{proposal.current_handler}</strong>.
                    </div>
                  )}

                  {proposal.status === 'Approved' && (
                    <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.78rem', color: 'var(--accent-green)', fontWeight: 600, borderTop: '1px solid var(--border-light)', background: 'rgba(16, 185, 129, 0.02)' }}>
                      🎉 Pension proposal approved & settled. Sent to DPPF.
                    </div>
                  )}
                </div>
              ) : (
                /* CASE: No Proposal Yet OR Editing mode */
                <div>
                  {benefits && !benefits.eligible ? (
                    <div style={{ padding: '1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      ⚠️ {benefits.reason}
                    </div>
                  ) : benefits ? (
                    <>
                      {!showProposalForm ? (
                        /* Default display: initiate action */
                        <>
                          <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {role === 'Group School' ? (
                              <button onClick={() => setShowProposalForm(true)} className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                                📁 Initiate Pension Proposal
                              </button>
                            ) : role ? (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                                ⚠️ No pension proposal has been submitted yet for this employee by the Group School.
                              </div>
                            ) : (
                              <Link href="/login" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                                🔒 Sign In as Group School to Propose
                              </Link>
                            )}
                          </div>
                        </>
                      ) : (
                        /* Group School Submission Form (Worksheet & Remarks only) */
                        <form onSubmit={handleSaveProposal} style={{ padding: '1rem', borderTop: '1px solid var(--border-light)' }}>
                          <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '6px', marginBottom: '1rem', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>School Proposal Info</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Taluka: <strong>{emp.taluka}</strong></div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Worksheet Number</label>
                              <input
                                type="text"
                                className="search-input"
                                placeholder="WS-BHV-101"
                                style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.78rem' }}
                                value={worksheetNo}
                                onChange={(e) => setWorksheetNo(e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Worksheet Date</label>
                              <input
                                type="date"
                                className="search-input"
                                style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.78rem' }}
                                value={worksheetDate}
                                onChange={(e) => setWorksheetDate(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Remarks</label>
                            <textarea
                              placeholder="Submission remarks / justifications..."
                              className="search-input"
                              style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.78rem', height: '60px', resize: 'vertical' }}
                              value={clerkRemarks}
                              onChange={(e) => setClerkRemarks(e.target.value)}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setShowProposalForm(false)} className="btn btn-ghost btn-sm">Cancel</button>
                            <button type="submit" disabled={formSubmitting} className="btn btn-primary btn-sm">{formSubmitting ? 'Submitting...' : 'Submit Proposal'}</button>
                          </div>
                        </form>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </DetailCard>
          </div>
        </div>
      </main>
    </div>
  );
}
