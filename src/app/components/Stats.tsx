'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface StatsData {
  streak: number;
  totalCheckIns: number;
  thisMonthCheckIns: number;
  lastMonthCheckIns: number;
  activityTypes: { type: string; total: number }[];
}

export default function Stats() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('');
  const [history, setHistory] = useState<{ date: string; count: number }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => {
        setData(d);
        if (d.activityTypes?.[0]) setSelectedType(d.activityTypes[0].type);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedType) return;
    setHistoryLoading(true);
    fetch(`/api/activity-history?type=${encodeURIComponent(selectedType)}`)
      .then(r => r.json())
      .then(d => setHistory(d.history ?? []))
      .finally(() => setHistoryLoading(false));
  }, [selectedType]);

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading stats…</p>;
  if (!data) return <p style={{ color: 'var(--text-muted)' }}>Could not load stats.</p>;

  const checkInDelta = data.lastMonthCheckIns === 0 ? null
    : Math.round(((data.thisMonthCheckIns - data.lastMonthCheckIns) / data.lastMonthCheckIns) * 100);

  const chartData = history.map(h => ({ date: h.date.toString().slice(0, 10), count: h.count }));

  return (
    <section>
      {/* Streak */}
      {data.streak > 0 && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 14px',
          marginBottom: '1.25rem',
          fontSize: '0.95rem',
          fontWeight: 600,
          color: 'var(--text-normal)',
        }}>
          🔥 {data.streak}-day streak
        </div>
      )}

      {/* Check-in cards */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <StatCard label="Total check-ins" value={data.totalCheckIns.toLocaleString()} />
        <StatCard
          label="This month"
          value={data.thisMonthCheckIns.toLocaleString()}
          sub={checkInDelta === null ? 'No data last month' : `${checkInDelta >= 0 ? '+' : ''}${checkInDelta}% vs last month`}
        />
        <StatCard label="Last month" value={data.lastMonthCheckIns.toLocaleString()} />
      </div>

      {/* Activity type totals */}
      {data.activityTypes.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
          {data.activityTypes.map(t => (
            <div
              key={t.type}
              onClick={() => setSelectedType(t.type)}
              style={{
                padding: '0.6rem 1rem',
                background: selectedType === t.type ? 'var(--brand)' : 'var(--bg-elevated)',
                border: `1px solid ${selectedType === t.type ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ fontSize: '0.7rem', color: selectedType === t.type ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', textTransform: 'capitalize', marginBottom: '2px' }}>
                {t.type}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: selectedType === t.type ? '#fff' : 'var(--text-normal)' }}>
                {t.total.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {data.activityTypes.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-normal)' }}>Progression</span>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-normal)',
                padding: '3px 8px',
                fontSize: '0.85rem',
                textTransform: 'capitalize',
              }}
            >
              {data.activityTypes.map(t => (
                <option key={t.type} value={t.type}>{t.type}</option>
              ))}
            </select>
          </div>

          {historyLoading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</p>
          ) : chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.8rem' }}
                />
                <Line type="monotone" dataKey="count" stroke="var(--brand)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Not enough data yet.</p>
          )}
        </div>
      )}

      {data.activityTypes.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          No activities logged yet. Use the bot commands to get started!
        </p>
      )}
    </section>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      padding: '0.875rem 1.25rem',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      minWidth: '130px',
    }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-normal)' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}
