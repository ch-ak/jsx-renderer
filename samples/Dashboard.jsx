import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [count, setCount] = useState(0);
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  const stats = [
    { label: 'Revenue', value: '$48,295', change: '+12.5%', up: true },
    { label: 'Users', value: '8,421', change: '+4.2%', up: true },
    { label: 'Sessions', value: '24,910', change: '-2.1%', up: false },
    { label: 'Conversions', value: '3.6%', change: '+0.8%', up: true },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0f16 0%, #13161f 100%)',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: '40px',
      color: '#e2e8f0',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            ⚛ Dashboard
          </h1>
          <p style={{ color: '#8892a4', marginTop: 4, fontSize: 14 }}>
            Welcome back — live clock: {time}
          </p>
        </div>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{
            background: 'linear-gradient(135deg, #6e8efb, #a78bfa)',
            border: 'none',
            borderRadius: 10,
            color: 'white',
            padding: '10px 20px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
            boxShadow: '0 4px 20px rgba(110,142,251,0.4)',
          }}
        >
          Clicked {count}×
        </button>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 40 }}>
        {stats.map(stat => (
          <div key={stat.label} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '24px',
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ fontSize: 12, color: '#8892a4', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {stat.value}
            </div>
            <div style={{
              marginTop: 8,
              fontSize: 13,
              color: stat.up ? '#34d399' : '#f87171',
              fontWeight: 600,
            }}>
              {stat.change} vs last month
            </div>
          </div>
        ))}
      </div>

      {/* Progress bars */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 28,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 24 }}>Performance Metrics</h2>
        {[
          { label: 'Page Load Speed', pct: 87, color: '#6e8efb' },
          { label: 'API Response Time', pct: 64, color: '#a78bfa' },
          { label: 'Error Rate', pct: 12, color: '#f87171' },
          { label: 'Uptime', pct: 99, color: '#34d399' },
        ].map(m => (
          <div key={m.label} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: '#c4ccd8' }}>{m.label}</span>
              <span style={{ color: m.color, fontWeight: 600 }}>{m.pct}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${m.pct}%`,
                background: m.color,
                borderRadius: 6,
                boxShadow: `0 0 10px ${m.color}66`,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
