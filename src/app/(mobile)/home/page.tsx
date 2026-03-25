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
        sublabel: '3 products ka closing number',
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
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Subah ki shubhkamnaen';
    if (h < 17) return 'Dopahar mein swagat hai';
    return 'Shaam ko namaste';
  })();

  return (
    <div style={{ padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '2px' }}>{greeting} 👋</p>
          <h1 style={{ color: '#ffffff', fontSize: '22px', fontWeight: '700', margin: 0 }}>{user.name}</h1>
        </div>
        <button
          onClick={logout}
          style={{
            background: 'none',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            color: '#6b7280',
            fontSize: '12px',
            padding: '6px 12px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>

      {/* Cycle card */}
      {loading ? (
        <div style={{ backgroundColor: '#1a1a1a', borderRadius: '16px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Loading...</p>
        </div>
      ) : cycle ? (
        <div style={{
          backgroundColor: '#1a2340',
          border: '1px solid #1e3a5f',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#93c5fd', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Cycle
            </span>
            <span style={{
              backgroundColor: '#1e3a5f',
              color: '#60a5fa',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '99px',
              fontWeight: '600',
            }}>
              {cycle.status.toUpperCase()}
            </span>
          </div>
          <p style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700', margin: '0 0 12px' }}>
            {new Date(cycle.cycle_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={cycle.days_until_cutoff <= 3 ? '#f87171' : '#fbbf24'} strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ color: cycle.days_until_cutoff <= 3 ? '#f87171' : '#fbbf24', fontSize: '13px' }}>
              {cycle.days_until_cutoff > 0
                ? `Cutoff mein ${cycle.days_until_cutoff} din baaki`
                : cycle.days_until_cutoff === 0
                ? 'Aaj cutoff hai!'
                : 'Cutoff ho gayi'}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: '#1a1a1a', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Abhi koi active cycle nahi hai.</p>
        </div>
      )}

      {/* Clearance indicator */}
      {cycle && (
        <div style={{
          backgroundColor: allDone ? '#052e16' : '#1a1a1a',
          border: `1px solid ${allDone ? '#166534' : '#2a2a2a'}`,
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: allDone ? '#16a34a' : '#374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {allDone ? (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth={3}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </div>
          <div>
            <p style={{ color: allDone ? '#4ade80' : '#9ca3af', fontSize: '14px', fontWeight: '600', margin: 0 }}>
              {allDone ? 'Saari tasks complete!' : 'Tasks pending hain'}
            </p>
            <p style={{ color: '#6b7280', fontSize: '12px', margin: '2px 0 0' }}>
              {allDone ? 'Clearance dene ke liye ready' : `${tasks.filter((t) => !t.done).length} baaki hai`}
            </p>
          </div>
        </div>
      )}

      {/* Task list */}
      {cycle && tasks.length > 0 && (
        <div>
          <p style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Aaj ki Tasks
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tasks.map((task) => (
              <button
                key={task.type}
                onClick={() => !task.done && router.push(task.route)}
                disabled={task.done}
                style={{
                  backgroundColor: task.done ? '#0f2818' : '#1a1a1a',
                  border: `1px solid ${task.done ? '#166534' : '#2a2a2a'}`,
                  borderRadius: '14px',
                  padding: '16px',
                  textAlign: 'left',
                  cursor: task.done ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  width: '100%',
                  minHeight: '72px',
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: task.done ? '#16a34a' : '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {task.done ? (
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth={3}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: task.done ? '#4ade80' : '#ffffff', fontSize: '15px', fontWeight: '600', margin: 0 }}>
                    {task.label}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '12px', margin: '2px 0 0' }}>
                    {task.done && task.submittedAt
                      ? `✓ ${formatDate(task.submittedAt)}`
                      : task.sublabel}
                  </p>
                </div>
                {!task.done && (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#6b7280" strokeWidth={2}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {!cycle && !loading && (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <p style={{ color: '#4b5563', fontSize: '15px' }}>Koi task nahi hai abhi.</p>
        </div>
      )}
    </div>
  );
}
