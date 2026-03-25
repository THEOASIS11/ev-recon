'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

function getSubmissionType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('gopal')) return 'readiness_gopalji';
  if (n.includes('altab')) return 'readiness_altab';
  if (n.includes('kashif')) return 'readiness_kashif';
  if (n.includes('furkan')) return 'readiness_furkan';
  return 'readiness_gopalji'; // fallback
}

const CHECKLIST = [
  'Mera area aur vehicles ready hain',
  'Koi pending issue nahi hai',
  'Supervisor ko pata hai agar koi problem hai',
];

export default function ReadinessPage() {
  const { user, token, ready } = useAuth();
  const router = useRouter();

  const [cycleId, setCycleId] = useState<string | null>(null);
  const [checks, setChecks] = useState([false, false, false]);
  const [loading, setLoading] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const fetchCycleAndCheck = useCallback(async () => {
    if (!token || !user) return;
    try {
      const res = await fetch('/api/v1/cycles/active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (!json.cycle) return;
      setCycleId(json.cycle.id);

      // Check if already submitted
      const subRes = await fetch(`/api/v1/submissions/me?cycle_id=${json.cycle.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (subRes.ok) {
        const subJson = await subRes.json();
        const submissionType = getSubmissionType(user.name);
        const done = (subJson.submissions || []).some(
          (s: { submission_type: string }) => s.submission_type === submissionType
        );
        setAlreadyDone(done);
      }
    } catch {
      // silent
    }
  }, [token, user]);

  useEffect(() => {
    if (ready && token && user) fetchCycleAndCheck();
  }, [ready, token, user, fetchCycleAndCheck]);

  if (!ready || !user) return null;

  const submissionType = getSubmissionType(user.name);
  const allChecked = checks.every(Boolean);

  async function handleSubmit() {
    if (!token || !cycleId || !allChecked) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cycle_id: cycleId,
          submission_type: submissionType,
          data: { confirmed: true, checklist: CHECKLIST },
        }),
      });

      if (res.ok || res.status === 409) {
        setSuccess(true);
        setTimeout(() => router.push('/home'), 1500);
      } else {
        const json = await res.json();
        setError(json.error || 'Kuch gadbad ho gayi');
      }
    } catch {
      setError('Internet nahi hai. Dobara try karo.');
    } finally {
      setLoading(false);
    }
  }

  if (success || alreadyDone) {
    return (
      <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth={3}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p style={{ color: '#4ade80', fontSize: '20px', fontWeight: '700', margin: 0 }}>
          {alreadyDone && !success ? 'Pehle se ho gaya!' : 'Submit ho gaya!'}
        </p>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px', textAlign: 'center' }}>
          {alreadyDone && !success ? 'Aapne pehle hi readiness confirm kar di hai.' : 'Home screen par ja rahe hain...'}
        </p>
        {alreadyDone && !success && (
          <button
            onClick={() => router.push('/home')}
            style={{ marginTop: '24px', color: '#60a5fa', background: 'none', border: 'none', fontSize: '15px', cursor: 'pointer' }}
          >
            Home par Jao
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 20px' }}>
      {/* Back + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <button
          onClick={() => router.push('/home')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700', margin: 0 }}>Readiness Confirm Karo</h1>
      </div>

      <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
        Neeche diye points check karo aur confirm karo ki sab ready hai.
      </p>

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {CHECKLIST.map((item, i) => (
          <button
            key={i}
            onClick={() => {
              const next = [...checks];
              next[i] = !next[i];
              setChecks(next);
            }}
            style={{
              backgroundColor: checks[i] ? '#052e16' : '#1a1a1a',
              border: `2px solid ${checks[i] ? '#16a34a' : '#2a2a2a'}`,
              borderRadius: '14px',
              padding: '16px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              minHeight: '64px',
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: checks[i] ? '#16a34a' : '#374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {checks[i] && (
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth={3}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <p style={{ color: checks[i] ? '#4ade80' : '#d1d5db', fontSize: '15px', margin: 0, fontWeight: checks[i] ? '600' : '400' }}>
              {item}
            </p>
          </button>
        ))}
      </div>

      {error && (
        <div style={{ backgroundColor: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
          <p style={{ color: '#fca5a5', fontSize: '14px', margin: 0 }}>{error}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!allChecked || loading}
        style={{
          width: '100%',
          height: '56px',
          borderRadius: '14px',
          backgroundColor: allChecked ? '#16a34a' : '#1f2937',
          color: allChecked ? '#ffffff' : '#6b7280',
          fontSize: '16px',
          fontWeight: '700',
          border: 'none',
          cursor: allChecked && !loading ? 'pointer' : 'not-allowed',
          transition: 'background-color 0.2s',
        }}
      >
        {loading ? 'Submit ho raha hai...' : allChecked ? 'Confirm Karo ✓' : 'Pehle sab tick karo'}
      </button>
    </div>
  );
}
