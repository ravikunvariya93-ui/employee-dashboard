'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import StatCard from '@/components/StatCard';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#4f8ef7', '#7c5af7', '#22d3a5', '#f7904f', '#f75a5a', '#f7d04f', '#c45af7', '#4fc7f7', '#5af78e', '#f75aad'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        fontSize: '0.8rem',
        color: 'var(--text-primary)',
      }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color || 'var(--accent-primary)', fontWeight: 600 }}>
            {p.value?.toLocaleString()}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <div className="loading-overlay">
            <div className="loading-spinner" />
            Loading dashboard data...
          </div>
        </main>
      </div>
    );
  }

  if (!stats || stats.error) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <div className="page-container">
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <div className="empty-title">No data found</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {stats?.error || 'Please import data first using the Data Import page.'}
              </p>
              <a href="/seed" className="btn btn-primary">Go to Data Import →</a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const salaryData = [
    { name: 'Fix Salary', value: stats.fixSalary, color: '#4f8ef7' },
    { name: 'Full Salary', value: stats.fullSalary, color: '#22d3a5' },
  ];

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Dashboard Overview</div>
            <div className="topbar-subtitle">Bhavnagar District Teacher Database</div>
          </div>
          <div className="topbar-actions">
            <a href="/employees" className="btn btn-primary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              </svg>
              View All Employees
            </a>
          </div>
        </div>

        <div className="page-container">
          {/* Stats Grid */}
          <div className="stats-grid">
            <StatCard
              value={stats.total}
              label="Total Teachers"
              variant="blue"
              delay={0}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
            <StatCard
              value={stats.totalSchools}
              label="Unique Schools"
              variant="green"
              delay={50}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              }
            />
            <StatCard
              value={stats.fixSalary}
              label="Fix Salary"
              variant="orange"
              delay={100}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
            />
            <StatCard
              value={stats.fullSalary}
              label="Full Salary"
              variant="purple"
              delay={150}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              }
            />
            <StatCard
              value={stats.byTaluka?.length}
              label="Talukas Covered"
              variant="green"
              delay={200}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
              }
            />
          </div>

          {/* Charts Row 1 */}
          <div className="charts-grid">
            {/* Teachers by Taluka */}
            <div className="chart-card fade-in stagger-1">
              <div className="chart-title">Teachers by Taluka</div>
              <div className="chart-subtitle">Distribution across administrative blocks</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.byTaluka} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
                  <XAxis
                    dataKey="taluka"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.byTaluka.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Salary Type Donut */}
            <div className="chart-card fade-in stagger-2">
              <div className="chart-title">Salary Type Split</div>
              <div className="chart-subtitle">Fix vs Full salary distribution</div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={salaryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {salaryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="charts-grid">
            {/* 7th Pay Distribution */}
            <div className="chart-card fade-in stagger-3">
              <div className="chart-title">7th Pay Basic Distribution</div>
              <div className="chart-subtitle">Number of teachers in each pay bracket</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.pay7thDistribution} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <XAxis dataKey="range" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#7c5af7" radius={[4, 4, 0, 0]}>
                    {stats.pay7thDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pay Level */}
            <div className="chart-card fade-in stagger-4">
              <div className="chart-title">Pay Level Distribution</div>
              <div className="chart-subtitle">Low vs High pay level tiers</div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={stats.byPayLevel}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="pay_level"
                  >
                    {stats.byPayLevel.map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + 5) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Employees */}
          <div className="table-card fade-in">
            <div className="table-header">
              <div>
                <div className="table-title">Recently Added Employees</div>
                <div className="table-meta">Last 5 records in the database</div>
              </div>
              <a href="/employees" className="btn btn-ghost btn-sm">View All →</a>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Taluka</th>
                    <th>School</th>
                    <th>Salary Type</th>
                    <th>7th Pay</th>
                    <th>Joined School</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentEmployees?.map((emp) => (
                    <tr key={emp.id}>
                      <td className="name-cell">{emp.name_english}</td>
                      <td>{emp.taluka}</td>
                      <td title={emp.school_name}>{emp.school_name?.substring(0, 25)}{emp.school_name?.length > 25 ? '…' : ''}</td>
                      <td>
                        <span className={`badge ${emp.salary_type === 'Fix' ? 'badge-orange' : 'badge-green'}`}>
                          {emp.salary_type}
                        </span>
                      </td>
                      <td>₹{emp.pay_7th ? Number(emp.pay_7th).toLocaleString() : '—'}</td>
                      <td>{emp.joined_school || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
