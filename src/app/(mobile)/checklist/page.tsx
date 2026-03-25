'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/useAuth';

interface Submission {
  id: string;
  submission_type: string;
  submitted_at: string;
  is_locked?: boolean;
}

interface TaskRow {
  label: string;
  sublabel: string;
  type: string;
  done: boolean;
  submittedAt?: string;
}

const TYPE_LABELS: Record<string, { label: string; sublabel: string }> = {
  readiness_gopalji: { label: 'Readiness Confirm', sublabel: 'Gopalji ki readiness' },
  readiness_altab: { label: 'Readiness Confirm', sublabel: 'Altab ki readiness' },
  readiness_kashif: { label: 'Readiness Confirm', sublabel: 'Kashif ki readiness' },
  readiness_furkan: { label: 'Readiness Confirm', sublabel: 'Furkan ki readiness' },
  defects_kashif: { label: 'Defects Submit', sublabel: 'Damaged units data' },
  closing_stock_furkan: { label: 'Closing Stock Submit', sublabel: 'Furkan ka closing stock' },
  physical_count_arjun: { label: 'Physical Count Submit', sublabel: 'Arjun ka physical count' },
};

function getExpectedTypes(name: string, role: string): string[] {
  const n = name.toLowerCase();
  if (n.includes('gopal')) return ['readiness_gopalji'];
  if (n.includes('altab')) return ['readiness_altab'];
  if (n.includes('kashif')) return ['readiness_kashif', 'defects_kashif'];
  if (n.includes('furkan')) return ['readiness_furkan', 'closing_stock_furkan'];
  if (n.includes('arjun') || role === 'supervisor') return ['physical_count_arjun'];
  return [];
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ChecklistPage() {
  const { user, token, ready } = useAuth();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [cycleLabel, setCycleLabel] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const cycleRes = await fetch('/api/v1/cycles/active', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (cycleRes.ok) {
        const json = await cycleRes.json();
        if (json.cycle) {
          const label = new Date(json.cycle.cycle_month).toLocaleDateString('en-IN', {
            month: 'long',
            year: 'numeric',
          });
          setCycleLabel(label);

          const subRes = await fetch(`/api/v1/submissions/me?cycle_id=${json.cycle.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (subRes.ok) {
            const subJson = await subRes.json();
            setSubmissions(subJson.submissions || []);
          }
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (ready && token) fetchData();
  }, [ready, token, fetchData]);

  if (!ready || !user) return null;

  const expectedTypes = getExpectedTypes(user.name, user.role);
  const doneMap = new Map(submissions.map((s) => [s.submission_type, s]));

  const tasks: TaskRow[] = expectedTypes.map((type) => {
    const sub = doneMap.get(type);
    const meta = TYPE_LABELS[type] || { label: type, sublabel: '' };
    return {
      label: meta.label,
      sublabel: meta.sublabel,
      type,
      done: !!sub,
      submittedAt: sub?.submitted_at,
    };
  });

  const doneCount = tasks.filter((t) => t.done).length;
  const allDone = doneCount === tasks.length && tasks.length > 0;

  return (
    <div style={{ padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#ffffff', fontSize: '22px', fontWeight: '700', margin: '0 0 4px' }}>
          Mera Status
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          {cycleLabel ? `Cycle: ${cycleLabel}` : 'Active cycle nahi hai'}
        </p>
      </div>

      {/* Summary pill */}
      {tasks.length > 0 && (
        <div style={{
          backgroundColor: allDone ? '#052e16' : '#1a1a1a',
          border: `1px solid ${allDone ? '#166534' : '#2a2a2a'}`,
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <p style={{ color: allDone ? '#4ade80' : '#d1d5db', fontSize: '15px', fontWeight: '600', margin: 0 }}>
            {allDone ? 'Sab complete hai!' : `${doneCount} / ${tasks.length} complete`}
          </p>
          <div style={{
            backgroundColor: allDone ? '#16a34a' : '#374151',
            borderRadius: '99px',
            padding: '4px 12px',
          }}>
            <span style={{ color: '#ffffff', fontSize: '13px', fontWeight: '600' }}>
              {Math.round((doneCount / tasks.length) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Task rows */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: '#6b7280' }}>Loading...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: '#4b5563', fontSize: '15px' }}>Koi task nahi assigned hai.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tasks.map((task) => (
            <div
              key={task.type}
              style={{
                backgroundColor: task.done ? '#0f2818' : '#1a1a1a',
                border: `1px solid ${task.done ? '#166534' : '#2a2a2a'}`,
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
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
                marginTop: '2px',
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
                <p style={{ color: task.done ? '#4ade80' : '#ffffff', fontSize: '15px', fontWeight: '600', margin: '0 0 4px' }}>
                  {task.label}
                </p>
                <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>
                  {task.sublabel}
                </p>
                {task.done && task.submittedAt && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#4ade80" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span style={{ color: '#4ade80', fontSize: '11px' }}>
                      {formatDateTime(task.submittedAt)}
                    </span>
                  </div>
                )}
              </div>

              <div style={{
                backgroundColor: task.done ? '#166534' : '#374151',
                borderRadius: '99px',
                padding: '3px 10px',
                flexShrink: 0,
              }}>
                <span style={{ color: task.done ? '#4ade80' : '#6b7280', fontSize: '11px', fontWeight: '600' }}>
                  {task.done ? 'Done' : 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
