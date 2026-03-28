'use client';

import { useEffect, useState, useCallback } from 'react';

const FACTORY_STAFF = [
  { name: 'Gopalji', key: 'gopal' },
  { name: 'Altab', key: 'altab' },
  { name: 'Kashif', key: 'kashif' },
  { name: 'Furkan', key: 'furkan' },
  { name: 'Arjun', key: 'arjun' },
];

interface UserRecord {
  id: string;
  name: string;
  role: string;
}

interface Clearance {
  id: string;
  user_id: string;
  status: 'cleared' | 'hold' | 'pending';
  cleared_at?: string;
  note?: string;
  users: { name: string; role: string } | null;
}

export default function ClearancePage() {
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [cycleLabel, setCycleLabel] = useState('');
  const [staffUsers, setStaffUsers] = useState<UserRecord[]>([]);
  const [clearances, setClearances] = useState<Clearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Get active cycle
      const cycleRes = await fetch('/api/v1/cycles/active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!cycleRes.ok) return;
      const cycleJson = await cycleRes.json();
      if (!cycleJson.cycle) { setLoading(false); return; }
      const c = cycleJson.cycle;
      setCycleId(c.id);
      setCycleLabel(new Date(c.cycle_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));

      // Get existing clearances
      const clRes = await fetch(`/api/v1/clearance?cycle_id=${c.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (clRes.ok) {
        const clJson = await clRes.json();
        setClearances(clJson.clearances || []);
      }

      // Get factory staff users via submissions to find their IDs
      const subRes = await fetch(`/api/v1/cycles/${c.id}/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (subRes.ok) {
        const subJson = await subRes.json();
        const userMap = new Map<string, UserRecord>();
        for (const s of subJson.submissions || []) {
          if (s.users && !userMap.has(s.user_id)) {
            userMap.set(s.user_id, { id: s.user_id, name: s.users.name, role: s.users.role });
          }
        }
        setStaffUsers(Array.from(userMap.values()).filter((u) => u.role === 'factory_staff' || u.role === 'supervisor'));
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function setClearanceStatus(userId: string, status: 'cleared' | 'hold' | 'pending') {
    if (!cycleId || !token) return;
    setSaving(userId);
    try {
      const res = await fetch('/api/v1/clearance', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle_id: cycleId, user_id: userId, status }),
      });
      if (res.ok) {
        const json = await res.json();
        setClearances((prev) => {
          const existing = prev.find((c) => c.user_id === userId);
          if (existing) {
            return prev.map((c) => c.user_id === userId ? { ...c, ...json.clearance } : c);
          }
          return [...prev, json.clearance];
        });
      }
    } catch { /* silent */ } finally {
      setSaving(null);
    }
  }

  const getClearance = (userId: string) => clearances.find((c) => c.user_id === userId);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
        <p style={{ color: '#9ca3af' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>Clearance</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{cycleLabel || 'No active cycle'}</p>
      </div>

      {!cycleId ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: '15px' }}>No active cycle found.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>Staff Clearance Status</h2>
          </div>

          {staffUsers.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>No submissions yet — staff user IDs will appear once they submit their tasks.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Name</th>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600', width: '120px' }}>Status</th>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600', width: '220px' }}>Action</th>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Cleared At</th>
                </tr>
              </thead>
              <tbody>
                {staffUsers.map((user) => {
                  const cl = getClearance(user.id);
                  const status = cl?.status || 'pending';
                  const isSaving = saving === user.id;

                  return (
                    <tr key={user.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{user.name}</p>
                        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0', textTransform: 'capitalize' }}>{user.role.replace('_', ' ')}</p>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          backgroundColor: status === 'cleared' ? '#dcfce7' : status === 'hold' ? '#fef2f2' : '#f3f4f6',
                          color: status === 'cleared' ? '#16a34a' : status === 'hold' ? '#dc2626' : '#6b7280',
                          fontSize: '12px',
                          padding: '3px 8px',
                          borderRadius: '99px',
                          fontWeight: '600',
                          textTransform: 'capitalize',
                        }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setClearanceStatus(user.id, 'cleared')}
                            disabled={isSaving || status === 'cleared'}
                            style={{
                              padding: '5px 12px',
                              backgroundColor: status === 'cleared' ? '#dcfce7' : '#ffffff',
                              border: `1px solid ${status === 'cleared' ? '#bbf7d0' : '#d1d5db'}`,
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: status === 'cleared' ? '#16a34a' : '#374151',
                              cursor: status === 'cleared' ? 'default' : 'pointer',
                              opacity: isSaving ? 0.5 : 1,
                            }}
                          >
                            ✓ Cleared
                          </button>
                          <button
                            onClick={() => setClearanceStatus(user.id, 'hold')}
                            disabled={isSaving || status === 'hold'}
                            style={{
                              padding: '5px 12px',
                              backgroundColor: status === 'hold' ? '#fef2f2' : '#ffffff',
                              border: `1px solid ${status === 'hold' ? '#fecaca' : '#d1d5db'}`,
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: status === 'hold' ? '#dc2626' : '#374151',
                              cursor: status === 'hold' ? 'default' : 'pointer',
                              opacity: isSaving ? 0.5 : 1,
                            }}
                          >
                            ⚠ Hold
                          </button>
                          {status !== 'pending' && (
                            <button
                              onClick={() => setClearanceStatus(user.id, 'pending')}
                              disabled={isSaving}
                              style={{
                                padding: '5px 12px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: '#6b7280',
                                cursor: 'pointer',
                                opacity: isSaving ? 0.5 : 1,
                              }}
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#6b7280' }}>
                        {cl?.cleared_at
                          ? new Date(cl.cleared_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
