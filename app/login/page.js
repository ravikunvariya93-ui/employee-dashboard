'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [role, setRole] = useState('Salary School'); // 'Salary School', 'TPEO', 'DPEO', 'DPPF'
  const [taluka, setTaluka] = useState('SHIHOR'); // Default taluka for TPEO
  const [talukaList, setTalukaList] = useState([]);
  const [salarySchoolList, setSalarySchoolList] = useState([]);
  const [selectedSalarySchool, setSelectedSalarySchool] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const TALUKAS = [
    'BHAVNAGAR', 'GARIYADHAR', 'GHOGHA', 'JESAR', 'MAHUVA',
    'PALITANA', 'SHIHOR', 'TALAJA', 'UMRALA', 'VALLBHIPUR'
  ];

  useEffect(() => {
    // Clear existing session
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_taluka');
    localStorage.removeItem('user_salary_school');

    // Fetch distinct talukas list
    fetch('/api/talukas')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data && json.data.length > 0) {
          setTalukaList(json.data);
          setTaluka(json.data[0]);
        }
      })
      .catch((err) => console.error(err));

    // Fetch distinct salary schools list
    fetch('/api/salary-schools')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setSalarySchoolList(json.data);
          if (json.data.length > 0) {
            setSelectedSalarySchool(json.data[0]);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      // Validation
      if (role === 'Salary School' && password !== 'school123') {
        setError('Invalid password for Salary School role (use school123)');
        setLoading(false);
        return;
      }
      if (role === 'TPEO' && password !== 'tpeo123') {
        setError('Invalid password for TPEO role (use tpeo123)');
        setLoading(false);
        return;
      }
      if (role === 'DPEO' && password !== 'dpeo123') {
        setError('Invalid password for DPEO role (use dpeo123)');
        setLoading(false);
        return;
      }
      if (role === 'DPPF' && password !== 'dppf123') {
        setError('Invalid password for DPPF role (use dppf123)');
        setLoading(false);
        return;
      }

      localStorage.setItem('user_role', role);
      if (role === 'TPEO') {
        localStorage.setItem('user_name', `TPEO - ${taluka}`);
        localStorage.setItem('user_taluka', taluka);
      } else if (role === 'Salary School') {
        localStorage.setItem('user_name', `Salary School - ${selectedSalarySchool}`);
        localStorage.setItem('user_salary_school', selectedSalarySchool);
      } else {
        localStorage.setItem('user_name', role);
      }
      
      router.push('/');
      router.refresh();
    }, 600);
  };

  const getExpectedPassword = () => {
    if (role === 'Salary School') return 'school123';
    if (role === 'TPEO') return 'tpeo123';
    if (role === 'DPEO') return 'dpeo123';
    return 'dppf123';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #064e3b 0%, #022c22 60%, #062019 100%)',
      fontFamily: "'Segoe UI', Aptos, -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle Background Glow Orbs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(0,0,0,0) 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(5, 150, 105, 0.15) 0%, rgba(0,0,0,0) 70%)',
        pointerEvents: 'none'
      }} />

      <div className="fade-in" style={{
        width: '100%',
        maxWidth: '450px',
        padding: '2.5rem 2.25rem',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(2, 44, 34, 0.35)',
        border: '1px solid #a7f3d0',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header Badge & Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)'
          }}>
            🏫
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#064e3b', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
            EduBVN Pension Portal
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600 }}>
            District Primary Education Office • Bhavnagar
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '0.75rem',
            fontSize: '0.8rem',
            marginBottom: '1.25rem',
            fontWeight: 600,
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Role Selector Tabs */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#065f46', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Select User Role
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.35rem',
              background: '#ecfdf5',
              padding: '0.35rem',
              borderRadius: '14px',
              border: '1px solid #a7f3d0'
            }}>
              {[
                { id: 'Salary School', label: 'Salary School', icon: '🏫' },
                { id: 'TPEO', label: 'TPEO', icon: '🏛️' },
                { id: 'DPEO', label: 'DPEO', icon: '🏢' },
                { id: 'DPPF', label: 'DPPF', icon: '📜' },
              ].map((r) => {
                const isActive = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    style={{
                      padding: '0.65rem 0.15rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: isActive ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'transparent',
                      color: isActive ? '#ffffff' : '#065f46',
                      fontWeight: isActive ? 700 : 600,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 4px 12px rgba(5, 150, 105, 0.3)' : 'none',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.15rem',
                      transform: isActive ? 'scale(1.02)' : 'scale(1)'
                    }}
                  >
                    <span style={{ fontSize: '0.85rem' }}>{r.icon}</span>
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Role Option Field Slot — Fixed height slot to keep card height identical across all roles */}
          <div style={{ minHeight: '74px', marginBottom: '1.25rem' }}>
            {role === 'Salary School' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#065f46', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Select Salary School (Pay Center)
                </label>
                <select
                  value={selectedSalarySchool}
                  onChange={(e) => setSelectedSalarySchool(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid #a7f3d0',
                    background: '#f0fdf4',
                    color: '#064e3b',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#059669'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#a7f3d0'; e.target.style.boxShadow = 'none'; }}
                >
                  {salarySchoolList.length > 0 ? (
                    salarySchoolList.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))
                  ) : (
                    <option value="">Loading Salary Schools...</option>
                  )}
                </select>
              </div>
            )}

            {role === 'TPEO' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#065f46', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Select Taluka (Location)
                </label>
                <select
                  value={taluka}
                  onChange={(e) => setTaluka(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid #a7f3d0',
                    background: '#f0fdf4',
                    color: '#064e3b',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#059669'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#a7f3d0'; e.target.style.boxShadow = 'none'; }}
                >
                  {(talukaList.length > 0 ? talukaList : TALUKAS).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            {(role === 'DPEO' || role === 'DPPF') && (
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#065f46', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Location
                </label>
                <div style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #a7f3d0',
                  background: '#f0fdf4',
                  color: '#047857',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>📍</span>
                  <span>{role === 'DPEO' ? 'Bhavnagar' : 'Gandhinagar'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#065f46', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Password
            </label>
            <input
              type="password"
              placeholder={`Enter password for ${role}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid #a7f3d0',
                background: '#ffffff',
                color: '#064e3b',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#059669'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#a7f3d0'; e.target.style.boxShadow = 'none'; }}
            />
            <div style={{ fontSize: '0.72rem', color: '#047857', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Demo Password:</span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', fontWeight: 700, color: '#059669', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: '0.72rem' }}
                onClick={() => setPassword(getExpectedPassword())}
              >
                Auto-fill ({getExpectedPassword()})
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.8rem',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 16px rgba(5, 150, 105, 0.3)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {loading ? 'Signing in…' : 'Sign In ➔'}
          </button>
        </form>
      </div>
    </div>
  );
}
