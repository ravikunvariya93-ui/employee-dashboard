'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [role, setRole] = useState('Group School'); // 'Group School', 'TPEO', 'DPEO'
  const [taluka, setTaluka] = useState('Shihor'); // Default taluka for TPEO
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const TALUKAS = [
    'Bhavnagar', 'Gariadhar', 'Ghogha', 'Jesar', 'Mahuva',
    'Palitana', 'Shihor', 'Talaja', 'Umrala', 'Vallabhipur'
  ];

  useEffect(() => {
    // Clear existing session
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_taluka');
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      // Mock validation
      if (role === 'Group School' && password !== 'school123') {
        setError('Invalid password for Group School role (use school123)');
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
      } else {
        localStorage.setItem('user_name', role);
      }
      
      router.push('/');
      router.refresh();
    }, 600);
  };

  const getExpectedPassword = () => {
    if (role === 'Group School') return 'school123';
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
      background: 'var(--bg-primary)',
      fontFamily: "'Inter', sans-serif",
      padding: '1rem'
    }}>
      <div className="chart-card fade-in" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '2.5rem',
        boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
        borderRadius: '16px',
        border: '1px solid var(--border)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'var(--gradient-primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            margin: '0 auto 1rem',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
          }}>
            🔑
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Pension Management Portal
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Log in to manage pension proposals and approvals
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.06)',
            color: 'var(--accent-red)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            borderRadius: '8px',
            padding: '0.75rem',
            fontSize: '0.8rem',
            marginBottom: '1.25rem',
            fontWeight: 500,
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select User Role
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setRole('Group School')}
                style={{
                  padding: '0.65rem 0.15rem',
                  borderRadius: '8px',
                  border: '1px solid ' + (role === 'Group School' ? 'var(--accent-primary)' : 'var(--border)'),
                  background: role === 'Group School' ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                  color: role === 'Group School' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center'
                }}
              >
                School
              </button>
              <button
                type="button"
                onClick={() => setRole('TPEO')}
                style={{
                  padding: '0.65rem 0.15rem',
                  borderRadius: '8px',
                  border: '1px solid ' + (role === 'TPEO' ? 'var(--accent-primary)' : 'var(--border)'),
                  background: role === 'TPEO' ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                  color: role === 'TPEO' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center'
                }}
              >
                TPEO
              </button>
              <button
                type="button"
                onClick={() => setRole('DPEO')}
                style={{
                  padding: '0.65rem 0.15rem',
                  borderRadius: '8px',
                  border: '1px solid ' + (role === 'DPEO' ? 'var(--accent-primary)' : 'var(--border)'),
                  background: role === 'DPEO' ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                  color: role === 'DPEO' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center'
                }}
              >
                DPEO
              </button>
              <button
                type="button"
                onClick={() => setRole('DPPF')}
                style={{
                  padding: '0.65rem 0.15rem',
                  borderRadius: '8px',
                  border: '1px solid ' + (role === 'DPPF' ? 'var(--accent-primary)' : 'var(--border)'),
                  background: role === 'DPPF' ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                  color: role === 'DPPF' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center'
                }}
              >
                DPPF
              </button>
            </div>
          </div>

          {role === 'TPEO' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Select Taluka (Officer Area)
              </label>
              <select
                className="filter-select"
                value={taluka}
                onChange={(e) => setTaluka(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px' }}
              >
                {TALUKAS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Password
            </label>
            <input
              type="password"
              placeholder={`Enter ${getExpectedPassword()}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: '#ffffff',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Demo Password:</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => setPassword(getExpectedPassword())}>
                Auto-fill ({getExpectedPassword()})
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
