'use client';

export default function StatCard({ value, label, icon, variant = 'blue', change, delay = 0 }) {
  const variantMap = {
    blue: 'blue',
    green: 'green',
    orange: 'orange',
    purple: 'purple',
  };

  return (
    <div className={`stat-card ${variant !== 'blue' ? variant : ''} fade-in`} style={{ animationDelay: `${delay}ms` }}>
      <div className={`stat-icon ${variantMap[variant]}`}>{icon}</div>
      <div className="stat-value">{value?.toLocaleString?.() ?? value}</div>
      <div className="stat-label">{label}</div>
      {change && (
        <div className="stat-change" style={{ color: 'var(--text-muted)' }}>
          {change}
        </div>
      )}
    </div>
  );
}
