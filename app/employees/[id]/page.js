'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';

function DetailCard({ title, icon, children }) {
  return (
    <div className="detail-card">
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

function getRetirementBenefits(emp) {
  if (!emp) return null;
  const basic = Number(emp.pay_7th || 0);
  const isFix = emp.salary_type === 'Fix';
  const payType = (emp.pay_type || '').toLowerCase();
  
  let years = 30;
  if (emp.joined_district && emp.retirement_date) {
    const jp = emp.joined_district.split('-');
    const rp = emp.retirement_date.split('-');
    if (jp.length === 3 && rp.length === 3) {
      const jy = parseInt(jp[2]);
      const ry = parseInt(rp[2]);
      if (!isNaN(jy) && !isNaN(ry)) {
        years = Math.max(0, ry - jy);
      }
    }
  }

  if (isFix || basic === 0) {
    return {
      eligible: false,
      reason: isFix ? 'Fix Salary employee (Contract/Probation period)' : 'Salary details not specified',
      pension: '—',
      gratuity: '—',
      pf: '—',
      leaveEncashment: '—',
      gis: '—'
    };
  }

  const da = basic * 0.50; // Estimated 50% DA
  const pensionMonthly = basic * 0.50;
  const familyPension = basic * 0.30;
  const gratuityVal = Math.min(2000000, ((basic + da) / 26) * 15 * years);
  const leaveVal = ((basic + da) / 30) * 300; 

  let pfText = '—';
  if (emp.pf_number) {
    const typeLabel = payType.includes('gpf') ? 'GPF' : (payType.includes('cpf') ? 'CPF' : 'NPS');
    pfText = `${typeLabel} A/C: ${emp.pf_number}`;
  }

  const gisVal = 100000;

  return {
    eligible: true,
    yearsOfService: years,
    pension: `₹${Math.round(pensionMonthly).toLocaleString()} / month (Family: ₹${Math.round(familyPension).toLocaleString()}/mo)`,
    gratuity: `₹${Math.round(gratuityVal).toLocaleString()}`,
    pf: pfText,
    leaveEncashment: `₹${Math.round(leaveVal).toLocaleString()} (For max 300 leaves)`,
    gis: `₹${gisVal.toLocaleString()} (Group C Cover)`
  };
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [role, setRole] = useState(null);
  
  // Proposal workflow states
  const [proposal, setProposal] = useState(null);
  const [showProposalForm, setShowProposalForm] = useState(false);
  
  // Form fields for Pension Proposal
  const [qualifyingService, setQualifyingService] = useState(30);
  const [averageEmoluments, setAverageEmoluments] = useState(0);
  const [commutationPercent, setCommutationPercent] = useState(0); // 0 to 40
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [clerkRemarks, setClerkRemarks] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Approver action states
  const [approverRemarks, setApproverRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const benefits = getRetirementBenefits(emp);

  // Load role on mount
  useEffect(() => {
    setRole(localStorage.getItem('user_role'));
  }, []);

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
        // Pre-populate defaults for form
        setAverageEmoluments(Number(d.pay_7th || 0));
        // calculate years
        let years = 30;
        if (d.joined_district && d.retirement_date) {
          const jp = d.joined_district.split('-');
          const rp = d.retirement_date.split('-');
          if (jp.length === 3 && rp.length === 3) {
            const jy = parseInt(jp[2]);
            const ry = parseInt(rp[2]);
            if (!isNaN(jy) && !isNaN(ry)) years = Math.max(0, ry - jy);
          }
        }
        setQualifyingService(years);
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
          setProposal(d.data[0]);
        } else {
          setProposal(null);
        }
      })
      .catch((err) => console.error('Error fetching proposal:', err));
  }, [id]);

  useEffect(() => {
    fetchProposalDetails();
  }, [id, fetchProposalDetails]);

  const handleCreateProposal = (e) => {
    e.preventDefault();
    if (!emp) return;
    setFormSubmitting(true);

    const pensionVal = Math.round(Number(averageEmoluments || 0) * 0.50);
    const familyPensionVal = Math.round(Number(averageEmoluments || 0) * 0.30);
    const commutedMonthly = pensionVal * (Number(commutationPercent || 0) / 100);
    const commutedVal = Math.round(commutedMonthly * 12 * 8.371);
    const reducedPensionVal = Math.round(pensionVal - commutedMonthly);

    fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacher_id: emp.id,
        teacher_name: emp.name_english,
        teacher_code: emp.teacher_code,
        submitted_by: 'Clerk Submitter',
        benefit_type: 'Pension',
        qualifying_service: qualifyingService,
        last_basic_pay: emp.pay_7th,
        average_emoluments: averageEmoluments,
        pension: pensionVal,
        family_pension: familyPensionVal,
        commutation_percent: commutationPercent,
        commuted_value: commutedVal,
        reduced_pension: reducedPensionVal,
        bank_name: bankName,
        bank_account: bankAccount,
        ifsc_code: ifscCode,
        remarks: clerkRemarks
      })
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

  const handleApproverAction = (statusVal) => {
    if (statusVal === 'Rejected' && !approverRemarks.trim()) {
      alert('Remarks are required for rejecting a proposal.');
      return;
    }
    setActionLoading(true);

    fetch(`/api/proposals/${proposal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: statusVal,
        approved_by: 'Higher Authority',
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
          alert('Failed to update proposal: ' + d.error);
        }
      })
      .catch((err) => {
        setActionLoading(false);
        alert('Error: ' + err.message);
      });
  };

  // Live computations for form
  const computedPension = Math.round(Number(averageEmoluments || 0) * 0.50);
  const computedFamilyPension = Math.round(Number(averageEmoluments || 0) * 0.30);
  const computedCommutedMonthly = computedPension * (Number(commutationPercent || 0) / 100);
  const computedCommutedLump = Math.round(computedCommutedMonthly * 12 * 8.371);
  const computedReducedPension = Math.round(computedPension - computedCommutedMonthly);

  const initials = emp?.name_english
    ? emp.name_english.split(' ').slice(0, 2).map((n) => n[0]).join('')
    : '?';

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
              <Link href="/employees" className="btn btn-primary" style={{ marginTop: '1rem' }}>← Back to Employees</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
            <Link href="/employees" className="btn btn-ghost btn-sm">← Back</Link>
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

            <DetailCard
              title="Pension Proposal & Settlement"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              }
            >
              {proposal ? (
                /* CASE: Proposal Exists */
                <div style={{ padding: '0.25rem 0' }}>
                  <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Proposal Status:</span>
                    <span className={`badge ${
                      proposal.status === 'Approved' ? 'badge-green' : (proposal.status === 'Rejected' ? 'badge-red' : 'badge-orange')
                    }`}>
                      {proposal.status}
                    </span>
                  </div>

                  <DetailRow label="Qualifying Service" value={`${proposal.qualifying_service} Years`} />
                  <DetailRow label="Average Emoluments" value={`₹${Number(proposal.average_emoluments).toLocaleString()}`} />
                  <DetailRow label="Monthly Pension" value={`₹${Number(proposal.pension).toLocaleString()}`} accent="var(--accent-primary)" />
                  <DetailRow label="Family Pension" value={`₹${Number(proposal.family_pension).toLocaleString()}`} />
                  <DetailRow label="Commutation %" value={`${proposal.commutation_percent}%`} />
                  <DetailRow label="Commuted Value (Lump)" value={`₹${Number(proposal.commuted_value).toLocaleString()}`} accent="var(--accent-green)" />
                  <DetailRow label="Reduced Pension (Net)" value={`₹${Number(proposal.reduced_pension).toLocaleString()}`} accent="var(--accent-green)" />
                  
                  <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>DISBURSEMENT BANK DETAILS</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{proposal.bank_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>A/C: {proposal.bank_account} | IFSC: {proposal.ifsc_code}</div>
                  </div>

                  <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-light)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <div>Submitted by: <strong>{proposal.submitted_by}</strong></div>
                    {proposal.approved_by && <div style={{ marginTop: '0.15rem' }}>Sanctioned by: <strong>{proposal.approved_by}</strong></div>}
                    {proposal.remarks && <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.4rem', background: 'var(--bg-primary)', borderRadius: '4px' }}>Remarks: &quot;{proposal.remarks}&quot;</div>}
                  </div>

                  {proposal.status === 'Pending' && role === 'Approver' && (
                    <form onSubmit={(e) => { e.preventDefault(); }} style={{ padding: '1rem', borderTop: '1px solid var(--border-light)', background: 'rgba(59, 130, 246, 0.02)' }}>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Approver Remarks</label>
                        <textarea
                          placeholder="Add approval notes or rejection reason..."
                          className="search-input"
                          style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.78rem', height: '50px' }}
                          value={approverRemarks}
                          onChange={(e) => setApproverRemarks(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button type="button" disabled={actionLoading} onClick={() => handleApproverAction('Rejected')} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)', borderColor: 'rgba(239,68,68,0.3)' }}>
                          Reject Proposal
                        </button>
                        <button type="button" disabled={actionLoading} onClick={() => handleApproverAction('Approved')} className="btn btn-primary btn-sm" style={{ background: 'var(--accent-green)' }}>
                          Approve & Sanction
                        </button>
                      </div>
                    </form>
                  )}

                  {proposal.status === 'Pending' && role === 'Clerk' && (
                    <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)' }}>
                      ⏳ This proposal is pending approval by higher authorities.
                    </div>
                  )}
                </div>
              ) : (
                /* CASE: No Proposal Yet */
                <div>
                  {benefits && !benefits.eligible ? (
                    <div style={{ padding: '1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      ⚠️ {benefits.reason}
                    </div>
                  ) : benefits ? (
                    <>
                      {!showProposalForm ? (
                        /* Default display: estimates & initiate action */
                        <>
                          <DetailRow label="Estimated Pension" value={benefits.pension} accent="var(--accent-primary)" />
                          <DetailRow label="Completed Service" value={`${benefits.yearsOfService} Years`} />
                          
                          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {role === 'Clerk' ? (
                              <button onClick={() => setShowProposalForm(true)} className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                                📁 Initiate Pension Proposal
                              </button>
                            ) : role === 'Approver' ? (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                                ⚠️ No pension proposal has been submitted yet for this employee.
                              </div>
                            ) : (
                              <Link href="/login" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                                🔒 Sign In to Propose Pension
                              </Link>
                            )}
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: '1.4', textAlign: 'center' }}>
                              * Estimates based on Gujarat Civil Services Rules under 7th Pay.
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Clerk Form */
                        <form onSubmit={handleCreateProposal} style={{ padding: '1rem', borderTop: '1px solid var(--border-light)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Qualifying Service (Yrs)</label>
                              <input
                                type="number"
                                className="search-input"
                                style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.78rem' }}
                                value={qualifyingService}
                                onChange={(e) => setQualifyingService(e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Avg Emoluments (Basic)</label>
                              <input
                                type="number"
                                className="search-input"
                                style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.78rem' }}
                                value={averageEmoluments}
                                onChange={(e) => setAverageEmoluments(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Commutation % (Max 40%)</label>
                              <select
                                className="filter-select"
                                style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.78rem', height: '31px' }}
                                value={commutationPercent}
                                onChange={(e) => setCommutationPercent(Number(e.target.value))}
                              >
                                <option value="0">No Commutation (0%)</option>
                                <option value="10">10%</option>
                                <option value="20">20%</option>
                                <option value="30">30%</option>
                                <option value="40">Maximum (40%)</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Commuted Value (Lump)</label>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', padding: '0.4rem 0', fontSize: '0.85rem' }}>
                                ₹{computedCommutedLump.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <div style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '6px', marginBottom: '1rem', border: '1px solid var(--border-light)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                              <span>Full Monthly Pension:</span>
                              <strong>₹{computedPension.toLocaleString()}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                              <span>Family Pension:</span>
                              <strong>₹{computedFamilyPension.toLocaleString()}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderTop: '1px dashed var(--border)', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
                              <span>Reduced Pension (Mo):</span>
                              <strong style={{ color: 'var(--accent-green)' }}>₹{computedReducedPension.toLocaleString()}</strong>
                            </div>
                          </div>

                          <div style={{ marginBottom: '0.75rem' }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Bank Name</label>
                            <input
                              type="text"
                              placeholder="State Bank of India"
                              className="search-input"
                              style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.78rem' }}
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              required
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Account Number</label>
                              <input
                                type="text"
                                className="search-input"
                                style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.78rem' }}
                                value={bankAccount}
                                onChange={(e) => setBankAccount(e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>IFSC Code</label>
                              <input
                                type="text"
                                placeholder="SBIN0001234"
                                className="search-input"
                                style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.78rem' }}
                                value={ifscCode}
                                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                                required
                              />
                            </div>
                          </div>

                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Remarks</label>
                            <textarea
                              placeholder="Submission remarks / justifications..."
                              className="search-input"
                              style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.78rem', height: '40px', resize: 'vertical' }}
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
