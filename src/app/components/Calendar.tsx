'use client';

import { useEffect, useState, useCallback } from 'react';

interface Activity {
  id: string;
  type: string;
  count: number;
}

interface ModalState {
  date: string;
  activities: { id: string; type: string; count: string }[];
  newType: string;
  newCount: string;
}

const CUSTOM = '__custom__';

export default function Calendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [byDate, setByDate] = useState<Record<string, Activity[]>>({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [saving, setSaving] = useState(false);
  const [knownTypes, setKnownTypes] = useState<string[]>([]);
  const [customType, setCustomType] = useState('');

  useEffect(() => {
    fetch('/api/activity-types')
      .then(r => r.json())
      .then(d => setKnownTypes(d.types ?? []));
  }, []);

  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  const fetchMonth = useCallback(async () => {
    setLoading(true);
    const data = await fetch(`/api/submissions?month=${monthKey}`).then(r => r.json());
    const grouped: Record<string, Activity[]> = {};
    for (const s of (data.submissions ?? [])) {
      const d = s.date.slice(0, 10);
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(s);
    }
    setByDate(grouped);
    setLoading(false);
  }, [monthKey]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  function openDay(day: number) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = byDate[dateStr] ?? [];
    setModal({
      date: dateStr,
      activities: existing.map(a => ({ id: a.id, type: a.type, count: String(a.count) })),
      newType: '',
      newCount: '',
    });
  }

  async function deleteActivity(id: string) {
    await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
    setModal(m => m ? { ...m, activities: m.activities.filter(a => a.id !== id) } : null);
    await fetchMonth();
  }

  async function saveModal() {
    if (!modal) return;
    setSaving(true);
    try {
      for (const act of modal.activities) {
        if (act.count && Number(act.count) > 0) {
          await fetch('/api/submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: modal.date, type: act.type, count: Number(act.count) }),
          });
        }
      }
      const resolvedNewType = modal.newType === CUSTOM ? customType.trim().toLowerCase() : modal.newType;
      if (resolvedNewType && modal.newCount && Number(modal.newCount) > 0) {
        await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: modal.date, type: resolvedNewType, count: Number(modal.newCount) }),
        });
        if (!knownTypes.includes(resolvedNewType)) {
          setKnownTypes(prev => [...prev, resolvedNewType].sort());
        }
      }
      setCustomType('');
      await fetchMonth();
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

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
    <section style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <button onClick={prevMonth} style={navBtnStyle}>←</button>
        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-normal)', minWidth: '140px', textAlign: 'center' }}>{monthName}</span>
        <button onClick={nextMonth} style={navBtnStyle}>→</button>
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasActivity = (byDate[dateStr]?.length ?? 0) > 0;
            return (
              <button
                key={i}
                onClick={() => openDay(day)}
                style={{
                  aspectRatio: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  background: hasActivity ? 'rgba(88,101,242,0.15)' : 'var(--bg-elevated)',
                  border: `1px solid ${hasActivity ? 'var(--brand)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: 'var(--text-normal)',
                }}
              >
                <span>{day}</span>
                {hasActivity && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--brand)', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', minWidth: '300px', maxWidth: '400px', width: '100%' }}>
            <h3 style={{ margin: '0 0 1rem', color: 'var(--text-normal)', fontSize: '1rem' }}>{modal.date}</h3>

            {/* Existing activities */}
            {modal.activities.length > 0 && (
              <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {modal.activities.map((act, idx) => (
                  <div key={act.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize', minWidth: '70px' }}>{act.type}</span>
                    <input
                      type="number"
                      min={1}
                      max={1000000}
                      value={act.count}
                      onChange={e => setModal(m => m ? { ...m, activities: m.activities.map((a, i) => i === idx ? { ...a, count: e.target.value } : a) } : null)}
                      style={inputStyle}
                    />
                    <button
                      onClick={() => deleteActivity(act.id)}
                      disabled={saving}
                      style={{ background: 'none', border: 'none', color: '#f04747', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new activity */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Add activity</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {knownTypes.length > 0 ? (
                  <select
                    value={modal.newType}
                    onChange={e => {
                      setModal(m => m ? { ...m, newType: e.target.value } : null);
                      if (e.target.value !== CUSTOM) setCustomType('');
                    }}
                    style={{ ...inputStyle, flex: 1, textTransform: 'capitalize' }}
                  >
                    <option value="">Select type…</option>
                    {knownTypes.map(t => (
                      <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>
                    ))}
                    <option value={CUSTOM}>Custom…</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="type (e.g. pushup)"
                    value={modal.newType}
                    onChange={e => setModal(m => m ? { ...m, newType: e.target.value } : null)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                )}
                <input
                  type="number"
                  min={1}
                  max={1000000}
                  placeholder="count"
                  value={modal.newCount}
                  onChange={e => setModal(m => m ? { ...m, newCount: e.target.value } : null)}
                  style={{ ...inputStyle, width: '80px' }}
                />
              </div>
              {modal.newType === CUSTOM && (
                <input
                  type="text"
                  placeholder="Activity name (e.g. walking)"
                  value={customType}
                  onChange={e => setCustomType(e.target.value)}
                  style={{ ...inputStyle, marginTop: '6px' }}
                />
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} disabled={saving} style={secondaryBtnStyle}>Cancel</button>
              <button
                onClick={saveModal}
                disabled={saving || (modal.activities.every(a => !a.count) && (!modal.newType || !modal.newCount))}
                style={primaryBtnStyle}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-normal)',
  cursor: 'pointer',
  padding: '4px 10px',
  fontSize: '0.9rem',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-normal)',
  padding: '5px 8px',
  fontSize: '0.85rem',
  width: '100%',
};

const primaryBtnStyle: React.CSSProperties = {
  background: 'var(--brand)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: '#fff',
  cursor: 'pointer',
  padding: '6px 16px',
  fontSize: '0.875rem',
  fontWeight: 600,
};

const secondaryBtnStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-normal)',
  cursor: 'pointer',
  padding: '6px 16px',
  fontSize: '0.875rem',
};
