'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

export default function SeedPage() {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState('');

  const handleSeed = async () => {
    setStatus('loading');
    setProgress('Connecting to database and reading XLS file...');
    setResult(null);

    try {
      const res = await fetch('/api/seed');
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setResult(data);
      } else {
        setStatus('error');
        setResult(data);
      }
    } catch (err) {
      setStatus('error');
      setResult({ error: err.message });
    }
  };

  const handleReset = async () => {
    if (!confirm('This will delete ALL teacher records from the database. Are you sure?')) return;
    setStatus('loading');
    setProgress('Dropping and recreating table...');
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatus('idle');
        setResult({ message: 'Database reset successfully. You can now re-seed.' });
      } else {
        setStatus('error');
        setResult(data);
      }
    } catch (err) {
      setStatus('error');
      setResult({ error: err.message });
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Data Import</div>
            <div className="topbar-subtitle">Seed the Neon PostgreSQL database from the XLS file</div>
          </div>
        </div>

        <div className="page-container">
          {/* Seed Hero */}
          <div className="seed-card fade-in">
            <div className="seed-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="seed-text">
              <h3>Import Teacher Data</h3>
              <p>
                Reads <strong>TEACHER_REPORT__report.xls</strong> from the parent directory and inserts all
                records into Neon PostgreSQL. Safe to run multiple times — skips if data already exists.
              </p>
            </div>
            <div className="seed-actions">
              <button
                onClick={handleSeed}
                disabled={status === 'loading'}
                className="btn btn-success"
                id="seed-btn"
              >
                {status === 'loading' ? (
                  <><div className="loading-spinner" /> Seeding...</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    Start Import
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Progress / Result */}
          {status === 'loading' && (
            <div className="chart-card fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="loading-spinner" style={{ width: 48, height: 48, borderWidth: 3, margin: '0 auto' }} />
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Importing Data...
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{progress}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
                This may take 2–4 minutes for ~6,000 records. Please keep this page open.
              </div>
            </div>
          )}

          {status === 'success' && result && (
            <div className="chart-card fade-in" style={{ borderColor: 'rgba(34, 211, 165, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(34, 211, 165, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
                }}>✅</div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {result.alreadySeeded ? 'Already Seeded' : 'Import Successful!'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{result.message}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <a href="/employees" className="btn btn-primary">
                  View Employees →
                </a>
                <a href="/" className="btn btn-ghost">
                  Dashboard →
                </a>
              </div>
            </div>
          )}

          {status === 'error' && result && (
            <div className="chart-card fade-in" style={{ borderColor: 'rgba(247, 90, 90, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(247, 90, 90, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
                }}>❌</div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Import Failed</div>
                  <div style={{ color: 'var(--accent-red)', fontSize: '0.85rem' }}>{result.error}</div>
                </div>
              </div>
              <button onClick={handleSeed} className="btn btn-primary">Retry</button>
            </div>
          )}

          {result && result.message && status === 'idle' && (
            <div className="chart-card fade-in" style={{ color: 'var(--accent-green)' }}>
              {result.message}
            </div>
          )}

          {/* Info Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
            <div className="chart-card fade-in stagger-1">
              <div className="chart-title">📁 Source File</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>TEACHER_REPORT__report.xls</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>~5,989 records, 35 columns</div>
            </div>
            <div className="chart-card fade-in stagger-2">
              <div className="chart-title">🗄️ Target Database</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Neon PostgreSQL</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Table: teachers</div>
            </div>
            <div className="chart-card fade-in stagger-3">
              <div className="chart-title">⚡ Batch Size</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>100 records per batch</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>~60 batches total</div>
            </div>
            <div className="chart-card fade-in stagger-4">
              <div className="chart-title">🔒 Idempotent</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Safe to run multiple times</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Skips if data exists</div>
            </div>
          </div>

          {/* Reset section */}
          <div className="chart-card fade-in" style={{ marginTop: '1.5rem', borderColor: 'rgba(247, 90, 90, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>⚠️ Reset Database</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Delete all records and reset the table. Use before re-importing.</div>
              </div>
              <button onClick={handleReset} className="btn btn-ghost btn-sm" style={{ borderColor: 'rgba(247, 90, 90, 0.4)', color: 'var(--accent-red)' }}>
                Reset DB
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
