'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

interface Cycle {
  id: string;
  month: string;
  cycle_month: string;
  status: string;
  days_until_cutoff: number;
}

interface Submission {
  id: string;
  submission_type: string;
  submitted_at: string;
}

interface Task {
  label: string;
  sublabel: string;
  type: string;
  route: string;
  done: boolean;
  submittedAt?: string;
}

function getTasksForUser(
  name: string,
  role: string,
  submissions: Submission[]
): Task[] {
  const doneTypes = new Set(submissions.map((s) => s.submission_type));
  const submittedAt = (type: string) => {
    const s = submissions.find((x) => x.submission_type === type);
    return s?.submitted_at;
  };

  const n = name.toLowerCase();

  if (n.includes('gopal')) {
    return [
      {
        label: 'Readiness Confirm Karo',
        sublabel: 'Kya aaj ka stock ready hai?',
        type: 'readiness_gopalji',
        route: '/submit/readiness',
        done: doneTypes.has('readiness_gopalji'),
        submittedAt: submittedAt('readiness_gopalji'),
      },
    ];
  }

  if (n.includes('altab')) {
    return [
      {
        label: 'Readiness Confirm Karo',
        sublabel: 'Kya aaj ka stock ready hai?',
        type: 'readiness_altab',
        route: '/submit/readiness',
        done: doneTypes.has('readiness_altab'),
        submittedAt: submittedAt('readiness_altab'),
      },
    ];
  }

  if (n.includes('kashif')) {
    return [
      {
        label: 'Readiness Confirm Karo',
        sublabel: 'Kya aaj ka stock ready hai?',
        type: 'readiness_kashif',
        route: '/submit/readiness',
        done: doneTypes.has('readiness_kashif'),
        submittedAt: submittedAt('readiness_kashif'),
      },
      {
        label: 'Defects Submit Karo',
        sublabel: 'Damaged / defective units',
        type: 'defects_kashif',
        route: '/submit/defects',
        done: doneTypes.has('defects_kashif'),
        submittedAt: submittedAt('defects_kashif'),
      },
    ];
  }

  if (n.includes('furkan')) {
    return [
      {
        label: 'Readiness Confirm Karo',
        sublabel: 'Kya aaj ka stock ready hai?',
        type: 'readiness_furkan',
        route: '/submit/readiness',
        done: doneTypes.has('readiness_furkan'),
        submittedAt: submittedAt('readiness_furkan'),
      },
      {
        label: 'Closing Stock Submit Karo',
        sublabel: '10 products ka closing number',
        type: 'closing_stock_furkan',
        route: '/submit/closing-stock',
        done: doneTypes.has('closing_stock_furkan'),
        submittedAt: submittedAt('closing_stock_furkan'),
      },
    ];
  }

  if (n.includes('arjun') || role === 'supervisor') {
    return [
      {
        label: 'Physical Count Submit Karo',
        sublabel: 'Har product ka actual count',
        type: 'physical_count_arjun',
        route: '/submit/count',
        done: doneTypes.has('physical_count_arjun'),
        submittedAt: submittedAt('physical_count_arjun'),
      },
    ];
  }

  return [];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function HomePage() {
  const { user, token, logout, ready } = useAuth();
  const router = useRouter();

  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [cycleRes, subRes] = await Promise.all([
        fetch('/api/v1/cycles/active', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/submissions/me', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (cycleRes.ok) {
        const json = await cycleRes.json();
        setCycle(json.cycle);

        if (json.cycle && subRes.ok) {
          const subJson = await subRes.json();
          const cycleSubmissions = (subJson.submissions || []).filter(
            (s: Submission) => s.submission_type !== undefined
          );
          setSubmissions(cycleSubmissions);
        }
      }
    } catch {
      // network error — silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (ready && token) fetchData();
  }, [ready, token, fetchData]);

  if (!ready || !user) return null;

  const tasks = cycle ? getTasksForUser(user.name, user.role, submissions) : [];
  const allDone = tasks.length > 0 && tasks.every((t) => t.done);
  const completedCount = tasks.filter((t) => t.done).length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Subah ki shubhkamnaen';
    if (h < 17) return 'Dopahar mein swagat hai';
    return 'Shaam ko namaste';
  })();

  const cycleLabel = cycle
    ? new Date(cycle.cycle_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '';

  return (
    <>
      <style>{`
        .task-card {
          background: #111113;
          border: 1px solid #27272a;
          border-radius: 16px;
          padding: 16px;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          min-height: 76px;
          transition: border-color 0.15s ease, background 0.15s ease;
          font-family: inherit;
        }
        .task-card:hover:not(:disabled) {
          border-color: #3b82f6;
          background: #18181b;
        }
        .task-card:disabled {
          cursor: default;
          background: #0c1a10;
          border-color: rgba(34,197,94,0.25);
        }
        .logout-btn {
          background: none;
          border: 1px solid #27272a;
          border-radius: 8px;
          color: #71717a;
          font-size: 12px;
          padding: 6px 12px;
          cursor: pointer;
          font-family: inherit;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .logout-btn:hover { border-color: #3f3f46; color: #a1a1aa; }
      `}</style>

      <div style={{ padding: '28px 16px 20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <p style={{ color: '#71717a', fontSize: '13px', marginBottom: '4px', fontWeight: 300, letterSpacing: '0.5px' }}>
              {greeting}
            </p>
            <h1 style={{ color: '#fafafa', fontSize: '24px', fontWeight: 300, margin: 0, letterSpacing: '0.5px' }}>
              Namaskar, <span style={{ fontWeight: 700 }}>{user.name.split(' ')[0]}</span>
            </h1>
          </div>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>

        {/* Cycle card */}
        {loading ? (
          <div style={{
            background: '#111113',
            border: '1px solid #27272a',
            borderRadius: '20px',
            padding: '24px 20px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <p style={{ color: '#71717a', fontSize: '14px', margin: 0 }}>Load ho raha hai...</p>
          </div>
        ) : cycle ? (
          <div style={{
            background: 'linear-gradient(135deg, #0f1f3d 0%, #111827 60%, #0d1117 100%)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '16px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Glow blob */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: '#60a5fa', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>
                  Active Cycle
                </p>
                <p style={{ color: '#fafafa', fontSize: '20px', fontWeight: 700, margin: '0 0 16px' }}>
                  {cycleLabel}
                </p>
              </div>
              <span style={{
                background: 'rgba(59,130,246,0.15)',
                color: '#60a5fa',
                fontSize: '10px',
                padding: '3px 10px',
                borderRadius: '99px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                border: '1px solid rgba(59,130,246,0.25)',
                textTransform: 'uppercase',
              }}>
                {cycle.status}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{
                fontSize: '32px',
                fontWeight: 700,
                color: cycle.days_until_cutoff <= 3 ? '#ef4444' : '#3b82f6',
                lineHeight: 1,
              }}>
                {Math.abs(cycle.days_until_cutoff)}
              </span>
              <span style={{ color: cycle.days_until_cutoff <= 3 ? '#fca5a5' : '#93c5fd', fontSize: '14px', fontWeight: 400 }}>
                {cycle.days_until_cutoff > 0
                  ? 'din baaki cutoff mein'
                  : cycle.days_until_cutoff === 0
                  ? 'Aaj cutoff hai!'
                  : 'din baad cutoff ho gayi'}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ background: '#111113', border: '1px solid #27272a', borderRadius: '20px', padding: '24px 20px', marginBottom: '16px' }}>
            <p style={{ color: '#71717a', fontSize: '14px', margin: 0 }}>Abhi koi active cycle nahi hai.</p>
          </div>
        )}

        {/* Progress bar */}
        {cycle && tasks.length > 0 && (
          <div style={{
            background: '#111113',
            border: `1px solid ${allDone ? 'rgba(34,197,94,0.25)' : '#27272a'}`,
            borderRadius: '14px',
            padding: '14px 16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: allDone ? 'rgba(34,197,94,0.15)' : '#18181b',
              border: `2px solid ${allDone ? '#22c55e' : '#3f3f46'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.3s ease',
            }}>
              {allDone ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2.5}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span style={{ color: '#3b82f6', fontSize: '13px', fontWeight: 700 }}>
                  {completedCount}/{tasks.length}
                </span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: allDone ? '#22c55e' : '#fafafa', fontSize: '14px', fontWeight: 600, margin: '0 0 2px' }}>
                {allDone ? 'Saari tasks complete!' : 'Tasks pending hain'}
              </p>
              <p style={{ color: '#71717a', fontSize: '12px', margin: 0 }}>
                {allDone
                  ? 'Clearance ke liye ready ho'
                  : `${tasks.filter((t) => !t.done).length} task${tasks.filter((t) => !t.done).length > 1 ? 's' : ''} baaki`}
              </p>
            </div>
          </div>
        )}

        {/* Task list */}
        {cycle && tasks.length > 0 && (
          <div>
            <p style={{ color: '#71717a', fontSize: '11px', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Aaj ki Tasks
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tasks.map((task) => (
                <button
                  key={task.type}
                  onClick={() => !task.done && router.push(task.route)}
                  disabled={task.done}
                  className="task-card"
                >
                  {/* Status circle */}
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: task.done ? 'rgba(34,197,94,0.12)' : '#18181b',
                    border: `2px solid ${task.done ? '#22c55e' : '#3f3f46'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                  }}>
                    {task.done ? (
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2.5}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }} />
                    )}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: task.done ? '#22c55e' : '#fafafa', fontSize: '15px', fontWeight: 600, margin: '0 0 3px', lineHeight: 1.2 }}>
                      {task.label}
                    </p>
                    <p style={{ color: '#71717a', fontSize: '12px', margin: 0 }}>
                      {task.done && task.submittedAt
                        ? `✓ ${formatDate(task.submittedAt)}`
                        : task.sublabel}
                    </p>
                  </div>

                  {/* Chevron */}
                  {!task.done && (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#3f3f46" strokeWidth={2}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {!cycle && !loading && (
          <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <p style={{ color: '#3f3f46', fontSize: '15px' }}>Koi task nahi hai abhi.</p>
          </div>
        )}
      </div>
    </>
  );
}
