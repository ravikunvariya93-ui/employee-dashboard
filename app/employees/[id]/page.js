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
    return `${d}/${m}/${y}`;
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return dateStr;
}

function formatOfficeNameWithShree(title) {
  if (!title) return title;
  let formatted = title;
  
  // Replace keywords with their "શ્રી" versions if they don't already have it
  formatted = formatted.replace(/(શિક્ષણાધિકારી)(?!શ્રી)/g, '$1શ્રી');
  formatted = formatted.replace(/(મુખ્ય શિક્ષક)(?!શ્રી)/g, '$1શ્રી');
  formatted = formatted.replace(/(નિયામક)(?!શ્રી)/g, '$1શ્રી');
  formatted = formatted.replace(/(કેળવણી નિરીક્ષક)(?!શ્રી)/g, '$1શ્રી');
  formatted = formatted.replace(/(શિક્ષણ નિરીક્ષક)(?!શ્રી)/g, '$1શ્રી');
  
  return formatted;
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
  const [proposalLoading, setProposalLoading] = useState(true);
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

  // Letter View Modal states
  const [viewingLetter, setViewingLetter] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  const benefits = getRetirementBenefits(emp);

  const [authChecked, setAuthChecked] = useState(false);

  // Load role & taluka on mount & check authentication
  useEffect(() => {
    const savedRole = localStorage.getItem('user_role');
    if (!savedRole) {
      router.replace('/login');
    } else {
      const savedTeacherId = localStorage.getItem('user_teacher_id');
      if (savedRole === 'Employee' && String(id) !== String(savedTeacherId)) {
        router.replace(`/employees/${savedTeacherId}`);
        return;
      }

      setRole(savedRole);
      setUserTaluka(localStorage.getItem('user_taluka'));
      setAuthChecked(true);

      if (typeof window !== 'undefined') {
        const from = new URLSearchParams(window.location.search).get('from');
        if (from === 'proposals') {
          setBackUrl('/proposals');
          setBackLabel('Proposals');
        }
      }
    }

    // Fetch system users to get Gujarati office names & stamps for letters
    fetch('/api/users')
      .then(r => r.json())
      .then(d => { if (d.success) setAllUsers(d.users || []); })
      .catch(e => console.error('Users load error:', e));
  }, [router, id]);

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
    setProposalLoading(true);
    fetch(`/api/proposals?teacher_id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data && d.data.length > 0) {
          const prop = d.data[0];
          setProposal(prop);
          setWorksheetNo('');
          setWorksheetDate(prop.worksheet_date || '');
        } else {
          setProposal(null);
        }
      })
      .catch((err) => console.error('Error fetching proposal:', err))
      .finally(() => setProposalLoading(false));
  }, [id]);

  useEffect(() => {
    fetchProposalDetails();
  }, [id, fetchProposalDetails]);

  const handleSaveProposal = (e) => {
    e.preventDefault();
    if (!emp) return;
    setFormSubmitting(true);

    const letterNo = worksheetNo || 'N/A';
    const letterDate = worksheetDate
      ? new Date(worksheetDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'N/A';

    const remarksStr = clerkRemarks && clerkRemarks.trim() && clerkRemarks.trim() !== 'No remarks' ? `. Remarks: ${clerkRemarks.trim()}` : '';
    const newHistory = proposal
      ? `${proposal.history || ''}\n[${new Date().toLocaleString('en-GB')}] Resubmitted by Salary School on ${letterDate} with Letter No. ${letterNo}${remarksStr}`
      : `[${new Date().toLocaleString('en-GB')}] Proposal initiated by Salary School on ${letterDate} with Letter No. ${letterNo}. Status: Submitted to TPEO.${remarksStr}`;

    const method = proposal ? 'PATCH' : 'POST';
    const endpoint = proposal ? `/api/proposals/${proposal.id}` : '/api/proposals';

    const payload = {
      teacher_id: emp.id,
      teacher_name: emp.name_english,
      teacher_code: emp.teacher_code,
      submitted_by: 'Salary School',
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

    // Build letter meta for forwarding labels
    const fmtLetterDate = worksheetDate
      ? new Date(worksheetDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'N/A';
    const fmtLetterNo = worksheetNo || 'N/A';
    
    let nextStatus = '';
    let nextHandler = '';
    let actionLabel = '';
    
    if (actionType === 'tpeo_forward') {
      nextStatus = 'Submitted to DPEO';
      nextHandler = 'DPEO';
      actionLabel = `Forwarded to DPEO by TPEO - ${userTaluka} on ${fmtLetterDate} with Letter No. ${fmtLetterNo}`;
    } else if (actionType === 'tpeo_query') {
      if (!approverRemarks.trim()) {
        alert('Please specify the query in remarks.');
        return;
      }
      nextStatus = 'Queried by TPEO';
      nextHandler = 'Salary School';
      actionLabel = `Query raised by TPEO - ${userTaluka} on ${fmtLetterDate} with Letter No. ${fmtLetterNo}`;
    } else if (actionType === 'dpeo_approve') {
      nextStatus = 'Submitted to DPPF';
      nextHandler = 'DPPF';
      actionLabel = `Forwarded to DPPF by DPEO on ${fmtLetterDate} with Letter No. ${fmtLetterNo}`;
    } else if (actionType === 'dpeo_query') {
      if (!approverRemarks.trim()) {
        alert('Please specify the query in remarks.');
        return;
      }
      nextStatus = 'Queried by DPEO';
      nextHandler = 'TPEO';
      actionLabel = `Query raised by DPEO on ${fmtLetterDate} with Letter No. ${fmtLetterNo}`;
    } else if (actionType === 'dppf_query') {
      if (!approverRemarks.trim()) {
        alert('Please specify the DPPF query in remarks.');
        return;
      }
      nextStatus = 'Queried by DPPF';
      nextHandler = 'DPEO';
      actionLabel = `Query raised by DPPF on ${fmtLetterDate} with Letter No. ${fmtLetterNo}`;
    } else if (actionType === 'dppf_settle') {
      nextStatus = 'Approved';
      nextHandler = 'Completed';
      actionLabel = 'Pension Case Approved by DPPF';
    }

    setActionLoading(true);

    const actionRemarksStr = approverRemarks && approverRemarks.trim() && approverRemarks.trim() !== 'No remarks' ? `. Remarks: ${approverRemarks.trim()}` : '';
    const newHistory = `${proposal.history || ''}\n[${new Date().toLocaleString('en-GB')}] ${actionLabel}${actionRemarksStr}`;

    fetch(`/api/proposals/${proposal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: nextStatus,
        current_handler: nextHandler,
        history: newHistory,
        approved_by: nextStatus === 'Approved' ? 'DPPF' : proposal.approved_by,
        remarks: approverRemarks,
        worksheet_no: worksheetNo,
        worksheet_date: worksheetDate
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
    <div className="app-shell" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <Sidebar />
      <main className="main-content" style={{ background: '#f4fbf7' }}>
        {/* Top Header Navigation */}
        <div className="topbar" style={{ borderBottom: '1px solid #a7f3d0', padding: '0 2rem', background: '#ffffff' }}>
          <div>
            <div className="topbar-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#064e3b' }}>Profile Directory</div>
            <div className="topbar-subtitle" style={{ fontSize: '0.72rem', color: '#059669' }}>EduBVN School Network</div>
          </div>
          <div className="topbar-actions">
            {role !== 'Employee' && (
              <Link href={backUrl} className="btn btn-ghost btn-sm" style={{ borderRadius: '8px', fontSize: '0.75rem', borderColor: '#a7f3d0', color: '#059669', background: '#ecfdf5' }}>
                ← Return to {backLabel}
              </Link>
            )}
          </div>
        </div>

        <div className="page-container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* ── TOP HERO HEADER (Full Width Emerald & Forest Green Gradient Banner) ── */}
          <div className="fade-in" style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)',
            borderRadius: '16px',
            padding: '2.25rem 2.5rem',
            color: '#ffffff',
            boxShadow: '0 10px 30px rgba(5, 150, 105, 0.2)',
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Soft decorative background circles */}
            <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', bottom: '-80px', left: '20%', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
            
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>
                  {emp.name_english}
                </h1>
                <div style={{ fontSize: '1.1rem', color: '#a7f3d0', marginTop: '0.25rem', fontWeight: 500 }}>
                  {emp.name_gujarati}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 600, border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    Teacher Code: {emp.teacher_code}
                  </span>
                  <span style={{ background: 'rgba(255, 255, 255, 0.15)', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 600, border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    {emp.taluka} Taluka
                  </span>
                  {emp.designation && (
                    <span style={{ background: '#fef08a', color: '#854d0e', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
                      {emp.designation}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right', minWidth: '150px' }}>
                <div style={{ fontSize: '0.72rem', color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                  Current Scale Basic
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
                  {emp.pay_7th ? `₹${Number(emp.pay_7th).toLocaleString('en-GB')}` : '—'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#d1fae5', marginTop: '0.35rem' }}>
                  7th Pay Grade Commission
                </div>
              </div>
            </div>
          </div>

          {/* Main Layout Stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* ── ROW 1: SCHOOL ADMIN & KEY DATES (50/50 Split) ──────────────── */}
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              
              {/* School Details Card (Left: Flex 1) */}
              <div className="chart-card fade-in" style={{ flex: 1, minWidth: '320px', padding: '1.5rem', border: '1px solid #a7f3d0', borderLeft: '4px solid #059669', background: '#ffffff', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: '#064e3b' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    School Administration
                  </h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <DetailRow label="Teacher Code" value={emp.teacher_code} />
                  <DetailRow label="School Name" value={emp.school_name} />
                  <DetailRow label="Salary School" value={emp.salary_school} />
                  <DetailRow label="DISE Code" value={emp.dise_code} />
                  <DetailRow label="School Type" value={emp.school_type} />
                  <DetailRow label="Taluka Region" value={emp.taluka} />
                </div>
              </div>

              {/* Important Dates Card (Right: Flex 1) */}
              <div className="chart-card fade-in" style={{ flex: 1, minWidth: '320px', padding: '1.5rem', border: '1px solid #a7f3d0', borderLeft: '4px solid #10b981', background: '#ffffff', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: '#064e3b' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    Chronological Timeline & Key Dates
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ padding: '0.65rem 0.85rem', background: '#f0fdf4', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Date of Birth</div>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{formatDate(emp.dob)}</strong>
                  </div>
                  <div style={{ padding: '0.65rem 0.85rem', background: '#f0fdf4', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Recruitment Date</div>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{formatDate(emp.recruitment_date)}</strong>
                  </div>
                  <div style={{ padding: '0.65rem 0.85rem', background: '#f0fdf4', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Joined District</div>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{formatDate(emp.joined_district)}</strong>
                  </div>
                  <div style={{ padding: '0.65rem 0.85rem', background: '#f0fdf4', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Joined School</div>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{formatDate(emp.joined_school)}</strong>
                  </div>
                  <div style={{ padding: '0.65rem 0.85rem', background: '#f0fdf4', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Full Salary Date</div>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{formatDate(emp.full_salary_date)}</strong>
                  </div>
                  {emp.district_transfer && (
                    <div style={{ padding: '0.65rem 0.85rem', background: '#f0fdf4', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>District Transfer</div>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{formatDate(emp.district_transfer)}</strong>
                    </div>
                  )}

                  <div style={{ gridColumn: '1 / -1', padding: '0.85rem 1.25rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1rem' }}>📅</span>
                      <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 600 }}>Scheduled Retirement Date</span>
                    </div>
                    <strong style={{ fontSize: '0.95rem', color: '#991b1b', fontWeight: 800 }}>
                      {formatDate(emp.retirement_date)}
                    </strong>
                  </div>
                </div>
              </div>

            </div>

            {/* ── ROW 2: SALARY & PAY CONFIGURATION (Full Width, 2 Sections) ── */}
            <div className="chart-card fade-in" style={{ padding: '1.75rem 2rem', border: '1px solid #a7f3d0', borderLeft: '4px solid #059669', background: '#ffffff', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: '#064e3b' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Salary & Pay Configuration
                </h4>
              </div>
              
              <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
                {/* Section A: Core Pay Details (Left: Flex 1) */}
                <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#047857', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.35rem', marginBottom: '0.25rem' }}>
                    Core Pay Info
                  </div>
                  <DetailRow label="Salary Type" value={emp.salary_type} />
                  <DetailRow label="Pay Grade Scale" value={emp.pay_level?.trim() ? `Level ${emp.pay_level.trim()}` : null} />
                  <DetailRow label="Grade Pay" value={emp.grade_pay} />
                  <DetailRow label="Pay Scheme" value={emp.pay_type} />

                  <div style={{ background: '#ecfdf5', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', border: '1px solid #a7f3d0' }}>
                    <span style={{ fontSize: '0.78rem', color: '#065f46', fontWeight: 600 }}>7th Pay Basic</span>
                    <strong style={{ fontSize: '1rem', color: '#047857', fontWeight: 700 }}>
                      {emp.pay_7th ? `₹${Number(emp.pay_7th).toLocaleString('en-GB')}` : '—'}
                    </strong>
                  </div>
                  <div style={{ background: '#f0fdf4', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>6th Pay Basic</span>
                    <strong style={{ fontSize: '#0.88rem', color: 'var(--text-secondary)' }}>
                      {emp.pay_6th ? `₹${Number(emp.pay_6th).toLocaleString('en-GB')}` : '—'}
                    </strong>
                  </div>
                </div>

                {/* Section B: Higher Pay Scale Progression (Right: Flex 1) */}
                <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#047857', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.35rem', marginBottom: '0.25rem' }}>
                    Higher Pay Scale Progression
                  </div>
                  <DetailRow label="Higher Pay Scale" value={emp.higher_pay_scale} />
                  <DetailRow label="HPS Date 1" value={emp.hps_date_1} />
                  <DetailRow label="HPS Date 2" value={emp.hps_date_2} />
                  <DetailRow label="HPS Date 3" value={emp.hps_date_3} />
                </div>
              </div>
            </div>

            {/* ── ROW 3: PENSION TRACKER (Full Width) ─────────────────────────── */}
            <div className="chart-card fade-in" style={{ padding: '1.75rem', border: '1px solid #a7f3d0', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(5, 150, 105, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem', color: '#059669' }}>🏛️</span>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#064e3b' }}>
                    Pension Tracker
                  </span>
                  {proposalLoading && (
                    <span style={{
                      display: 'inline-block', width: '14px', height: '14px',
                      border: '2px solid #a7f3d0', borderTopColor: '#059669',
                      borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                    }} />
                  )}
                </div>
                
                {proposalLoading ? null : proposal ? (
                  <span className={`badge ${
                    proposal.status === 'Approved' ? 'badge-green' : (proposal.status?.startsWith('Queried') ? 'badge-red' : 'badge-green')
                  }`} style={{ fontSize: '0.72rem', padding: '0.4rem 0.85rem', borderRadius: '8px', fontWeight: 700 }}>
                    {proposal.status}
                  </span>
                ) : (
                  <span className="badge badge-gray" style={{ fontSize: '0.72rem', padding: '0.4rem 0.85rem', borderRadius: '8px' }}>
                    Uninitiated
                  </span>
                )}
              </div>

              {/* Proposal Loading Skeleton */}
              {proposalLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '0.5rem 0' }}>
                  <div style={{ display: 'flex', gap: '0', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#e2e8f0', animation: 'pulse 1.5s ease-in-out infinite' }} />
                        <div style={{ width: '60px', height: '8px', borderRadius: '4px', background: '#e2e8f0', animation: 'pulse 1.5s ease-in-out infinite' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ height: '80px', borderRadius: '8px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                </div>
              )}

              {/* Workflow Stepper Bar */}
              {proposal && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem 1.5rem', position: 'relative', overflowX: 'auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {(() => {
                    const steps = [
                      { label: 'Salary School', key: 'SS' },
                      { label: 'TPEO Review', key: 'TPEO' },
                      { label: 'DPEO Review', key: 'DPEO' },
                      { label: 'DPPF / Settled', key: 'DPPF' }
                    ];

                    let activeIdx = 0;
                    let isQueried = proposal.status?.startsWith('Queried');

                    if (proposal.status === 'Approved' || proposal.current_handler === 'Completed') {
                      activeIdx = 4;
                    } else if (proposal.current_handler?.includes('DPPF')) {
                      activeIdx = 3;
                    } else if (proposal.current_handler === 'DPEO') {
                      activeIdx = 2;
                    } else if (proposal.current_handler === 'TPEO') {
                      activeIdx = 1;
                    } else if (proposal.current_handler === 'Salary School' || proposal.current_handler === 'Group School') {
                      activeIdx = 0;
                    }

                    return steps.map((step, idx) => {
                      const isCompleted = idx < activeIdx;
                      const isActive = idx === activeIdx;
                      
                      let circleBg = '#f1f5f9';
                      let circleColor = '#94a3b8';
                      let borderStyle = '1px solid #e2e8f0';

                      if (isCompleted) {
                        circleBg = '#ecfdf5';
                        circleColor = '#059669';
                        borderStyle = '1px solid #a7f3d0';
                      } else if (isActive) {
                        if (isQueried) {
                          circleBg = '#fef2f2';
                          circleColor = '#ef4444';
                          borderStyle = '1px solid #fecaca';
                        } else {
                          circleBg = '#ecfdf5';
                          circleColor = '#059669';
                          borderStyle = '1px solid #a7f3d0';
                        }
                      }

                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', minWidth: '70px' }}>
                          {/* Connecting Line */}
                          {idx > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '12px',
                              left: '-50%',
                              right: '50%',
                              height: '2px',
                              background: idx <= activeIdx ? '#059669' : '#e2e8f0',
                              zIndex: 0
                            }} />
                          )}
                          
                          {/* Circle */}
                          <div style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: circleBg,
                            color: circleColor,
                            border: borderStyle,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            zIndex: 1,
                            marginBottom: '0.4rem',
                            boxShadow: isActive ? '0 0 12px rgba(5, 150, 105, 0.3)' : 'none'
                          }}>
                            {isCompleted ? '✓' : idx + 1}
                          </div>

                          {/* Label */}
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? (isQueried ? '#ef4444' : '#059669') : (isCompleted ? '#064e3b' : '#94a3b8'),
                            whiteSpace: 'nowrap'
                          }}>
                            {step.label}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* Proposal Overview & Form details */}
              {proposal && !showProposalForm ? (
                /* CASE: Proposal Exists & Not Editing */
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>

                  {/* TPEO Actions Form */}
                  {role === 'TPEO' && proposal.current_handler === 'TPEO' && (
                    <div style={{ padding: '1.25rem', borderRadius: '8px', border: '1px solid #a7f3d0', background: '#ecfdf5', marginBottom: '0.5rem' }}>
                      {!isTpeoForThisTaluka ? (
                        <div style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600, textAlign: 'center', padding: '0.5rem' }}>
                          ⚠️ This employee belongs to {emp.taluka} Taluka. Only TPEO - {emp.taluka} can process this proposal.
                        </div>
                      ) : (
                        <form onSubmit={(e) => { e.preventDefault(); }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>Letter No.</label>
                              <input
                                type="text"
                                className="search-input"
                                placeholder="Enter Letter No."
                                style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.78rem', borderColor: '#a7f3d0' }}
                                value={worksheetNo}
                                onChange={(e) => setWorksheetNo(e.target.value)}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>Letter Date</label>
                              <input
                                type="date"
                                className="search-input"
                                style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.78rem', borderColor: '#a7f3d0' }}
                                value={worksheetDate}
                                onChange={(e) => setWorksheetDate(e.target.value)}
                              />
                            </div>
                          </div>

                          <div style={{ marginBottom: '0.85rem' }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>TPEO Remarks / Query Details</label>
                            <textarea
                              placeholder="Enter action remarks or query details..."
                              className="search-input"
                              style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.78rem', height: '55px', resize: 'vertical', borderColor: '#a7f3d0' }}
                              value={approverRemarks}
                              onChange={(e) => setApproverRemarks(e.target.value)}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button type="button" disabled={actionLoading} onClick={() => handleWorkflowAction('tpeo_query')} className="btn btn-ghost btn-sm" style={{ color: '#ef4444', borderColor: '#fecaca', background: '#ffffff', fontSize: '0.75rem', borderRadius: '6px' }}>
                              ↩ Raise Query & Return
                            </button>
                            <button type="button" disabled={actionLoading} onClick={() => handleWorkflowAction('tpeo_forward')} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', borderRadius: '6px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
                              Forward to DPEO ➔
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* DPEO Actions Form */}
                  {role === 'DPEO' && proposal.current_handler === 'DPEO' && (
                    <div style={{ padding: '1.25rem', borderRadius: '8px', border: '1px solid #a7f3d0', background: '#ecfdf5', marginBottom: '0.5rem' }}>
                      {proposal.status?.includes('Queried by DPPF') && (
                        <div style={{ padding: '0.6rem 0.8rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.75rem', color: '#b91c1c', fontWeight: 600, marginBottom: '0.75rem' }}>
                          ↩ DPPF has raised a query. Send this query to TPEO for resolution.
                        </div>
                      )}
                      <form onSubmit={(e) => { e.preventDefault(); }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>Letter No.</label>
                            <input
                              type="text"
                              className="search-input"
                              placeholder="Enter Letter No."
                              style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.78rem', borderColor: '#a7f3d0' }}
                              value={worksheetNo}
                              onChange={(e) => setWorksheetNo(e.target.value)}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>Letter Date</label>
                            <input
                              type="date"
                              className="search-input"
                              style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.78rem', borderColor: '#a7f3d0' }}
                              value={worksheetDate}
                              onChange={(e) => setWorksheetDate(e.target.value)}
                            />
                          </div>
                        </div>

                        <div style={{ marginBottom: '0.85rem' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>DPEO Remarks / Query Details</label>
                          <textarea
                            placeholder="Enter remarks or queries..."
                            className="search-input"
                            style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.78rem', height: '55px', resize: 'vertical', borderColor: '#a7f3d0' }}
                            value={approverRemarks}
                            onChange={(e) => setApproverRemarks(e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button type="button" disabled={actionLoading} onClick={() => handleWorkflowAction('dpeo_query')} className="btn btn-ghost btn-sm" style={{ flex: 1, color: '#d97706', borderColor: '#fde68a', background: '#ffffff', fontSize: '0.75rem', borderRadius: '6px', justifyContent: 'center' }}>
                            ↩ Send Query to TPEO
                          </button>
                          <button type="button" disabled={actionLoading} onClick={() => handleWorkflowAction('dpeo_approve')} className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: '0.75rem', borderRadius: '6px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', justifyContent: 'center' }}>
                            Forward to DPPF ➔
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* DPPF Actions Form */}
                  {role === 'DPPF' && proposal.current_handler?.includes('DPPF') && proposal.status !== 'Approved' && (
                    <div style={{ padding: '1.25rem', borderRadius: '8px', border: '1px solid #a7f3d0', background: '#ecfdf5', marginBottom: '0.5rem' }}>
                      <form onSubmit={(e) => { e.preventDefault(); }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>Letter No.</label>
                            <input
                              type="text"
                              className="search-input"
                              placeholder="Enter Letter No."
                              style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.78rem', borderColor: '#a7f3d0' }}
                              value={worksheetNo}
                              onChange={(e) => setWorksheetNo(e.target.value)}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>Letter Date</label>
                            <input
                              type="date"
                              className="search-input"
                              style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.78rem', borderColor: '#a7f3d0' }}
                              value={worksheetDate}
                              onChange={(e) => setWorksheetDate(e.target.value)}
                            />
                          </div>
                        </div>

                        <div style={{ marginBottom: '0.85rem' }}>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>Query Details</label>
                          <textarea
                            placeholder="Enter DPPF query details or approval remarks..."
                            className="search-input"
                            style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.78rem', height: '55px', resize: 'vertical', borderColor: '#a7f3d0' }}
                            value={approverRemarks}
                            onChange={(e) => setApproverRemarks(e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
                          <button type="button" disabled={actionLoading} onClick={() => handleWorkflowAction('dppf_query')} className="btn btn-ghost btn-sm" style={{ flex: 1, color: '#d97706', borderColor: '#fde68a', background: '#ffffff', fontSize: '0.75rem', borderRadius: '6px', justifyContent: 'center' }}>
                            ↩ Raise DPPF Query & Return to DPEO
                          </button>
                          <button type="button" disabled={actionLoading} onClick={() => handleWorkflowAction('dppf_settle')} className="btn btn-success btn-sm" style={{ flex: 1, fontSize: '0.75rem', borderRadius: '6px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', justifyContent: 'center' }}>
                            ✓ Approve
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Salary School Resubmit Actions */}
                  {(role === 'Salary School' || role === 'Group School') && (proposal.current_handler === 'Salary School' || proposal.current_handler === 'Group School') && (
                    <div style={{ padding: '1.25rem', textAlign: 'center', background: '#fef2f2', borderRadius: '8px', border: '1px dashed #fca5a5', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.78rem', color: '#b91c1c', fontWeight: 600, marginBottom: '0.75rem' }}>
                        ↩ TPEO has queried this proposal. Please make required changes and resubmit.
                      </div>
                      <button onClick={() => setShowProposalForm(true)} className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', borderRadius: '8px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
                        📝 Edit & Resubmit Proposal
                      </button>
                    </div>
                  )}

                  {/* General waiting states */}
                  {proposal.status !== 'Approved' && proposal.current_handler !== role && (
                    <div style={{ padding: '0.85rem', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid #f1f5f9', marginTop: '0.5rem' }}>
                      ⏳ Awaiting action from current handler: <strong style={{ color: '#059669' }}>{proposal.current_handler}</strong>.
                    </div>
                  )}

                  {proposal.status === 'Approved' && (
                    <div style={{ padding: '1rem', borderRadius: '8px', textAlign: 'center', fontSize: '0.82rem', color: '#065f46', fontWeight: 700, background: '#f0fdf4', border: '1px solid #a7f3d0', marginTop: '0.5rem' }}>
                      🎉 Pension Case Approved.
                    </div>
                  )}
                </div>
              ) : (
                /* CASE: No Proposal Yet OR Editing mode */
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                  {benefits && !benefits.eligible ? (
                    <div style={{ padding: '1rem', fontSize: '0.82rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', textAlign: 'center', fontWeight: 600 }}>
                      ⚠️ Ineligible for Pension: {benefits.reason}
                    </div>
                  ) : benefits ? (
                    <>
                      {!showProposalForm ? (
                        /* Default display: initiate action */
                        <div style={{ padding: '0.5rem 0', textAlign: 'center' }}>
                          {(role === 'Salary School' || role === 'Group School') ? (
                            <button onClick={() => setShowProposalForm(true)} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', borderRadius: '8px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
                              📁 Initiate Pension Proposal
                            </button>
                          ) : role ? (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                              ⚠️ No pension proposal has been submitted yet for this employee by the Salary School.
                            </div>
                          ) : (
                            <Link href="/login" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', borderRadius: '8px', color: '#059669', borderColor: '#a7f3d0', background: '#ecfdf5' }}>
                              🔒 Sign In as Salary School to Propose
                            </Link>
                          )}
                        </div>
                      ) : (
                        /* Salary School Submission Form (Worksheet & Remarks only) */
                        <form onSubmit={handleSaveProposal}>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>Letter No.</label>
                              <input
                                type="text"
                                className="search-input"
                                placeholder="Enter Letter No."
                                style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.78rem', borderColor: '#a7f3d0' }}
                                value={worksheetNo}
                                onChange={(e) => setWorksheetNo(e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#065f46', marginBottom: '0.25rem' }}>Letter Date</label>
                              <input
                                type="date"
                                className="search-input"
                                style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.78rem', borderColor: '#a7f3d0' }}
                                value={worksheetDate}
                                onChange={(e) => setWorksheetDate(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#064e3b', marginBottom: '0.25rem' }}>Remarks / Remarks Details</label>
                            <textarea
                              placeholder="Submission remarks / justifications..."
                              className="search-input"
                              style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.78rem', height: '65px', resize: 'vertical', borderColor: '#a7f3d0' }}
                              value={clerkRemarks}
                              onChange={(e) => setClerkRemarks(e.target.value)}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setShowProposalForm(false)} className="btn btn-ghost btn-sm" style={{ borderRadius: '6px' }}>Cancel</button>
                            <button type="submit" disabled={formSubmitting} className="btn btn-primary btn-sm" style={{ borderRadius: '6px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>{formSubmitting ? 'Submitting...' : 'Submit Proposal'}</button>
                          </div>
                        </form>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>

            {/* Action History Timeline */}
            {proposal && proposal.history && (
              <div className="chart-card fade-in" style={{ padding: '1.5rem', border: '1px solid #a7f3d0', background: '#ffffff', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: '#064e3b' }}>
                  <span style={{ fontSize: '1.1rem' }}>📅</span>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Proposal Action Timeline & History
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', paddingLeft: '1rem', borderLeft: '2px solid #a7f3d0', marginLeft: '0.5rem' }}>
                  {proposal.history.split('\n').filter(Boolean).map((line, idx) => {
                    const match = line.match(/^\[(.*?)\]\s*(.*)/);
                    const timeStr = match ? match[1] : '';
                    let textStr = match ? match[2] : line;

                    // Enrich old-format forwarding lines that lack letter info
                    if (!textStr.includes('with Letter No.')) {
                      const letterNo = proposal.worksheet_no || 'N/A';
                      const letterDate = proposal.worksheet_date
                        ? new Date(proposal.worksheet_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : 'N/A';
                      const forwardPatterns = [
                        /^Forwarded to DPEO by TPEO/,
                        /^Forwarded to DPPF by DPEO/
                      ];
                      if (forwardPatterns.some(p => p.test(textStr))) {
                        // Insert letter info before ". Remarks:" or at end
                        const remarksSplit = textStr.split('. Remarks:');
                        textStr = `${remarksSplit[0]} on ${letterDate} with Letter No. ${letterNo}${remarksSplit.length > 1 ? '. Remarks:' + remarksSplit[1] : ''}`;
                      }
                    }

                    return (
                      <div key={idx} style={{ position: 'relative' }}>
                        {/* Dot indicator */}
                        <div style={{
                          position: 'absolute',
                          left: '-22px',
                          top: '4px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#059669',
                          border: '2px solid #ffffff',
                          boxShadow: '0 0 0 3px rgba(5, 150, 105, 0.15)'
                        }} />
                        
                        {(() => {
                          const hasRemarks = textStr.includes('. Remarks:');
                          const remarkVal = hasRemarks ? textStr.split('. Remarks:')[1]?.trim() : '';
                          const shouldShowRemarks = hasRemarks && remarkVal && remarkVal !== 'No remarks' && remarkVal !== 'N/A';
                          const titleText = textStr.split('. Remarks:')[0];

                          // Check if line has Letter No to make it clickable
                          const letterMatch = titleText.match(/(.*?\bwith Letter No\.\s*)([^\s\.,]+)(.*)/i);

                          const handleLetterClick = (extractedLetterNo) => {
                            // Extract letter date if present (e.g., "on 29/07/2026")
                            const dateMatch = titleText.match(/on\s+([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}|[0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{4})/i);
                            let letterDate = dateMatch ? dateMatch[1] : (proposal?.worksheet_date ? new Date(proposal.worksheet_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A');

                            // Reformat text-based dates to dd/mm/yyyy
                            if (letterDate && letterDate !== 'N/A') {
                              const m = letterDate.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
                              if (m) {
                                const day = m[1].padStart(2, '0');
                                const monthStr = m[2].toLowerCase();
                                const months = {
                                  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
                                  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
                                };
                                const month = months[monthStr];
                                if (month) {
                                  letterDate = `${day}/${month}/${m[3]}`;
                                }
                              } else {
                                const m2 = letterDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                                if (m2) {
                                  letterDate = `${m2[1].padStart(2, '0')}/${m2[2].padStart(2, '0')}/${m2[3]}`;
                                }
                              }
                            }

                            // Determine type of action
                            let actionType = 'proposal_init';
                            if (titleText.includes('Resubmitted')) actionType = 'proposal_resubmit';
                            else if (titleText.includes('Forwarded to DPEO')) actionType = 'tpeo_forward';
                            else if (titleText.includes('Query raised by TPEO')) actionType = 'tpeo_query';
                            else if (titleText.includes('Forwarded to DPPF')) actionType = 'dpeo_forward';
                            else if (titleText.includes('Query raised by DPEO')) actionType = 'dpeo_query';
                            else if (titleText.includes('Query raised by DPPF')) actionType = 'dppf_query';
                            else if (titleText.includes('Approved by DPPF')) actionType = 'dppf_approve';

                            setViewingLetter({
                              letterNo: extractedLetterNo,
                              letterDate: letterDate,
                              actionType: actionType,
                              rawText: titleText,
                              remarks: remarkVal,
                              timeStr: timeStr,
                              historyIndex: idx
                            });
                          };

                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.2rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#064e3b' }}>
                                  {letterMatch ? (
                                    <>
                                      {letterMatch[1]}
                                      <button
                                        type="button"
                                        onClick={() => handleLetterClick(letterMatch[2])}
                                        style={{
                                          background: '#ecfdf5',
                                          color: '#047857',
                                          border: '1px solid #a7f3d0',
                                          borderRadius: '6px',
                                          padding: '2px 8px',
                                          fontWeight: 800,
                                          cursor: 'pointer',
                                          fontSize: '0.76rem',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          textDecoration: 'underline'
                                        }}
                                        title="Click to view & print official letter"
                                      >
                                        📄 Letter No. {letterMatch[2]}
                                      </button>
                                      {letterMatch[3]}
                                    </>
                                  ) : (
                                    titleText
                                  )}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                  {timeStr}
                                </span>
                              </div>
                              
                              {shouldShowRemarks && (
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: '#065f46',
                                  background: '#f0fdf4',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: '6px',
                                  borderLeft: '2.5px solid #059669',
                                  fontStyle: 'italic',
                                  marginTop: '0.25rem'
                                }}>
                                  Remarks: {remarkVal}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* OFFICIAL LETTER VIEW MODAL (proposal.doc Format) */}
      {viewingLetter && (() => {
        // Gujarati Taluka mapping
        const TALUKA_GUJARATI_MAP = {
          'BHAVNAGAR': 'ભાવનગર',
          'GARIYADHAR': 'ગારિયાધાર',
          'GHOGHA': 'ઘોઘા',
          'JESAR': 'જેસર',
          'MAHUVA': 'મહુવા',
          'PALITANA': 'પાલિતાણા',
          'SHIHOR': 'શિહોર',
          'SIHOR': 'શિહોર',
          'TALAJA': 'તળાજા',
          'UMRALA': 'ઉમરાળા',
          'VALLABHIPUR': 'વલ્લભીપુર'
        };
        const rawTaluka = emp?.taluka ? emp.taluka.trim().toUpperCase() : '';
        const empTaluka = TALUKA_GUJARATI_MAP[rawTaluka] || emp?.taluka || 'ભાવનગર';

        // Parse history to find letter numbers and dates of various stages
        const parsedLetters = {};
        let lastQueryLetter = null;
        if (proposal && proposal.history) {
          const historyLines = proposal.history.split('\n').filter(Boolean);
          const limitIndex = (viewingLetter && viewingLetter.historyIndex !== undefined) ? viewingLetter.historyIndex : historyLines.length - 1;
          for (let i = 0; i <= limitIndex; i++) {
            const line = historyLines[i];
            const match = line.match(/^\[(.*?)\]\s*(.*)/);
            if (match) {
              const text = match[2];
              const numMatch = text.match(/with Letter No\.\s*([^\s\.,]+)/i);
              const dateMatch = text.match(/on\s+([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}|[0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{4})/i);
              
              if (numMatch) {
                const num = numMatch[1];
                let dt = 'N/A';
                if (dateMatch) {
                  dt = dateMatch[1];
                  // Normalize date format to dd/mm/yyyy
                  const m = dt.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
                  if (m) {
                    const day = m[1].padStart(2, '0');
                    const monthStr = m[2].toLowerCase();
                    const months = {
                      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
                      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
                    };
                    const month = months[monthStr];
                    if (month) dt = `${day}/${month}/${m[3]}`;
                  } else {
                    const m2 = dt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                    if (m2) dt = `${m2[1].padStart(2, '0')}/${m2[2].padStart(2, '0')}/${m2[3]}`;
                  }
                }
                
                if (text.includes('Proposal initiated') || text.includes('Resubmitted')) {
                  parsedLetters.school = { no: num, date: dt };
                } else if (text.includes('Forwarded to DPEO') || text.includes('Query raised by TPEO')) {
                  parsedLetters.tpeo = { no: num, date: dt };
                } else if (text.includes('Forwarded to DPPF') || text.includes('Query raised by DPEO')) {
                  parsedLetters.dpeo = { no: num, date: dt };
                } else if (text.includes('Query raised by DPPF')) {
                  parsedLetters.dppf = { no: num, date: dt };
                }

                if (text.includes('Query raised by TPEO')) {
                  lastQueryLetter = { office: `તાલુકા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ${empTaluka}`, no: num, date: dt };
                } else if (text.includes('Query raised by DPEO')) {
                  lastQueryLetter = { office: 'જિલ્લા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ભાવનગર', no: num, date: dt };
                } else if (text.includes('Query raised by DPPF')) {
                  lastQueryLetter = { office: 'નિયામકશ્રી, પેન્શન એન્ડ પ્રોવિડન્ટ ફંડ (DPPF), ગુજરાત રાજ્ય', no: num, date: dt };
                }
              }
            }
          }
        }

        // Find relevant user profiles for sender & receiver
        const schoolUser = allUsers.find(u => u.role === 'Salary School' && u.salary_school === emp?.salary_school) || {};
        const tpeoUser = allUsers.find(u => u.role === 'TPEO' && (u.taluka?.toUpperCase() === rawTaluka)) || {};
        const dpeoUser = allUsers.find(u => u.role === 'DPEO') || {};

        // Salary School Office Name (used for office letterhead & stamps)
        const salarySchoolGujaratiOffice = schoolUser.office_name_gujarati || emp?.salary_school || 'કેન્દ્રવર્તી શાળા';
        // Teacher's actual working school (used in letter text for the teacher's workplace)
        const teacherActualSchool = emp?.school_name || emp?.school_name_english || emp?.salary_school || 'પ્રાથમિક શાળા';

        // Formatted Employee Gujarati Name with "શ્રી "
        const rawEmpName = emp?.name_gujarati || emp?.name_english || '';
        const trimmedEmpName = rawEmpName.trim();
        const empNameGujarati = trimmedEmpName.startsWith('શ્રી') ? trimmedEmpName : `શ્રી ${trimmedEmpName}`;

        let senderTitle = schoolUser.office_name_gujarati || `મુખ્ય શિક્ષકશ્રી, ${salarySchoolGujaratiOffice}`;
        let senderStamp = schoolUser.office_stamp || `પ્રાથમિક શાળા, ${empTaluka}`;
        let senderAddress = schoolUser.address || `${salarySchoolGujaratiOffice}, તા. ${empTaluka}`;
        let senderPhone = schoolUser.phone || '—';
        let senderEmail = schoolUser.email || '—';
        let lowerHierarchyInfo = '';
        let recipientTitle = tpeoUser.office_name_gujarati || `તાલુકા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ${empTaluka}`;
        let recipientAddress = tpeoUser.address || `તાલુકા પંચાયત કચેરી, ${empTaluka}`;
        let subjectText = 'પેન્શન કેસ મંજુરી અર્થે મોકલવા બાબત.';
        let referenceText = '';
        let bodyParagraph = `સવિનય ઉપરોક્ત વિષય પરત્વે જણાવવાનું કે, અત્રેના જિલ્લાના ${empTaluka} તાલુકાની ${teacherActualSchool} ના ${emp?.designation || 'શિક્ષક'} ${empNameGujarati} તા. ${formatDate(emp?.retirement_date)} નાં રોજ વયમર્યાદા/ સ્વૈચ્છિક/ અવસાનથી નિવૃત થયેલ/ થનાર હોય આ સાથે અસલ સેવાપોથી સામેલ રાખી મોકલી આપવામાં આવે છે, જે પેન્શન કેસ મંજુર કરવા વિનંતી.`;

        if (viewingLetter.actionType === 'proposal_resubmit') {
          subjectText = 'પેન્શન કેસ પૂર્તતા કરી પુન: મોકલવા બાબત.';
          let ref = '';
          if (lastQueryLetter) {
            ref = `${lastQueryLetter.office} ના પત્ર ક્રમાંક: ${lastQueryLetter.no} તા. ${lastQueryLetter.date}`;
          } else {
            ref = `અત્રેની કચેરીના પત્ર ક્રમાંક: ${viewingLetter.letterNo} તા. ${viewingLetter.letterDate}`;
          }
          referenceText = ref;
          bodyParagraph = `સવિનય ઉપરોક્ત વિષય પરત્વે જણાવવાનું કે, અત્રેના જિલ્લાના ${empTaluka} તાલુકાની ${teacherActualSchool} ના ${emp?.designation || 'શિક્ષક'} ${empNameGujarati} ના પેન્શન કેસ અન્વયે સંદર્ભદર્શિત પત્ર (${ref}) થી જણાવેલ પૂર્તતા/ક્ષતિઓની સંપૂર્ણ પૂર્તતા કરી અસલ સેવાપોથી તથા સાધનિક કાગળો આ સાથે પુન: મોકલી આપવામાં આવે છે, જે અંગે આગળની યોગ્ય કાર્યવાહી કરવા વિનંતી.`;
        } else if (viewingLetter.actionType === 'tpeo_forward') {
          senderTitle = tpeoUser.office_name_gujarati || `તાલુકા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ${empTaluka}`;
          senderStamp = tpeoUser.office_stamp || `તાલુકા પંચાયત, ${empTaluka}`;
          senderAddress = tpeoUser.address || `તાલુકા પંચાયત કચેરી, ${empTaluka}`;
          senderPhone = tpeoUser.phone || '—';
          senderEmail = tpeoUser.email || '—';
          lowerHierarchyInfo = schoolUser.office_name_gujarati 
            ? (schoolUser.address ? `મુખ્ય શિક્ષકશ્રી, ${schoolUser.office_name_gujarati}, ${schoolUser.address}` : `મુખ્ય શિક્ષકશ્રી, ${schoolUser.office_name_gujarati}, તા. ${empTaluka}`)
            : `મુખ્ય શિક્ષકશ્રી, ${salarySchoolGujaratiOffice}, તા. ${empTaluka}`;

          recipientTitle = dpeoUser.office_name_gujarati || 'જિલ્લા પ્રાથમિક શિક્ષણાધિકારીશ્રી, જિલ્લા પંચાયત, ભાવનગર';
          recipientAddress = dpeoUser.address || 'જિલ્લા પંચાયત ભવન, ભાવનગર';

          subjectText = 'પેન્શન કેસ મંજુરી અર્થે મોકલવા બાબત.';
          let schoolRef = '';
          if (parsedLetters.school) {
            schoolRef = `${salarySchoolGujaratiOffice} ના પત્ર ક્રમાંક: ${parsedLetters.school.no} તા. ${parsedLetters.school.date}`;
          }
          referenceText = schoolRef || 'શાળાની મૂળ દરખાસ્ત.';
          if (lastQueryLetter) {
            bodyParagraph = `સવિનય ઉપરોક્ત વિષય પરત્વે જણાવવાનું કે, અત્રેના જિલ્લાના ${empTaluka} તાલુકાની ${teacherActualSchool} ના ${emp?.designation || 'શિક્ષક'} ${empNameGujarati} ના પેન્શન કેસ અન્વયે સંદર્ભિત ${lastQueryLetter.office} ના પત્ર ક્રમાંક: ${lastQueryLetter.no} તા. ${lastQueryLetter.date} થી જણાવેલ પૂર્તતા/ક્ષતિઓની સંપૂર્ણ પૂર્તતા કરી અસલ સેવાપોથી તથા સાધનિક કાગળો આ સાથે પેન્શન કેસ મંજુર કરવા મોકલી આપવામાં આવે છે.`;
          } else {
            bodyParagraph = `સવિનય ઉપરોક્ત વિષય પરત્વે જણાવવાનું કે, અત્રેના જિલ્લાના ${empTaluka} તાલુકાની ${teacherActualSchool} ના ${emp?.designation || 'શિક્ષક'} ${empNameGujarati} તા. ${formatDate(emp?.retirement_date)} નાં રોજ વયમર્યાદા/ સ્વૈચ્છિક/ અવસાનથી નિવૃત થયેલ/ થનાર હોય આ સાથે અસલ સેવાપોથી સામેલ રાખી મોકલી આપવામાં આવે છે, જે પેન્શન કેસ મંજુર કરવા વિનંતી.`;
          }
        } else if (viewingLetter.actionType === 'tpeo_query') {
          senderTitle = tpeoUser.office_name_gujarati || `તાલુકા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ${empTaluka}`;
          senderStamp = tpeoUser.office_stamp || `તાલુકા પંચાયત, ${empTaluka}`;
          senderAddress = tpeoUser.address || `તાલુકા પંચાયત કચેરી, ${empTaluka}`;
          senderPhone = tpeoUser.phone || '—';
          senderEmail = tpeoUser.email || '—';
          lowerHierarchyInfo = schoolUser.office_name_gujarati 
            ? (schoolUser.address ? `મુખ્ય શિક્ષકશ્રી, ${schoolUser.office_name_gujarati}, ${schoolUser.address}` : `મુખ્ય શિક્ષકશ્રી, ${schoolUser.office_name_gujarati}, તા. ${empTaluka}`)
            : `મુખ્ય શિક્ષકશ્રી, ${salarySchoolGujaratiOffice}, તા. ${empTaluka}`;

          recipientTitle = schoolUser.office_name_gujarati || `મુખ્ય શિક્ષકશ્રી, ${salarySchoolGujaratiOffice}`;
          recipientAddress = schoolUser.address || `${salarySchoolGujaratiOffice}, તા. ${empTaluka}`;

          subjectText = 'પેન્શન કેસ અન્વયે પૂર્તતા બાબત.';
          let schoolRef = '';
          if (parsedLetters.school) {
            schoolRef = `${salarySchoolGujaratiOffice} ના પત્ર ક્રમાંક: ${parsedLetters.school.no} તા. ${parsedLetters.school.date}`;
          }
          referenceText = schoolRef || 'શાળાની મૂળ દરખાસ્ત.';
          bodyParagraph = `ઉપરોક્ત વિષય પરત્વે જણાવવાનું કે, ${empTaluka} તાલુકાની ${teacherActualSchool} ના ${emp?.designation || 'શિક્ષક'} ${empNameGujarati} ના પેન્શન કેસમાં નીચે દર્શાવેલ મુદ્દાઓની પૂર્તતા માટે કેસ પરત કરવામાં આવે છે.`;
        } else if (viewingLetter.actionType === 'dpeo_forward') {
          senderTitle = dpeoUser.office_name_gujarati || 'જિલ્લા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ભાવનગર';
          senderStamp = dpeoUser.office_stamp || 'જિલ્લા પંચાયત, ભાવનગર';
          senderAddress = dpeoUser.address || 'જિલ્લા પંચાયત ભવન, ભાવનગર';
          senderPhone = dpeoUser.phone || '—';
          senderEmail = dpeoUser.email || '—';
          lowerHierarchyInfo = tpeoUser.office_name_gujarati 
            ? (tpeoUser.address ? `તાલુકા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ${tpeoUser.office_name_gujarati}, ${tpeoUser.address}` : `તાલુકા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ${tpeoUser.office_name_gujarati}, તા. ${empTaluka}`)
            : `તાલુકા પ્રાથમિક શિક્ષણાધિકારીશ્રી, તાલુકા પંચાયત કચેરી, ${empTaluka}`;

          recipientTitle = 'નિયામકશ્રી, પેન્શન એન્ડ પ્રોવિડન્ટ ફંડ નિયામકશ્રીની કચેરી';
          recipientAddress = 'બ્લોક નં. ૧૮, ડૉ. જીવરાજ મહેતા ભવન, ગાંધીનગર';

          subjectText = 'પેન્શન કેસ મંજુરી અર્થે મોકલવા બાબત.';
          let tpeoRef = '';
          if (parsedLetters.tpeo) {
            tpeoRef = `તાલુકા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ${empTaluka} ના પત્ર ક્રમાંક: ${parsedLetters.tpeo.no} તા. ${parsedLetters.tpeo.date}`;
          }
          referenceText = tpeoRef || `તાલુકા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ${empTaluka} ની દરખાસ્ત.`;
          if (lastQueryLetter) {
            bodyParagraph = `સવિનય ઉપરોક્ત વિષય પરત્વે જણાવવાનું કે, અત્રેના જિલ્લાના ${empTaluka} તાલુકાની ${teacherActualSchool} ના ${emp?.designation || 'શિક્ષક'} ${empNameGujarati} ના પેન્શન કેસ અન્વયે સંદર્ભિત ${lastQueryLetter.office} ના પત્ર ક્રમાંક: ${lastQueryLetter.no} તા. ${lastQueryLetter.date} થી જણાવેલ પૂર્તતા/ક્ષતિઓની સંપૂર્ણ પૂર્તતા કરી અસલ સેવાપોથી તથા સાધનિક કાગળો આ સાથે પેન્શન કેસ મંજુર કરવા મોકલી આપવામાં આવે છે.`;
          } else {
            bodyParagraph = `સવિનય ઉપરોક્ત વિષય પરત્વે જણાવવાનું કે, અત્રેના જિલ્લાના ${empTaluka} તાલુકાની ${teacherActualSchool} ના ${emp?.designation || 'શિક્ષક'} ${empNameGujarati} તા. ${formatDate(emp?.retirement_date)} નાં રોજ વયમર્યાદા/ સ્વૈચ્છિક/ અવસાનથી નિવૃત થયેલ/ થનાર હોય આ સાથે અસલ સેવાપોથી સામેલ રાખી મોકલી આપવામાં આવે છે, જે પેન્શન કેસ મંજુર કરવા વિનંતી.`;
          }
        } else if (viewingLetter.actionType === 'dpeo_query') {
          senderTitle = dpeoUser.office_name_gujarati || 'જિલ્લા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ભાવનગર';
          senderStamp = dpeoUser.office_stamp || 'જિલ્લા પંચાયત, ભાવનગર';
          senderAddress = dpeoUser.address || 'જિલ્લા પંચાયત ભવન, ભાવનગર';
          senderPhone = dpeoUser.phone || '—';
          senderEmail = dpeoUser.email || '—';
          lowerHierarchyInfo = tpeoUser.office_name_gujarati 
            ? (tpeoUser.address ? `તાલુકા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ${tpeoUser.office_name_gujarati}, ${tpeoUser.address}` : `તાલુકા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ${tpeoUser.office_name_gujarati}, તા. ${empTaluka}`)
            : `તાલુકા પ્રાથમિક શિક્ષણાધિકારીશ્રી, તાલુકા પંચાયત કચેરી, ${empTaluka}`;

          recipientTitle = tpeoUser.office_name_gujarati || 'તાલુકા પ્રાથમિક શિક્ષણાધિકારીશ્રી';
          recipientAddress = tpeoUser.address || `શિક્ષણ શાખા, તાલુકા પંચાયત, ${empTaluka}`;

          subjectText = 'પેન્શન કેસ અન્વયે પૂર્તતા બાબત.';
          let dppfRef = '';
          if (parsedLetters.dppf) {
            dppfRef = `નિયામકશ્રી, પેન્શન એન્ડ પ્રોવિડન્ટ ફંડ, ગાંધીનગર ના પત્ર ક્રમાંક: ${parsedLetters.dppf.no} તા. ${parsedLetters.dppf.date}`;
          }
          referenceText = dppfRef || 'નિયામકશ્રી, પેન્શન એન્ડ પ્રોવિડન્ટ ફંડ, ગાંધીનગર નો પત્ર.';
          bodyParagraph = `ઉપરોક્ત વિષય પરત્વે જણાવવાનું કે, ${empTaluka} તાલુકાની ${teacherActualSchool} ના ${emp?.designation || 'શિક્ષક'} ${empNameGujarati} ના પેન્શન કેસમાં નીચે દર્શાવેલ મુદ્દાઓની પૂર્તતા માટે કેસ પરત કરવામાં આવે છે.`;
        } else if (viewingLetter.actionType === 'dppf_query') {
          senderTitle = 'નિયામકશ્રી, પેન્શન એન્ડ પ્રોવિડન્ટ ફંડ';
          senderStamp = 'ગાંધીનગર';
          senderAddress = 'નિયામકશ્રી, પેન્શન એન્ડ પ્રોવિડન્ટ ફંડ નિયામકશ્રીની કચેરી, બ્લોક નં. ૧૮, ડૉ. જીવરાજ મહેતા ભવન, ગાંધીનગર';
          lowerHierarchyInfo = dpeoUser.office_name_gujarati 
            ? (dpeoUser.address ? `જિલ્લા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ${dpeoUser.office_name_gujarati}, ${dpeoUser.address}` : `જિલ્લા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ${dpeoUser.office_name_gujarati}, ભાવનગર`)
            : 'જિલ્લા પ્રાથમિક શિક્ષણાધિકારીશ્રી, જિલ્લા પંચાયત, ભાવનગર';

          recipientTitle = dpeoUser.office_name_gujarati || 'જિલ્લા પ્રાથમિક શિક્ષણાધિકારીશ્રી, જિલ્લા પંચાયત, ભાવનગર';
          recipientAddress = dpeoUser.address || 'જિલ્લા પંચાયત ભવન, ભાવનગર';

          subjectText = 'પેન્શન કેસ અન્વયે પૂર્તતા બાબત.';
          let dpeoRef = '';
          if (parsedLetters.dpeo) {
            dpeoRef = `જિલ્લા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ભાવનગર ના પત્ર ક્રમાંક: ${parsedLetters.dpeo.no} તા. ${parsedLetters.dpeo.date}`;
          }
          referenceText = dpeoRef || 'જિલ્લા પ્રાથમિક શિક્ષણાધિકારીશ્રી, ભાવનગર ની દરખાસ્ત.';
          bodyParagraph = `ઉપરોક્ત વિષય પરત્વે જણાવવાનું કે, ${empTaluka} તાલુકાની ${teacherActualSchool} ના ${emp?.designation || 'શિક્ષક'} ${empNameGujarati} ના પેન્શન કેસમાં નીચે દર્શાવેલ મુદ્દાઓની પૂર્તતા માટે કેસ પરત કરવામાં આવે છે.`;
        }

        recipientTitle = formatOfficeNameWithShree(recipientTitle);
        senderTitle = formatOfficeNameWithShree(senderTitle);
        lowerHierarchyInfo = formatOfficeNameWithShree(lowerHierarchyInfo);

        return (
          <div className="modal-backdrop-print-fix" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}>
            <div className="modal-card-print-fix" style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Modal Top Bar (Non-Printable) */}
              <div className="no-print" style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>📄</span>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                    Official Letter View — Letter No: {viewingLetter.letterNo}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn btn-primary btn-sm"
                    style={{ background: '#059669', borderColor: '#059669', padding: '0.4rem 1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    🖨️ Print / Download Letter
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingLetter(null)}
                    style={{ background: '#e2e8f0', border: 'none', padding: '0.4rem 0.85rem', borderRadius: '8px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              {/* Document Printable Area (proposal.doc format) */}
              <div id="printable-letter" style={{
                padding: '2rem 2.5rem',
                fontFamily: "'Shruti', 'Gujarati Mohini', 'Calibri', sans-serif",
                color: '#000000',
                fontSize: '14px',
                lineHeight: 1.5,
                background: '#ffffff'
              }}>
                {/* Official Letterhead Header (Centered format matching proposal.doc) */}
                <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '1.05rem', color: '#000', marginBottom: '0.15rem' }}>
                    {senderAddress}
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#333' }}>
                    ફોન: {senderPhone} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Email: {senderEmail}
                  </div>
                </div>

                {/* Divider line */}
                <div style={{ borderBottom: '1.5px solid #000', marginBottom: '1rem' }} />

                {/* Letter No & Date Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                  <div>
                    નં: <span style={{ textDecoration: 'underline' }}>{viewingLetter.letterNo}</span>
                  </div>
                  <div>
                    તા: <span style={{ textDecoration: 'underline' }}>{viewingLetter.letterDate}</span>
                  </div>
                </div>

                {/* To Address */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div>પ્રતિ,</div>
                  <div style={{ fontSize: '0.98rem', marginLeft: '1.5rem' }}>{recipientTitle}</div>
                  <div style={{ marginLeft: '1.5rem' }}>{recipientAddress}</div>
                </div>

                {/* Subject & Reference */}
                <div style={{ marginBottom: '1.25rem', paddingLeft: '1.5rem' }}>
                  <div>
                    વિષય:- <span style={{ textDecoration: 'underline' }}>{subjectText}</span>
                  </div>
                  <div style={{ paddingLeft: '3.5rem', marginTop: '0.2rem' }}>
                    {empNameGujarati}, {emp?.designation || 'શિક્ષક'}, {teacherActualSchool}
                  </div>
                  {referenceText && (
                    <div style={{ marginTop: '0.2rem' }}>
                      સંદર્ભ:- {referenceText}
                    </div>
                  )}
                </div>

                {/* Body Paragraph */}
                <div style={{ textIndent: '2rem', textAlign: 'justify', marginBottom: '1.25rem', fontSize: '14px', lineHeight: 1.6 }}>
                  {bodyParagraph}
                </div>

                {/* Remarks / Query Details Block if available */}
                {viewingLetter.remarks && (
                  <div style={{
                    margin: '1rem 0 1.25rem 1.5rem',
                    padding: '0.75rem 1rem',
                    border: '1.5px solid #000',
                    borderRadius: '4px',
                    background: '#fafafa'
                  }}>
                    <div>{viewingLetter.remarks}</div>
                  </div>
                )}

                {/* Enclosures & Sign-off Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '1.25rem', marginBottom: '1.5rem' }}>
                  <div>
                    બીડાણ:- અસલ સેવાપોથી, દરખાસ્ત તથા સાધનિક કાગળો
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '220px' }}>
                    <div style={{ marginTop: '1.75rem' }}>{senderTitle}</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', fontStyle: 'italic' }}>{senderStamp}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 15mm;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          .app-shell, .sidebar, .main-content, .topbar, .page-container, .toast-container, .no-print {
            display: none !important;
          }
          .modal-backdrop-print-fix {
            position: static !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          .modal-card-print-fix {
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
          }
          #printable-letter {
            display: block !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            font-size: 13.5px !important;
            line-height: 1.45 !important;
          }
          #printable-letter * {
            visibility: visible !important;
          }
        }
      `}</style>
    </div>
  );
}

