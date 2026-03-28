'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Cycle {
  id: string;
  cycle_month: string;
  status: string;
  days_until_cutoff: number;
  returns_in_transit: { amazon: number; flipkart: number } | null;
}

interface Submission {
  id: string;
  user_id: string;
  submission_type: string;
  submitted_at: string;
  users: { name: string; role: string } | null;
}

interface StaffRow {
  name: string;
  tasks: { type: string; label: string; done: boolean; submittedAt?: string }[];
}

const STAFF_TASKS = [
  { person: 'Gopalji', tasks: [{ type: 'readiness_gopalji', label: 'Readiness' }] },
  { person: 'Altab', tasks: [{ type: 'readiness_altab', label: 'Readiness' }] },
  { person: 'Kashif', tasks: [{ type: 'readiness_kashif', label: 'Readiness' }, { type: 'defects_kashif', label: 'Defects' }] },
  { person: 'Furkan', tasks: [{ type: 'readiness_furkan', label: 'Readiness' }, { type: 'closing_stock_furkan', label: 'Closing Stock' }] },
  { person: 'Arjun', tasks: [{ type: 'physical_count_arjun', label: 'Physical Count' }] },
];

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function DashboardPage() {
  const router = useRouter();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRIT, setSavingRIT] = useState(false);
  const [amazon, setAmazon] = useState('');
  const [flipkart, setFlipkart] = useState('');
  const [ritSaved, setRitSaved] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const cycleRes = await fetch('/api/v1/cycles/active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!cycleRes.ok) return;
      const cycleJson = await cycleRes.json();
      const c = cycleJson.cycle;
      if (!c) { setLoading(false); return; }
      setCycle(c);
      setAmazon(String(c.returns_in_transit?.amazon ?? 0));
      setFlipkart(String(c.returns_in_transit?.flipkart ?? 0));

      const subRes = await fetch(`/api/v1/cycles/${c.id}/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (subRes.ok) {
        const subJson = await subRes.json();
        setSubmissions(subJson.submissions || []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function saveRIT() {
    if (!cycle || !token) return;
    setSavingRIT(true);
    try {
      await fetch(`/api/v1/cycles/${cycle.id}/returns-in-transit`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amazon: Number(amazon), flipkart: Number(flipkart) }),
      });
      setRitSaved(true);
      setTimeout(() => setRitSaved(false), 2000);
    } catch { /* silent */ } finally {
      setSavingRIT(false);
    }
  }

  const doneSet = new Set(submissions.map((s) => s.submission_type));

  const staffRows: StaffRow[] = STAFF_TASKS.map(({ person, tasks }) => ({
    name: person,
    tasks: tasks.map(({ type, label }) => {
      const sub = submissions.find((s) => s.submission_type === type);
      return { type, label, done: doneSet.has(type), submittedAt: sub?.submitted_at };
    }),
  }));

  const totalTasks = staffRows.reduce((a, r) => a + r.tasks.length, 0);
  const doneTasks = staffRows.reduce((a, r) => a + r.tasks.filter((t) => t.done).length, 0);
  const allDone = doneTasks === totalTasks && totalTasks > 0;

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
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>Dashboard</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Current cycle overview</p>
      </div>

      {!cycle ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: '15px', margin: '0 0 16px' }}>No active cycle found.</p>
          <p style={{ color: '#d1d5db', fontSize: '13px', margin: 0 }}>Create a new cycle from Admin to get started.</p>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px' }}>
              <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px', fontWeight: '600' }}>Active Cycle</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 6px' }}>
                {new Date(cycle.cycle_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </p>
              <span style={{ backgroundColor: '#dcfce7', color: '#16a34a', fontSize: '11px', padding: '2px 8px', borderRadius: '99px', fontWeight: '600' }}>
                {cycle.status.toUpperCase()}
              </span>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px' }}>
              <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px', fontWeight: '600' }}>Cutoff</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: cycle.days_until_cutoff <= 3 ? '#dc2626' : '#111827', margin: '0 0 6px' }}>
                {cycle.days_until_cutoff > 0 ? `${cycle.days_until_cutoff} days` : cycle.days_until_cutoff === 0 ? 'Today!' : 'Passed'}
              </p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>28th of the month</p>
            </div>

            <div style={{ backgroundColor: allDone ? '#f0fdf4' : '#ffffff', borderRadius: '12px', border: `1px solid ${allDone ? '#bbf7d0' : '#e5e7eb'}`, padding: '20px' }}>
              <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px', fontWeight: '600' }}>Completion</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: allDone ? '#16a34a' : '#111827', margin: '0 0 6px' }}>
                {doneTasks} / {totalTasks}
              </p>
              <p style={{ fontSize: '13px', color: allDone ? '#16a34a' : '#6b7280', margin: 0 }}>
                {allDone ? 'All tasks complete ✓' : 'tasks submitted'}
              </p>
            </div>
          </div>

          {/* Status tracker */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '28px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>Staff Submission Status</h2>
              <button
                onClick={fetchData}
                style={{ fontSize: '12px', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 10px', background: 'none', cursor: 'pointer' }}
              >
                Refresh
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600', width: '130px' }}>Staff</th>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Tasks</th>
                  <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600', width: '100px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.map((row) => {
                  const allPersonDone = row.tasks.every((t) => t.done);
                  return (
                    <tr key={row.name} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{row.name}</p>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {row.tasks.map((task) => (
                            <span
                              key={task.type}
                              title={task.done && task.submittedAt ? fmt(task.submittedAt) : 'Pending'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: task.done ? '#f0fdf4' : '#f9fafb',
                                border: `1px solid ${task.done ? '#bbf7d0' : '#e5e7eb'}`,
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '12px',
                                color: task.done ? '#16a34a' : '#6b7280',
                                fontWeight: '500',
                                cursor: 'default',
                              }}
                            >
                              {task.done ? '✓' : '○'} {task.label}
                              {task.done && task.submittedAt && (
                                <span style={{ color: '#9ca3af', fontSize: '11px' }}>· {fmt(task.submittedAt)}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          backgroundColor: allPersonDone ? '#dcfce7' : '#fef3c7',
                          color: allPersonDone ? '#16a34a' : '#d97706',
                          fontSize: '12px',
                          padding: '3px 8px',
                          borderRadius: '99px',
                          fontWeight: '600',
                        }}>
                          {allPersonDone ? 'Complete' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Returns in Transit */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 4px' }}>Returns in Transit</h2>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 16px' }}>Units returned by customers but not yet received at warehouse</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px', fontWeight: '500' }}>Amazon</label>
                <input
                  type="number"
                  value={amazon}
                  onChange={(e) => setAmazon(e.target.value)}
                  min="0"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', fontWeight: '600', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px', fontWeight: '500' }}>Flipkart</label>
                <input
                  type="number"
                  value={flipkart}
                  onChange={(e) => setFlipkart(e.target.value)}
                  min="0"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', fontWeight: '600', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={saveRIT}
                disabled={savingRIT}
                style={{ padding: '8px 20px', backgroundColor: ritSaved ? '#16a34a' : '#111827', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {savingRIT ? 'Saving...' : ritSaved ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <button
              onClick={() => router.push('/report')}
              style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', textAlign: 'left', cursor: 'pointer' }}
            >
              <p style={{ fontSize: '24px', margin: '0 0 8px' }}>📋</p>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 4px' }}>Leakage Report</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Compare closing stock vs physical count</p>
            </button>
            <button
              onClick={() => router.push('/clearance')}
              style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', textAlign: 'left', cursor: 'pointer' }}
            >
              <p style={{ fontSize: '24px', margin: '0 0 8px' }}>✅</p>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 4px' }}>Clearance</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Mark staff as cleared or on hold</p>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
