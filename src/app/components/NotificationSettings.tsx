'use client';

import { useEffect, useState } from 'react';

export default function NotificationSettings() {
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('08:45');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setEnabled(data.notificationsEnabled);
        setTime(data.notificationTime);
        setLoading(false);
      });
  }, []);

  async function patch(updates: { notificationsEnabled?: boolean; notificationTime?: string }) {
    setSaving(true);
    setSaved(false);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    patch({ notificationsEnabled: next });
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTime(e.target.value);
  }

  function handleTimeBlur() {
    patch({ notificationTime: time });
  }

  if (loading) return null;

  return (
    <div style={{
      background: '#1a1a2e',
      borderRadius: 12,
      padding: '20px 24px',
      marginBottom: 24,
    }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>
        🔔 Daily Reminders
      </h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: enabled ? 16 : 0 }}>
        <button
          onClick={handleToggle}
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            background: enabled ? '#6c63ff' : '#374151',
            position: 'relative',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute',
            top: 3,
            left: enabled ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
          }} />
        </button>
        <span style={{ color: '#94a3b8', fontSize: 14 }}>
          {enabled ? 'Reminders enabled' : 'Reminders disabled'}
        </span>
        {saving && <span style={{ color: '#64748b', fontSize: 12 }}>Saving…</span>}
        {saved && <span style={{ color: '#4ade80', fontSize: 12 }}>Saved</span>}
      </div>

      {enabled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: '#94a3b8', fontSize: 14, whiteSpace: 'nowrap' }}>
            Remind me at
          </label>
          <input
            type="time"
            value={time}
            onChange={handleTimeChange}
            onBlur={handleTimeBlur}
            style={{
              background: '#0f0f23',
              border: '1px solid #2d2d4e',
              borderRadius: 8,
              color: '#e2e8f0',
              padding: '6px 10px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          />
          <span style={{ color: '#64748b', fontSize: 12 }}>UTC</span>
        </div>
      )}
    </div>
  );
}
