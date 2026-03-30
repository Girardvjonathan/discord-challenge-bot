'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface StatsData {
  totalPushups: number;
  checkIns: number;
  thisMonth: number;
  lastMonth: number;
  delta: number | null;
  history: { date: string; count: number }[];
}

export default function Stats({ serverId }: { serverId: string }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stats?serverId=${serverId}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [serverId]);

  if (loading) return <p>Loading stats...</p>;
  if (!data) return <p>Could not load stats.</p>;

  const deltaLabel =
    data.delta === null
      ? 'No data last month'
      : data.delta >= 0
      ? `+${data.delta}% vs last month`
      : `${data.delta}% vs last month`;

  const chartData = data.history.map(s => ({
    date: s.date.slice(0, 10),
    count: s.count,
  }));

  return (
    <section>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <StatCard label="Total push-ups" value={data.totalPushups.toLocaleString()} />
        <StatCard label="Total check-ins" value={data.checkIns.toLocaleString()} />
        <StatCard label="This month" value={data.thisMonth.toLocaleString()} sub={deltaLabel} />
        <StatCard label="Last month" value={data.lastMonth.toLocaleString()} />
      </div>

      {chartData.length > 1 && (
        <>
          <h3>Push-ups over time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#4ade80" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </section>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      padding: '1rem 1.5rem',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      minWidth: '140px',
    }}>
      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{sub}</div>}
    </div>
  );
}
