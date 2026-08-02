'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

export default function UserManagementPage() {
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    dpeo: 0,
    tpeo: 0,
    salarySchool: 0,
    dppf: 0,
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [talukaFilter, setTalukaFilter] = useState('');

  // Dropdown options
  const [talukaList, setTalukaList] = useState([]);
  const [salarySchoolList, setSalarySchoolList] = useState([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordResetUser, setPasswordResetUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [activeMenuUserId, setActiveMenuUserId] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    role: 'TPEO',
    taluka: 'SHIHOR',
    salary_school: '',
    password: '',
    phone: '',
    email: '',
    address: '',
    office_name_gujarati: '',
    office_stamp: '',
    status: 'active',
  });

  const [newPassword, setNewPassword] = useState('');
  const [toast, setToast] = useState(null);

  const TALUKAS = [
    'BHAVNAGAR', 'GARIYADHAR', 'GHOGHA', 'JESAR', 'MAHUVA',
    'PALITANA', 'SHIHOR', 'TALAJA', 'UMRALA', 'VALLBHIPUR'
  ];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    const name = localStorage.getItem('user_name') || '';
    setCurrentUserRole(role);
    setCurrentUserName(name);

    fetch('/api/talukas')
      .then(r => r.json())
      .then(d => { if (d.success) setTalukaList(d.data || TALUKAS); })
      .catch(() => setTalukaList(TALUKAS));

    fetch('/api/salary-schools')
      .then(r => r.json())
      .then(d => { if (d.success) setSalarySchoolList(d.data || []); })
      .catch(() => setSalarySchoolList([]));

    fetchUsers();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, roleFilter, statusFilter, talukaFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (talukaFilter) params.append('taluka', talukaFilter);

      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        if (data.stats) setStats(data.stats);
      } else {
        showToast(data.error || 'Failed to fetch users', 'error');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      showToast('Error connecting to server', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add User submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User "${data.user.username}" created successfully!`);
        setIsAddModalOpen(false);
        resetForm();
        fetchUsers();
      } else {
        showToast(data.error || 'Failed to create user', 'error');
      }
    } catch (err) {
      showToast('Server error while creating user', 'error');
    }
  };

  // Edit User submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User account updated successfully!`);
        setEditingUser(null);
        fetchUsers();
      } else {
        showToast(data.error || 'Failed to update user', 'error');
      }
    } catch (err) {
      showToast('Server error while updating user', 'error');
    }
  };

  // Toggle User Status (Suspend / Activate)
  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User ${user.username} is now ${newStatus}`);
        fetchUsers();
      } else {
        showToast(data.error || 'Failed to toggle status', 'error');
      }
    } catch (err) {
      showToast('Error updating status', 'error');
    }
  };

  // Reset Password submit
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordResetUser || !newPassword) return;
    try {
      const res = await fetch(`/api/users/${passwordResetUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Password for ${passwordResetUser.username} updated!`);
        setPasswordResetUser(null);
        setNewPassword('');
      } else {
        showToast(data.error || 'Failed to reset password', 'error');
      }
    } catch (err) {
      showToast('Error resetting password', 'error');
    }
  };

  // Delete User submit
  const handleDeleteSubmit = async () => {
    if (!deletingUser) return;
    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User ${deletingUser.username} deleted.`);
        setDeletingUser(null);
        fetchUsers();
      } else {
        showToast(data.error || 'Failed to delete user', 'error');
      }
    } catch (err) {
      showToast('Error deleting user', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      name: '',
      role: 'TPEO',
      taluka: 'SHIHOR',
      salary_school: '',
      password: '',
      phone: '',
      email: '',
      address: '',
      office_name_gujarati: '',
      office_stamp: '',
      status: 'active',
    });
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789#@!';
    let pass = '';
    for (let i = 0; i < 9; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // Helper for Role Badges
  const getRoleBadge = (role) => {
    switch (role) {
      case 'DPEO':
        return { bg: '#dcfce7', color: '#15803d', border: '#86efac', icon: '🛡️' };
      case 'TPEO':
        return { bg: '#ccfbf1', color: '#0f766e', border: '#99f6e4', icon: '🏛️' };
      case 'Salary School':
        return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', icon: '🏫' };
      case 'DPPF':
        return { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff', icon: '📜' };
      default:
        return { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb', icon: '👤' };
    }
  };

  // Access restricted screen for non-DPEO users
  if (currentUserRole && currentUserRole !== 'DPEO') {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '3rem' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '3rem 2.5rem',
            maxWidth: '520px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
            border: '1px solid #fee2e2'
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔒</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.75rem' }}>
              Access Restricted
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              User Control & Access Management is restricted exclusively to <strong>DPEO (District Primary Education Officer)</strong> administrators.
            </p>
            <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', fontSize: '0.82rem', color: '#b91c1c' }}>
              Logged in as: <strong>{currentUserName || currentUserRole}</strong> ({currentUserRole})
            </div>
            <Link href="/" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', borderRadius: '12px', fontWeight: 700 }}>
              Return to Pension Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content">
        
        {/* Dashboard Topbar */}
        <div className="topbar">
          <div>
            <div className="topbar-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span>👥 DPEO User Management</span>
              <span className="badge" style={{ background: '#059669', color: '#ffffff', fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: '20px' }}>
                🛡️ Master Control
              </span>
            </div>
            <div className="topbar-subtitle">
              District Primary Education Office • Bhavnagar | Complete User Account Administration
            </div>
          </div>
          <div className="topbar-actions">
            <button
              onClick={() => { resetForm(); setIsAddModalOpen(true); }}
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 700 }}
            >
              ➕ Add New User
            </button>
          </div>
        </div>

        <div className="page-container" style={{ paddingTop: '1.5rem' }}>
          
          {/* Floating Toast */}
          {toast && (
            <div className="fade-in" style={{
              position: 'fixed',
              top: '80px',
              right: '24px',
              zIndex: 9999,
              background: toast.type === 'error' ? '#fef2f2' : '#ecfdf5',
              color: toast.type === 'error' ? '#991b1b' : '#065f46',
              border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
              padding: '0.85rem 1.35rem',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <span>{toast.type === 'error' ? '❌' : '✅'}</span>
              <span>{toast.message}</span>
            </div>
          )}

          {/* Stat Cards Grid (5 Cards) */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <div className="stat-icon blue">👥</div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total System Users</div>
            </div>

            <div className="stat-card green">
              <div className="stat-icon green">✅</div>
              <div className="stat-value">{stats.active}</div>
              <div className="stat-label">Active Accounts</div>
            </div>

            <div className="stat-card orange">
              <div className="stat-icon orange">⚠️</div>
              <div className="stat-value">{stats.suspended}</div>
              <div className="stat-label">Suspended Accounts</div>
            </div>

            <div className="stat-card purple">
              <div className="stat-icon purple">🏛️</div>
              <div className="stat-value">{stats.tpeo}</div>
              <div className="stat-label">TPEO Taluka Officers</div>
            </div>

            <div className="stat-card blue">
              <div className="stat-icon blue">🏫</div>
              <div className="stat-value">{stats.salarySchool}</div>
              <div className="stat-label">Pay Center Schools</div>
            </div>
          </div>

          {/* Dashboard Table Card */}
          <div className="table-card">
            
            {/* Table Toolbar / Filters */}
            <div className="table-header">
              <div>
                <div className="table-title">System User Directory ({users.length})</div>
                <div className="table-meta">Manage system credentials, roles, assignments, and active status</div>
              </div>

              <div className="table-toolbar">
                {/* Search */}
                <input
                  type="text"
                  placeholder="🔍 Search name, username, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '0.82rem',
                    background: '#ffffff',
                    color: 'var(--text-primary)',
                    minWidth: '220px',
                    outline: 'none'
                  }}
                />

                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '0.82rem',
                    background: '#ffffff',
                    color: 'var(--text-primary)',
                    fontWeight: 600
                  }}
                >
                  <option value="">All Roles</option>
                  <option value="DPEO">🛡️ DPEO</option>
                  <option value="TPEO">🏛️ TPEO</option>
                  <option value="Salary School">🏫 Salary School</option>
                  <option value="DPPF">📜 DPPF</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '0.82rem',
                    background: '#ffffff',
                    color: 'var(--text-primary)',
                    fontWeight: 600
                  }}
                >
                  <option value="">All Status</option>
                  <option value="active">🟢 Active</option>
                  <option value="suspended">🔴 Suspended</option>
                </select>

                {/* Taluka Filter */}
                <select
                  value={talukaFilter}
                  onChange={(e) => setTalukaFilter(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '0.82rem',
                    background: '#ffffff',
                    color: 'var(--text-primary)',
                    fontWeight: 600
                  }}
                >
                  <option value="">All Talukas</option>
                  {TALUKAS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                {(searchQuery || roleFilter || statusFilter || talukaFilter) && (
                  <button
                    onClick={() => { setSearchQuery(''); setRoleFilter(''); setStatusFilter(''); setTalukaFilter(''); }}
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                  >
                    Clear ✕
                  </button>
                )}
              </div>
            </div>

            {/* Dashboard Table */}
            {loading ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: '#059669', fontWeight: 700 }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⌛</div>
                Loading User Directory...
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
                <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>No users match filters</div>
                <div style={{ fontSize: '0.82rem' }}>Adjust search terms or clear active filters</div>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                      <th style={{ minWidth: '200px' }}>User / Account</th>
                      <th style={{ minWidth: '130px' }}>Role</th>
                      <th style={{ minWidth: '220px' }}>Location / Pay Center</th>
                      <th style={{ minWidth: '160px' }}>Contact</th>
                      <th style={{ width: '110px' }}>Status</th>
                      <th style={{ minWidth: '200px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, idx) => {
                      const rBadge = getRoleBadge(u.role);
                      const isSuspended = u.status === 'suspended';
                      const isMenuOpen = activeMenuUserId === u.id;

                      return (
                        <tr key={u.id} style={{ background: isSuspended ? '#fffefc' : undefined }}>
                          {/* Row # */}
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                            {idx + 1}
                          </td>

                          {/* Account */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: rBadge.bg,
                                border: `1px solid ${rBadge.border}`,
                                color: rBadge.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '1rem',
                                flexShrink: 0
                              }}>
                                {rBadge.icon}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#064e3b', fontSize: '0.88rem' }}>{u.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#059669', fontFamily: 'monospace' }}>@{u.username}</div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              background: rBadge.bg,
                              color: rBadge.color,
                              border: `1px solid ${rBadge.border}`,
                              padding: '0.25rem 0.6rem',
                              borderRadius: '10px',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}>
                              <span>{rBadge.icon}</span>
                              <span>{u.role}</span>
                            </span>
                          </td>

                          {/* Location / Pay Center */}
                          <td>
                            {u.salary_school ? (
                              <div>
                                <div style={{ fontWeight: 700, color: '#0c4a6e', fontSize: '0.82rem' }}>{u.salary_school}</div>
                                <div style={{ fontSize: '0.72rem', color: '#0369a1' }}>Taluka: {u.taluka || '—'}</div>
                              </div>
                            ) : u.taluka ? (
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f766e', fontSize: '0.82rem' }}>Taluka: {u.taluka}</div>
                                <div style={{ fontSize: '0.72rem', color: '#0d9488' }}>Bhavnagar District</div>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>District Level</span>
                            )}
                          </td>

                          {/* Contact */}
                          <td style={{ fontSize: '0.78rem', color: '#475569', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal' }}>
                            <div>📞 {u.phone || '—'}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>✉️ {u.email || '—'}</div>
                            {u.office_name_gujarati && (
                              <div style={{ fontSize: '0.72rem', color: '#0369a1', marginTop: '0.15rem', fontWeight: 600 }}>🏛️ {u.office_name_gujarati}</div>
                            )}
                            {u.address && (
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.1rem' }}>📍 {u.address}</div>
                            )}
                          </td>

                          {/* Status */}
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.25rem 0.55rem',
                              borderRadius: '20px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              background: isSuspended ? '#fef2f2' : '#dcfce7',
                              color: isSuspended ? '#b91c1c' : '#15803d',
                              border: `1px solid ${isSuspended ? '#fecaca' : '#86efac'}`
                            }}>
                              <span>{isSuspended ? '🔴' : '🟢'}</span>
                              <span>{isSuspended ? 'Suspended' : 'Active'}</span>
                            </span>
                          </td>

                          {/* Actions: Clean 1-click DPEO Control Buttons */}
                          <td className="actions-cell">
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                              {/* EDIT Button */}
                              <button
                                onClick={() => setEditingUser({ ...u })}
                                className="btn btn-primary btn-sm"
                                title="Edit Name, Username, Role, Location, Contact, Status"
                                style={{ padding: '0.3rem 0.65rem', fontWeight: 700, fontSize: '0.78rem' }}
                              >
                                ✏️ Edit
                              </button>

                              {/* Reset Password */}
                              <button
                                onClick={() => { setPasswordResetUser(u); setNewPassword(''); }}
                                className="btn btn-ghost btn-sm"
                                title="Reset User Password"
                                style={{ padding: '0.3rem 0.6rem', color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff', fontWeight: 700, fontSize: '0.78rem' }}
                              >
                                🔑 Pass
                              </button>

                              {/* Toggle Status */}
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className="btn btn-ghost btn-sm"
                                title={isSuspended ? 'Activate User Account' : 'Suspend User Account'}
                                style={{
                                  padding: '0.3rem 0.65rem',
                                  color: isSuspended ? '#15803d' : '#c2410c',
                                  borderColor: isSuspended ? '#86efac' : '#fed7aa',
                                  background: isSuspended ? '#dcfce7' : '#fff7ed',
                                  fontWeight: 700,
                                  fontSize: '0.78rem'
                                }}
                              >
                                {isSuspended ? '▶️ Activate' : '⏸️ Suspend'}
                              </button>

                              {/* Delete Account */}
                              <button
                                onClick={() => setDeletingUser(u)}
                                className="btn btn-ghost btn-sm"
                                title="Delete User Account"
                                style={{ padding: '0.3rem 0.55rem', color: '#b91c1c', borderColor: '#fee2e2', background: '#fef2f2', fontWeight: 700, fontSize: '0.78rem' }}
                              >
                                🗑️
                              </button>
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

        {/* MODAL 1: Add New User */}
        {isAddModalOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 44, 34, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}>
            <div className="fade-in" style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '560px',
              padding: '2rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              border: '1px solid #a7f3d0',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#064e3b', margin: 0 }}>
                    ➕ Register New System User
                  </h2>
                  <p style={{ fontSize: '0.78rem', color: '#047857', margin: 0, fontWeight: 600 }}>
                    Assign credentials & administrative scope
                  </p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 700, color: '#475569' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    System Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.7rem',
                      borderRadius: '10px',
                      border: '1px solid #a7f3d0',
                      background: '#f0fdf4',
                      color: '#064e3b',
                      fontSize: '0.85rem',
                      fontWeight: 700
                    }}
                  >
                    <option value="DPEO">🛡️ DPEO (District Officer / Super Admin)</option>
                    <option value="TPEO">🏛️ TPEO (Taluka Primary Education Officer)</option>
                    <option value="Salary School">🏫 Salary School (Pay Center Administrator)</option>
                    <option value="DPPF">📜 DPPF (District Pension & PPF Officer)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    Full Display Name / Office Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TPEO Shihor Main Office or Rajesh V. Patel"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    Login Username *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. tpeo_shihor_admin"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.85rem', fontFamily: 'monospace' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    Initial Password *
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Assign password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.85rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, password: generateRandomPassword() })}
                      style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', padding: '0.7rem 0.9rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      🎲 Auto
                    </button>
                  </div>
                </div>

                {(formData.role === 'TPEO' || formData.role === 'Salary School') && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                      Assigned Taluka
                    </label>
                    <select
                      value={formData.taluka}
                      onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
                      style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.85rem' }}
                    >
                      {TALUKAS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.role === 'Salary School' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                      Salary School Name (Pay Center)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SHIHOR KANYA SHALA NO 1"
                      value={formData.salary_school}
                      onChange={(e) => setFormData({ ...formData, salary_school: e.target.value })}
                      style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.85rem' }}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 00000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="office@gujarat.gov.in"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    📍 Office Address
                  </label>
                  <textarea
                    placeholder="e.g. Collector Office Road, Bhavnagar - 364001"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.82rem', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    🏛️ Office Name in Gujarati (ગુજરાતી)
                  </label>
                  <input
                    type="text"
                    placeholder="ગુજરાતીમાં કાર્યાલયનું નામ..."
                    value={formData.office_name_gujarati}
                    onChange={(e) => setFormData({ ...formData, office_name_gujarati: e.target.value })}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.88rem', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    💮 Office Stamp Text
                  </label>
                  <input
                    type="text"
                    placeholder="જિલ્લા પંચાયત, ભાવનગર or તાલુકા પંચાયત, માહુવા or custom text"
                    value={formData.office_stamp}
                    onChange={(e) => setFormData({ ...formData, office_stamp: e.target.value })}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.9rem', fontFamily: 'inherit' }}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                    ℹ️ This text will appear as the official office stamp on printed documents
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    style={{ background: '#f1f5f9', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 700 }}
                  >
                    Create User Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Edit User */}
        {editingUser && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 44, 34, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}>
            <div className="fade-in" style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '540px',
              padding: '2rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              border: '1px solid #a7f3d0',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#064e3b', margin: 0 }}>
                    ✏️ Edit User: @{editingUser.username}
                  </h2>
                  <p style={{ fontSize: '0.78rem', color: '#047857', margin: 0, fontWeight: 600 }}>
                    Modify system role, location, or contact details
                  </p>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: 700, color: '#475569' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    Login Username *
                  </label>
                  <input
                    type="text"
                    value={editingUser.username || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    Display Name / Office Name *
                  </label>
                  <input
                    type="text"
                    value={editingUser.name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    Change Password (Optional)
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Enter new password (optional)"
                      value={editingUser.password || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                      style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.85rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, password: generateRandomPassword() })}
                      style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', padding: '0.7rem 0.9rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      🎲 Auto
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    System Role
                  </label>
                  <select
                    value={editingUser.role || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.85rem', fontWeight: 700 }}
                  >
                    <option value="DPEO">🛡️ DPEO Admin</option>
                    <option value="TPEO">🏛️ TPEO Officer</option>
                    <option value="Salary School">🏫 Salary School Admin</option>
                    <option value="DPPF">📜 DPPF Officer</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    Assigned Taluka
                  </label>
                  <select
                    value={editingUser.taluka || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, taluka: e.target.value })}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.85rem' }}
                  >
                    <option value="">None / District Level</option>
                    {TALUKAS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    Salary School Name (Pay Center)
                  </label>
                  <input
                    type="text"
                    value={editingUser.salary_school || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, salary_school: e.target.value })}
                    placeholder="e.g. SHIHOR KANYA SHALA NO 1"
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={editingUser.phone || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={editingUser.email || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    📍 Office Address
                  </label>
                  <textarea
                    placeholder="e.g. Collector Office Road, Bhavnagar - 364001"
                    value={editingUser.address || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
                    rows={2}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.82rem', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    🏛️ Office Name in Gujarati (ગુજરાતી)
                  </label>
                  <input
                    type="text"
                    placeholder="ગુજરાતીમાં કાર્યાલયનું નામ..."
                    value={editingUser.office_name_gujarati || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, office_name_gujarati: e.target.value })}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.88rem', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    💮 Office Stamp Text
                  </label>
                  <input
                    type="text"
                    placeholder="જિલ્લા પંચાયત, ભાવનગર or તાલુકા પંચાયત, માહુવા or custom text"
                    value={editingUser.office_stamp || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, office_stamp: e.target.value })}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.9rem', fontFamily: 'inherit' }}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                    ℹ️ This text will appear as the official office stamp on printed documents
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    Account Status
                  </label>
                  <select
                    value={editingUser.status || 'active'}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.85rem', fontWeight: 700 }}
                  >
                    <option value="active">🟢 Active</option>
                    <option value="suspended">🔴 Suspended</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    style={{ background: '#f1f5f9', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 700 }}
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: Reset Password */}
        {passwordResetUser && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 44, 34, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}>
            <div className="fade-in" style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '460px',
              padding: '2rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              border: '1px solid #a7f3d0'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 0.75rem' }}>
                  🔑
                </div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#064e3b', margin: 0 }}>
                  Reset User Password
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600, marginTop: '0.25rem' }}>
                  User: <strong>{passwordResetUser.name}</strong> (@{passwordResetUser.username})
                </p>
              </div>

              <form onSubmit={handleResetPasswordSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    New Password
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      style={{ flex: 1, padding: '0.7rem', borderRadius: '10px', border: '1px solid #a7f3d0', fontSize: '0.85rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setNewPassword(generateRandomPassword())}
                      style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', padding: '0.7rem 0.9rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      🎲 Auto
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setPasswordResetUser(null)}
                    style={{ background: '#f1f5f9', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 700 }}
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: Delete Confirmation */}
        {deletingUser && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 44, 34, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}>
            <div className="fade-in" style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '440px',
              padding: '2rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              border: '1px solid #fecaca'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', margin: '0 auto 0.75rem', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)' }}>
                  ⚠️
                </div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#991b1b', margin: 0 }}>
                  Confirm User Deletion
                </h2>
                <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '0.5rem', lineHeight: '1.5' }}>
                  Are you sure you want to permanently delete the user account for <strong>{deletingUser.name}</strong> (@{deletingUser.username})?
                </p>
                <div style={{ background: '#fff1f2', border: '1px solid #ffe4e6', color: '#be123c', padding: '0.75rem', borderRadius: '10px', fontSize: '0.78rem', marginTop: '1rem', fontWeight: 600 }}>
                  This action removes all access for this user and cannot be undone.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setDeletingUser(null)}
                  style={{ background: '#f1f5f9', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  style={{ background: '#dc2626', border: 'none', padding: '0.75rem 1.75rem', borderRadius: '10px', fontWeight: 700, color: '#ffffff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)' }}
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
