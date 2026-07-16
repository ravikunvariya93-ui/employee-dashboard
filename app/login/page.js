'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [role, setRole] = useState('Clerk');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Clear existing session
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      // Mock validation
      if (role === 'Clerk' && password !== 'clerk123') {
        setError('Invalid password for Clerk role (use clerk123)');
        setLoading(false);
        return;
      }
      if (role === 'Approver' && password !== 'approver123') {
        setError('Invalid password for Approver role (use approver123)');
        setLoading(false);
        return;
      }

      localStorage.setItem('user_role', role);
      localStorage.setItem('user_name', role === 'Clerk' ? 'Clerk Submitter' : 'Higher Authority');
      
      router.push('/proposals');
      router.refresh();
    }, 600);
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
        maxWidth: '420px',
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
            Retirement Benefits Portal
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Log in to manage benefits proposals and approvals
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
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', uppercase: 'true' }}>
              SELECT USER ROLE
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setRole('Clerk')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid ' + (role === 'Clerk' ? 'var(--accent-primary)' : 'var(--border)'),
                  background: role === 'Clerk' ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                  color: role === 'Clerk' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Clerk / Submitter
              </button>
              <button
                type="button"
                onClick={() => setRole('Approver')}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid ' + (role === 'Approver' ? 'var(--accent-primary)' : 'var(--border)'),
                  background: role === 'Approver' ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                  color: role === 'Approver' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Approver (Authority)
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              PASSWORD
            </label>
            <input
              type="password"
              placeholder={role === 'Clerk' ? 'Enter clerk123' : 'Enter approver123'}
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
              <span style={{ fontWeight: 600, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => setPassword(role === 'Clerk' ? 'clerk123' : 'approver123')}>
                Auto-fill ({role === 'Clerk' ? 'clerk123' : 'approver123'})
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
