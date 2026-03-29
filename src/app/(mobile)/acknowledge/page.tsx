'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

export default function AcknowledgePage() {
  const { user, token, ready } = useAuth();
  const router = useRouter();

  const [ackType, setAckType] = useState<'reminder_20th' | 'reminder_25th' | null>(null);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type') as 'reminder_20th' | 'reminder_25th' | null;
    const cid = params.get('cycle_id');
    setAckType(type);
    setCycleId(cid);
  }, []);

  if (!ready || !user) return null;

  const is20th = ackType === 'reminder_20th';

  async function handleAck() {
    if (!token || !ackType || !cycleId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/acknowledgements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: ackType, cycle_id: cycleId }),
      });
      if (res.ok || res.status === 409) {
        setDone(true);
        requestAnimationFrame(() => setTimeout(() => setShowCheck(true), 50));
        setTimeout(() => router.push('/home'), 2200);
      } else {
        const json = await res.json();
        setError(json.error || 'Kuch gadbad ho gayi');
      }
    } catch {
      setError('Internet nahi hai');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <>
        <style>{`
          @keyframes scaleIn {
            from { transform: scale(0.5); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes checkDraw {
            from { stroke-dashoffset: 40; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes fadeUp {
            from { transform: translateY(12px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .success-ring {
            animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          }
          .success-check {
            stroke-dasharray: 40;
            stroke-dashoffset: 40;
            animation: checkDraw 0.35s ease 0.3s forwards;
          }
          .success-text {
            opacity: 0;
            animation: fadeUp 0.4s ease 0.5s forwards;
          }
          .success-sub {
            opacity: 0;
            animation: fadeUp 0.4s ease 0.65s forwards;
          }
        `}</style>
        <div style={{
          padding: '40px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
        }}>
          <div className="success-ring" style={{
            width: '88px',
            height: '88px',
            borderRadius: '50%',
            background: 'rgba(34,197,94,0.12)',
            border: '2px solid #22c55e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
          }}>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#22c55e">
              <polyline className="success-check" points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="success-text" style={{ color: '#22c55e', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>
            Ho gaya!
          </p>
          <p className="success-sub" style={{ color: '#71717a', fontSize: '14px', margin: 0 }}>
            Home screen par ja rahe hain...
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .ack-btn-primary {
          width: 100%;
          height: 56px;
          border-radius: 14px;
          color: #ffffff;
          font-size: 16px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.2s ease, transform 0.1s ease;
        }
        .ack-btn-primary:hover:not(:disabled) { opacity: 0.88; transform: scale(0.99); }
        .ack-btn-primary:active:not(:disabled) { transform: scale(0.97); }
        .ack-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .ack-btn-secondary {
          width: 100%;
          height: 48px;
          border-radius: 14px;
          background: transparent;
          color: #71717a;
          font-size: 14px;
          border: none;
          cursor: pointer;
          font-family: inherit;
          margin-top: 10px;
          transition: color 0.15s ease;
        }
        .ack-btn-secondary:hover { color: #a1a1aa; }
      `}</style>

      <div style={{ padding: '32px 20px' }}>
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: is20th ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)',
            border: `1px solid ${is20th ? 'rgba(59,130,246,0.25)' : 'rgba(139,92,246,0.25)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="34" height="34" fill="none" viewBox="0 0 24 24" stroke={is20th ? '#60a5fa' : '#a78bfa'} strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </div>
          <h1 style={{ color: '#fafafa', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>
            {is20th ? '20 Tarikh ka Reminder' : '25 Tarikh ka Reminder'}
          </h1>
          <p style={{ color: '#71717a', fontSize: '15px', lineHeight: 1.5, margin: 0 }}>
            {is20th
              ? 'Cycle ka aadha time ho gaya. Apni readiness aur data check karo.'
              : 'Cutoff nears ho rahi hai. Baaki submissions jaldi submit karo.'}
          </p>
        </div>

        {/* Info card */}
        <div style={{
          background: '#111113',
          border: '1px solid #27272a',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '28px',
        }}>
          <p style={{ color: '#fafafa', fontSize: '15px', fontWeight: 600, margin: '0 0 14px' }}>
            {is20th ? '20 Tarikh checklist:' : '25 Tarikh checklist:'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(is20th
              ? ['Apni readiness confirm kar li?', 'Stock numbers check kar liye?', 'Koi issue hai toh supervisor ko batao']
              : ['Saari submissions submit kar di?', 'Closing stock numbers final kar liye?', '28 tarikh tak sab kuch complete karo']
            ).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: is20th ? 'rgba(59,130,246,0.12)' : 'rgba(139,92,246,0.12)',
                  border: `1px solid ${is20th ? 'rgba(59,130,246,0.3)' : 'rgba(139,92,246,0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px',
                }}>
                  <span style={{ color: is20th ? '#60a5fa' : '#a78bfa', fontSize: '11px', fontWeight: 700 }}>{i + 1}</span>
                </div>
                <p style={{ color: '#a1a1aa', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>{item}</p>
              </div>
            ))}
          </div>
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
          onClick={handleAck}
          disabled={loading}
          className="ack-btn-primary"
          style={{ background: is20th ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}
        >
          {loading ? 'Ho raha hai...' : 'Samajh gaya, Confirm Karo'}
        </button>

        <button onClick={() => router.push('/home')} className="ack-btn-secondary">
          Baad mein karta hoon
        </button>
      </div>
    </>
  );
}
