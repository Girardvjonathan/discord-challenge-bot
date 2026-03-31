'use client';

import { useEffect, useState } from 'react';

interface Submission {
  id: string;
  date: string;
  type: string;
  count: number;
}

interface EditState {
  date: string;
  type: string;
  count: string;
  submissionId: string | null;
}

export default function Calendar({ serverId, challengeType }: { serverId: string; challengeType: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/submissions?month=${monthKey}&serverId=${serverId}`)
      .then(r => r.json())
      .then(data => setSubmissions(data.submissions ?? []))
      .finally(() => setLoading(false));
  }, [monthKey, serverId]);

  const submissionByDate = Object.fromEntries(
    submissions.map(s => [s.date.slice(0, 10), s])
  );

  // Build calendar grid
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function openEdit(day: number) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = submissionByDate[dateStr];
    const defaultType = challengeType === 'any' ? '' : challengeType;
    setEdit({ date: dateStr, type: existing?.type ?? defaultType, count: existing ? String(existing.count) : '', submissionId: existing?.id ?? null });
  }

  async function saveEdit() {
    if (!edit) return;
    setSaving(true);
    try {
      await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: edit.date, type: edit.type || challengeType, count: Number(edit.count), serverId }),
      });
      // Refresh
      const data = await fetch(`/api/submissions?month=${monthKey}&serverId=${serverId}`).then(r => r.json());
      setSubmissions(data.submissions ?? []);
      setEdit(null);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEdit() {
    if (!edit?.submissionId) return;
    setSaving(true);
    try {
      await fetch(`/api/submissions/${edit.submissionId}`, { method: 'DELETE' });
      const data = await fetch(`/api/submissions?month=${monthKey}&serverId=${serverId}`).then(r => r.json());
      setSubmissions(data.submissions ?? []);
      setEdit(null);
    } finally {
      setSaving(false);
    }
  }

  const monthName = new Date(Date.UTC(year, month - 1)).toLocaleString('default', { month: 'long', year: 'numeric' });

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <button onClick={prevMonth}>←</button>
        <strong>{monthName}</strong>
        <button onClick={nextMonth}>→</button>
      </div>

      {loading ? <p>Loading...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.75rem' }}>{d}</div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const sub = submissionByDate[dateStr];
            return (
              <button
                key={i}
                onClick={() => openEdit(day)}
                style={{
                  padding: '6px 4px',
                  textAlign: 'center',
                  background: sub ? '#4ade80' : '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                <div>{day}</div>
                {sub && <div style={{ fontSize: '0.65rem' }}>{sub.count}</div>}
              </button>
            );
          })}
        </div>
      )}

      {edit && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', minWidth: '280px' }}>
            <h3 style={{ marginTop: 0 }}>{edit.date}</h3>
            {challengeType === 'any' && (
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Activity type
                <input
                  type="text"
                  placeholder="e.g. walking, pushup"
                  value={edit.type}
                  onChange={e => setEdit({ ...edit, type: e.target.value })}
                  style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px' }}
                />
              </label>
            )}
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Count
              <input
                type="number"
                min={1}
                max={1000000}
                value={edit.count}
                onChange={e => setEdit({ ...edit, count: e.target.value })}
                style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px' }}
              />
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
              <button onClick={saveEdit} disabled={saving || !edit.count || (challengeType === 'any' && !edit.type)}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              {edit.submissionId && (
                <button onClick={deleteEdit} disabled={saving} style={{ color: 'red' }}>
                  Delete
                </button>
              )}
              <button onClick={() => setEdit(null)} disabled={saving}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
