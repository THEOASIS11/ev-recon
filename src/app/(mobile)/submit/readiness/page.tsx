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
  const [showCheck, setShowCheck] = useState(false);

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
        requestAnimationFrame(() => setTimeout(() => setShowCheck(true), 50));
        setTimeout(() => router.push('/home'), 2000);
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

  if (success) {
    return (
      <>
        <style>{`
          @keyframes scaleIn { from { transform:scale(0.5);opacity:0; } to { transform:scale(1);opacity:1; } }
          @keyframes checkDraw { from { stroke-dashoffset:40; } to { stroke-dashoffset:0; } }
          @keyframes fadeUp { from { transform:translateY(12px);opacity:0; } to { transform:translateY(0);opacity:1; } }
          .s-ring { animation:scaleIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }
          .s-check { stroke-dasharray:40;stroke-dashoffset:40;animation:checkDraw 0.35s ease 0.3s forwards; }
          .s-txt { opacity:0;animation:fadeUp 0.4s ease 0.5s forwards; }
          .s-sub { opacity:0;animation:fadeUp 0.4s ease 0.65s forwards; }
        `}</style>
        <div style={{ padding:'40px 24px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'70vh' }}>
          <div className="s-ring" style={{ width:'88px', height:'88px', borderRadius:'50%', background:'rgba(34,197,94,0.12)', border:'2px solid #22c55e', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'24px' }}>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#22c55e">
              <polyline className="s-check" points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="s-txt" style={{ color:'#22c55e', fontSize:'22px', fontWeight:700, margin:'0 0 8px' }}>Submit ho gaya!</p>
          <p className="s-sub" style={{ color:'#71717a', fontSize:'14px', margin:0 }}>Home screen par ja rahe hain...</p>
        </div>
      </>
    );
  }

  if (alreadyDone) {
    return (
      <>
        <style>{`
          @keyframes scaleIn { from { transform:scale(0.5);opacity:0; } to { transform:scale(1);opacity:1; } }
          @keyframes fadeUp { from { transform:translateY(12px);opacity:0; } to { transform:translateY(0);opacity:1; } }
          .s-ring { animation:scaleIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards; }
          .s-txt { opacity:0;animation:fadeUp 0.4s ease 0.3s forwards; }
          .s-sub { opacity:0;animation:fadeUp 0.4s ease 0.45s forwards; }
        `}</style>
        <div style={{ padding:'40px 24px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'70vh' }}>
          <div className="s-ring" style={{ width:'88px', height:'88px', borderRadius:'50%', background:'rgba(34,197,94,0.12)', border:'2px solid #22c55e', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'24px' }}>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#22c55e">
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="s-txt" style={{ color:'#22c55e', fontSize:'22px', fontWeight:700, margin:'0 0 8px' }}>Pehle se ho gaya!</p>
          <p className="s-sub" style={{ color:'#71717a', fontSize:'14px', margin:'0 0 28px', textAlign:'center' }}>Aapne pehle hi readiness confirm kar di hai.</p>
          <button onClick={() => router.push('/home')} style={{ color:'#3b82f6', background:'none', border:'none', fontSize:'15px', cursor:'pointer', fontFamily:'inherit' }}>
            ← Home par Jao
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .check-item {
          background: #111113;
          border: 2px solid #27272a;
          border-radius: 16px;
          padding: 16px;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 64px;
          width: 100%;
          font-family: inherit;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .check-item.checked {
          background: rgba(34,197,94,0.06);
          border-color: rgba(34,197,94,0.4);
        }
        .check-item:not(.checked):hover { border-color: #3f3f46; }
        .submit-btn {
          width: 100%;
          height: 56px;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 700;
          border: none;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .submit-btn.active { background: linear-gradient(135deg,#22c55e,#16a34a); color:#ffffff; cursor:pointer; }
        .submit-btn.active:hover { opacity:0.9; transform:scale(0.99); }
        .submit-btn.active:active { transform:scale(0.97); }
        .submit-btn.inactive { background:#18181b; color:#52525b; cursor:not-allowed; }
        .back-btn {
          background:none; border:none; cursor:pointer; color:#71717a; padding:4px; transition:color 0.15s ease;
        }
        .back-btn:hover { color:#a1a1aa; }
      `}</style>

      <div style={{ padding: '28px 20px' }}>
        {/* Back + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <button onClick={() => router.push('/home')} className="back-btn">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 style={{ color: '#fafafa', fontSize: '20px', fontWeight: 700, margin: 0 }}>Readiness Confirm Karo</h1>
        </div>

        <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
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
              className={`check-item${checks[i] ? ' checked' : ''}`}
            >
              {/* Custom checkbox */}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: checks[i] ? 'rgba(34,197,94,0.15)' : '#18181b',
                border: `2px solid ${checks[i] ? '#22c55e' : '#3f3f46'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}>
                {checks[i] && (
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={3}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <p style={{
                color: checks[i] ? '#22c55e' : '#a1a1aa',
                fontSize: '15px',
                margin: 0,
                fontWeight: checks[i] ? 600 : 400,
                transition: 'color 0.15s ease',
                lineHeight: 1.4,
              }}>
                {item}
              </p>
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            background: '#1c1917',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
            <p style={{ color: '#fca5a5', fontSize: '14px', margin: 0 }}>{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!allChecked || loading}
          className={`submit-btn ${allChecked && !loading ? 'active' : 'inactive'}`}
        >
          {loading ? 'Submit ho raha hai...' : allChecked ? 'Confirm Karo ✓' : 'Pehle sab tick karo'}
        </button>
      </div>
    </>
  );
}
