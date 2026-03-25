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
        setTimeout(() => router.push('/home'), 1500);
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
      <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth={3}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p style={{ color: '#4ade80', fontSize: '20px', fontWeight: '700', margin: 0 }}>Ho gaya!</p>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>Home screen par ja rahe hain...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 20px' }}>
      {/* Icon */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          backgroundColor: is20th ? '#1e3a5f' : '#3b1f5e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke={is20th ? '#60a5fa' : '#c084fc'} strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
        </div>
        <h1 style={{ color: '#ffffff', fontSize: '22px', fontWeight: '700', margin: '0 0 8px' }}>
          {is20th ? '20 Tarikh ka Reminder' : '25 Tarikh ka Reminder'}
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: '1.5', margin: 0 }}>
          {is20th
            ? 'Cycle ka aadha time ho gaya. Apni readiness aur data check karo.'
            : 'Cutoff nears ho rahi hai. Baaki submissions jaldi submit karo.'}
        </p>
      </div>

      {/* Info card */}
      <div style={{
        backgroundColor: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '28px',
      }}>
        {is20th ? (
          <>
            <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>
              20 Tarikh checklist:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['Apni readiness confirm kar li?', 'Stock numbers check kar liye?', 'Koi issue hai toh supervisor ko batao'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <span style={{ color: '#60a5fa', fontSize: '11px', fontWeight: '700' }}>{i + 1}</span>
                  </div>
                  <p style={{ color: '#d1d5db', fontSize: '14px', margin: 0, lineHeight: '1.4' }}>{item}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>
              25 Tarikh checklist:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['Saari submissions submit kar di?', 'Closing stock numbers final kar liye?', '28 tarikh tak sab kuch complete karo'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#3b1f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <span style={{ color: '#c084fc', fontSize: '11px', fontWeight: '700' }}>{i + 1}</span>
                  </div>
                  <p style={{ color: '#d1d5db', fontSize: '14px', margin: 0, lineHeight: '1.4' }}>{item}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {error && (
        <div style={{ backgroundColor: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
          <p style={{ color: '#fca5a5', fontSize: '14px', margin: 0 }}>{error}</p>
        </div>
      )}

      <button
        onClick={handleAck}
        disabled={loading}
        style={{
          width: '100%',
          height: '56px',
          borderRadius: '14px',
          backgroundColor: is20th ? '#2563eb' : '#7c3aed',
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: '700',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {loading ? 'Ho raha hai...' : 'Samajh gaya, Confirm Karo'}
      </button>

      <button
        onClick={() => router.push('/home')}
        style={{
          width: '100%',
          height: '48px',
          borderRadius: '14px',
          backgroundColor: 'transparent',
          color: '#6b7280',
          fontSize: '14px',
          border: 'none',
          cursor: 'pointer',
          marginTop: '10px',
        }}
      >
        Baad mein karta hoon
      </button>
    </div>
  );
}
