'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

interface Product {
  id: string;
  name: string;
}

export default function PhysicalCountPage() {
  const { user, token, ready } = useAuth();
  const router = useRouter();

  const [cycleId, setCycleId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [step, setStep] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [error, setError] = useState('');
  const [initLoading, setInitLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token || !user) return;
    try {
      const [cycleRes, prodRes] = await Promise.all([
        fetch('/api/v1/cycles/active', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/products', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (cycleRes.ok) {
        const json = await cycleRes.json();
        if (json.cycle) {
          setCycleId(json.cycle.id);
          const subRes = await fetch(`/api/v1/submissions/me?cycle_id=${json.cycle.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (subRes.ok) {
            const subJson = await subRes.json();
            const done = (subJson.submissions || []).some(
              (s: { submission_type: string }) => s.submission_type === 'physical_count_arjun'
            );
            setAlreadyDone(done);
          }
        }
      }

      if (prodRes.ok) {
        const json = await prodRes.json();
        setProducts(json.products || []);
      }
    } catch {
      // silent
    } finally {
      setInitLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (ready && token && user) fetchData();
  }, [ready, token, user, fetchData]);

  if (!ready || !user) return null;

  if (initLoading) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    );
  }

  if (alreadyDone) {
    return (
      <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth={3}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p style={{ color: '#4ade80', fontSize: '20px', fontWeight: '700', margin: 0 }}>Pehle se ho gaya!</p>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px', textAlign: 'center' }}>Physical count pehle hi submit ho chuka hai.</p>
        <button onClick={() => router.push('/home')} style={{ marginTop: '24px', color: '#60a5fa', background: 'none', border: 'none', fontSize: '15px', cursor: 'pointer' }}>
          Home par Jao
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth={3}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p style={{ color: '#4ade80', fontSize: '20px', fontWeight: '700', margin: 0 }}>Submit ho gaya!</p>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>Count lock ho gaya. Home par ja rahe hain...</p>
      </div>
    );
  }

  // Review step (last step)
  if (step === products.length) {
    return (
      <div style={{ padding: '24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <button onClick={() => setStep(products.length - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700', margin: 0 }}>Final Review</h1>
        </div>

        <div style={{
          backgroundColor: '#1a2340',
          border: '1px solid #1e3a5f',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '20px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
        }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#60a5fa" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ color: '#93c5fd', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
            Submit karne ke baad count lock ho jayega. Dobara submit nahi kar sakte.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', maxHeight: '50vh', overflowY: 'auto' }}>
          {products.map((p) => (
            <div key={p.id} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ color: '#d1d5db', fontSize: '14px', margin: 0 }}>{p.name}</p>
              <p style={{ color: '#ffffff', fontSize: '18px', fontWeight: '700', margin: 0 }}>{quantities[p.id] || '0'}</p>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ backgroundColor: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
            <p style={{ color: '#fca5a5', fontSize: '14px', margin: 0 }}>{error}</p>
          </div>
        )}

        <button
          onClick={async () => {
            if (!token || !cycleId) return;
            setLoading(true);
            setError('');
            try {
              const countData: Record<string, number> = {};
              products.forEach((p) => {
                countData[p.name] = parseInt(quantities[p.id] || '0', 10);
              });

              const res = await fetch('/api/v1/submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  cycle_id: cycleId,
                  submission_type: 'physical_count_arjun',
                  data: { counts: countData },
                }),
              });

              if (res.ok || res.status === 409) {
                setSuccess(true);
                setTimeout(() => router.push('/home'), 2000);
              } else {
                const json = await res.json();
                setError(json.error || 'Kuch gadbad ho gayi');
              }
            } catch {
              setError('Internet nahi hai');
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          style={{
            width: '100%',
            height: '56px',
            borderRadius: '14px',
            backgroundColor: '#16a34a',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '700',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Submit ho raha hai...' : 'Lock Karke Submit Karo'}
        </button>
      </div>
    );
  }

  // Product entry steps
  const product = products[step];
  if (!product) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Products load nahi hue.</p>
      </div>
    );
  }

  const currentQty = quantities[product.id] || '';
  const canContinue = currentQty !== '' && !isNaN(parseInt(currentQty, 10)) && parseInt(currentQty, 10) >= 0;

  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button
          onClick={() => step === 0 ? router.push('/home') : setStep(step - 1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700', margin: 0 }}>Physical Count</h1>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: '#6b7280', fontSize: '12px' }}>
            Product {step + 1} / {products.length}
          </span>
          <span style={{ color: '#6b7280', fontSize: '12px' }}>
            {Math.round((step / products.length) * 100)}%
          </span>
        </div>
        <div style={{ height: '4px', backgroundColor: '#2a2a2a', borderRadius: '99px' }}>
          <div style={{
            height: '100%',
            width: `${(step / products.length) * 100}%`,
            backgroundColor: '#3b82f6',
            borderRadius: '99px',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      <h2 style={{ color: '#ffffff', fontSize: '26px', fontWeight: '700', margin: '0 0 8px' }}>
        {product.name}
      </h2>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
        Actual physical count enter karo
      </p>

      <input
        type="number"
        inputMode="numeric"
        min="0"
        placeholder="0"
        value={currentQty}
        onChange={(e) => setQuantities({ ...quantities, [product.id]: e.target.value })}
        style={{
          width: '100%',
          height: '80px',
          backgroundColor: '#1a1a1a',
          border: '2px solid #3b82f6',
          borderRadius: '16px',
          color: '#ffffff',
          fontSize: '36px',
          fontWeight: '700',
          textAlign: 'center',
          outline: 'none',
          boxSizing: 'border-box',
          marginBottom: '32px',
        }}
        autoFocus
      />

      <button
        onClick={() => {
          if (!canContinue) return;
          setStep(step + 1);
        }}
        disabled={!canContinue}
        style={{
          width: '100%',
          height: '56px',
          borderRadius: '14px',
          backgroundColor: canContinue ? '#3b82f6' : '#1f2937',
          color: canContinue ? '#ffffff' : '#6b7280',
          fontSize: '16px',
          fontWeight: '700',
          border: 'none',
          cursor: canContinue ? 'pointer' : 'not-allowed',
        }}
      >
        {step < products.length - 1 ? 'Agle Product →' : 'Review Karo'}
      </button>
    </div>
  );
}
