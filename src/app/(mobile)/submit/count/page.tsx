'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

interface Product {
  id: string;
  name: string;
}

function parseNum(s: string): number {
  const n = parseInt(s, 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

export default function PhysicalCountPage() {
  const { user, token, ready } = useAuth();
  const router = useRouter();

  const [cycleId, setCycleId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [initLoading, setInitLoading] = useState(true);

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
        const prods: Product[] = json.products || [];
        setProducts(prods);
        const initial: Record<string, string> = {};
        prods.forEach((p) => { initial[p.id] = ''; });
        setQuantities(initial);
        if (prods.length > 0) setExpanded(prods[0].id);
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

  const filledCount = products.filter((p) => quantities[p.id] !== '').length;
  const allFilled = filledCount === products.length && products.length > 0;
  const grandTotal = products.reduce((acc, p) => acc + parseNum(quantities[p.id] ?? ''), 0);

  async function handleSubmit() {
    if (!token || !cycleId || !allFilled) return;
    setLoading(true);
    setError('');
    try {
      const countsData = products.map((p) => ({
        product: p.name,
        count: parseNum(quantities[p.id] ?? ''),
      }));

      const res = await fetch('/api/v1/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cycle_id: cycleId,
          submission_type: 'physical_count_arjun',
          data: { counts: countsData, grand_total: grandTotal },
        }),
      });

      if (res.ok || res.status === 409) {
        setSuccess(true);
        setTimeout(() => router.push('/home'), 2200);
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

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <>
        <style>{`
          @keyframes scaleIn{from{transform:scale(0.5);opacity:0;}to{transform:scale(1);opacity:1;}}
          @keyframes checkDraw{from{stroke-dashoffset:40;}to{stroke-dashoffset:0;}}
          @keyframes fadeUp{from{transform:translateY(12px);opacity:0;}to{transform:translateY(0);opacity:1;}}
          .s-ring{animation:scaleIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards;}
          .s-check{stroke-dasharray:40;stroke-dashoffset:40;animation:checkDraw 0.35s ease 0.3s forwards;}
          .s-txt{opacity:0;animation:fadeUp 0.4s ease 0.5s forwards;}
          .s-sub{opacity:0;animation:fadeUp 0.4s ease 0.65s forwards;}
        `}</style>
        <div style={{padding:'40px 24px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'70vh'}}>
          <div className="s-ring" style={{width:'88px',height:'88px',borderRadius:'50%',background:'rgba(34,197,94,0.12)',border:'2px solid #22c55e',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'24px'}}>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#22c55e">
              <polyline className="s-check" points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="s-txt" style={{color:'#22c55e',fontSize:'22px',fontWeight:700,margin:'0 0 8px'}}>Lock ho gaya!</p>
          <p className="s-sub" style={{color:'#71717a',fontSize:'14px',margin:0}}>Count submit ho gaya. Home par ja rahe hain...</p>
        </div>
      </>
    );
  }

  // ── Already done ───────────────────────────────────────────────────────────
  if (alreadyDone) {
    return (
      <>
        <style>{`
          @keyframes scaleIn{from{transform:scale(0.5);opacity:0;}to{transform:scale(1);opacity:1;}}
          @keyframes fadeUp{from{transform:translateY(12px);opacity:0;}to{transform:translateY(0);opacity:1;}}
          .s-ring{animation:scaleIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards;}
          .s-txt{opacity:0;animation:fadeUp 0.4s ease 0.3s forwards;}
          .s-sub{opacity:0;animation:fadeUp 0.4s ease 0.45s forwards;}
        `}</style>
        <div style={{padding:'40px 24px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'70vh'}}>
          <div className="s-ring" style={{width:'88px',height:'88px',borderRadius:'50%',background:'rgba(34,197,94,0.12)',border:'2px solid #22c55e',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'24px'}}>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#22c55e">
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="s-txt" style={{color:'#22c55e',fontSize:'22px',fontWeight:700,margin:'0 0 8px'}}>Pehle se ho gaya!</p>
          <p className="s-sub" style={{color:'#71717a',fontSize:'14px',margin:'0 0 28px',textAlign:'center'}}>Physical count pehle hi submit aur lock ho chuka hai.</p>
          <button onClick={()=>router.push('/home')} style={{color:'#3b82f6',background:'none',border:'none',fontSize:'15px',cursor:'pointer',fontFamily:'inherit'}}>← Home par Jao</button>
        </div>
      </>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (initLoading) {
    return (
      <div style={{padding:'40px 24px',textAlign:'center'}}>
        <p style={{color:'#71717a',fontSize:'14px'}}>Load ho raha hai...</p>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .pc-input {
          width: 100%;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 28px;
          font-weight: 700;
          color: #fafafa;
          text-align: center;
          outline: none;
          font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .pc-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59,130,246,0.15);
        }
        .pc-input::placeholder { color: #52525b; font-weight: 400; font-size: 22px; }
        .accordion-item {
          background: #111113;
          border: 1px solid #27272a;
          border-radius: 16px;
          overflow: hidden;
          transition: border-color 0.15s ease;
        }
        .accordion-item.open { border-color: #3b82f6; }
        .accordion-item.filled:not(.open) { border-color: rgba(34,197,94,0.35); }
        .accordion-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          cursor: pointer;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          font-family: inherit;
        }
        .accordion-body {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.25s ease;
        }
        .accordion-body.open { max-height: 180px; }
        .submit-btn {
          width: 100%;
          height: 52px;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 700;
          border: none;
          font-family: inherit;
          cursor: pointer;
          transition: opacity 0.2s ease, transform 0.1s ease;
        }
        .submit-btn.active { background: linear-gradient(135deg,#22c55e,#16a34a); color:#fff; }
        .submit-btn.active:hover { opacity: 0.88; transform: scale(0.99); }
        .submit-btn.active:active { transform: scale(0.97); }
        .submit-btn.inactive { background: #18181b; color: #52525b; cursor: not-allowed; }
        .back-btn { background:none;border:none;cursor:pointer;color:#71717a;padding:4px;transition:color 0.15s; }
        .back-btn:hover { color:#a1a1aa; }
      `}</style>

      {/* Header */}
      <div style={{padding:'28px 16px 0'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'6px'}}>
          <button onClick={()=>router.push('/home')} className="back-btn">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 style={{color:'#fafafa',fontSize:'20px',fontWeight:700,margin:0}}>Physical Count — Khud Gino</h1>
        </div>
        <p style={{color:'#71717a',fontSize:'13px',paddingLeft:'36px',marginBottom:'16px'}}>
          {filledCount}/{products.length} products filled
        </p>

        {/* Lock warning */}
        <div style={{
          marginLeft:'36px',
          background:'rgba(239,68,68,0.06)',
          border:'1px solid rgba(239,68,68,0.2)',
          borderRadius:'12px',
          padding:'10px 14px',
          marginBottom:'20px',
          display:'flex',
          alignItems:'flex-start',
          gap:'10px',
        }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2} style={{flexShrink:0,marginTop:'1px'}}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p style={{color:'#fca5a5',fontSize:'12px',margin:0,lineHeight:1.5}}>
            Submit karne ke baad count lock ho jayega. Dobara submit nahi kar sakte.
          </p>
        </div>
      </div>

      {/* Accordion list */}
      <div style={{padding:'0 16px',paddingBottom:'160px',display:'flex',flexDirection:'column',gap:'10px'}}>
        {products.map((p, idx) => {
          const qty = quantities[p.id] ?? '';
          const isOpen = expanded === p.id;
          const filled = qty !== '';
          const count = parseNum(qty);

          return (
            <div
              key={p.id}
              className={`accordion-item${isOpen ? ' open' : ''}${filled && !isOpen ? ' filled' : ''}`}
            >
              <button
                className="accordion-header"
                onClick={() => setExpanded(isOpen ? null : p.id)}
              >
                {/* Status dot */}
                <div style={{
                  width:'32px',height:'32px',borderRadius:'50%',flexShrink:0,
                  background: filled ? 'rgba(34,197,94,0.12)' : isOpen ? 'rgba(59,130,246,0.12)' : '#18181b',
                  border:`2px solid ${filled ? '#22c55e' : isOpen ? '#3b82f6' : '#3f3f46'}`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  transition:'all 0.15s ease',
                }}>
                  {filled ? (
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2.5}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <span style={{color:isOpen?'#3b82f6':'#71717a',fontSize:'11px',fontWeight:700}}>{idx+1}</span>
                  )}
                </div>

                <div style={{flex:1,minWidth:0}}>
                  <p style={{color:filled?'#22c55e':'#fafafa',fontSize:'15px',fontWeight:600,margin:0,lineHeight:1.2}}>
                    {p.name}
                  </p>
                  {filled && !isOpen && (
                    <p style={{color:'#71717a',fontSize:'12px',margin:'2px 0 0'}}>
                      Count: <span style={{color:'#a1a1aa',fontWeight:600}}>{count}</span>
                    </p>
                  )}
                </div>

                <svg
                  width="18" height="18" fill="none" viewBox="0 0 24 24"
                  stroke={isOpen?'#3b82f6':'#52525b'} strokeWidth={2}
                  style={{transition:'transform 0.2s ease',transform:isOpen?'rotate(90deg)':'none',flexShrink:0}}
                >
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>

              <div className={`accordion-body${isOpen ? ' open' : ''}`}>
                <div style={{padding:'0 16px 16px'}}>
                  <p style={{color:'#71717a',fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'8px'}}>
                    Physical Count
                  </p>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    value={qty}
                    onChange={(ev)=>setQuantities({...quantities,[p.id]:ev.target.value})}
                    className="pc-input"
                    autoFocus={isOpen}
                  />
                  {idx < products.length - 1 && (
                    <div style={{display:'flex',justifyContent:'flex-end',marginTop:'10px'}}>
                      <button
                        onClick={()=>setExpanded(products[idx+1].id)}
                        style={{
                          background:'rgba(59,130,246,0.12)',
                          border:'1px solid rgba(59,130,246,0.25)',
                          borderRadius:'8px',
                          color:'#60a5fa',
                          fontSize:'12px',
                          fontWeight:600,
                          padding:'5px 12px',
                          cursor:'pointer',
                          fontFamily:'inherit',
                        }}
                      >
                        Agla →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky bottom bar */}
      <div style={{
        position:'fixed',
        bottom:64,
        left:'50%',
        transform:'translateX(-50%)',
        width:'100%',
        maxWidth:'480px',
        background:'rgba(17,17,19,0.95)',
        borderTop:'1px solid #27272a',
        backdropFilter:'blur(10px)',
        WebkitBackdropFilter:'blur(10px)',
        padding:'12px 16px',
        zIndex:50,
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
          <span style={{color:'#71717a',fontSize:'12px'}}>
            <span style={{color:'#a1a1aa',fontWeight:600}}>{filledCount}</span>/{products.length} filled
          </span>
          <span style={{color:'#71717a',fontSize:'12px'}}>
            Grand Total: <span style={{color:'#3b82f6',fontWeight:700,fontSize:'14px'}}>{grandTotal}</span>
          </span>
        </div>

        {error && (
          <div style={{
            background:'#1c1917',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'10px',
            padding:'8px 12px',marginBottom:'10px',display:'flex',alignItems:'center',gap:'8px',
          }}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#ef4444',flexShrink:0}}/>
            <p style={{color:'#fca5a5',fontSize:'13px',margin:0}}>{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!allFilled || loading}
          className={`submit-btn ${allFilled && !loading ? 'active' : 'inactive'}`}
        >
          {loading
            ? 'Submit ho raha hai...'
            : allFilled
            ? '🔒 Lock Karke Submit Karo'
            : `${products.length - filledCount} products baaki hain`}
        </button>
      </div>
    </>
  );
}
