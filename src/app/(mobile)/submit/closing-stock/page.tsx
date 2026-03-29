'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

interface Product {
  id: string;
  name: string;
}

interface ProductEntry {
  sellable: string;
  unassembled: string;
  defective: string;
}

function parseNum(s: string): number {
  const n = parseInt(s, 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

function entryTotal(e: ProductEntry): number {
  return parseNum(e.sellable) + parseNum(e.unassembled) + parseNum(e.defective);
}

function isEntryFilled(e: ProductEntry): boolean {
  return e.sellable !== '' || e.unassembled !== '' || e.defective !== '';
}

export default function ClosingStockPage() {
  const { user, token, ready } = useAuth();
  const router = useRouter();

  const [cycleId, setCycleId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<Record<string, ProductEntry>>({});
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
              (s: { submission_type: string }) => s.submission_type === 'closing_stock_furkan'
            );
            setAlreadyDone(done);
          }
        }
      }

      if (prodRes.ok) {
        const json = await prodRes.json();
        const prods: Product[] = json.products || [];
        setProducts(prods);
        // Initialize empty entries
        const initial: Record<string, ProductEntry> = {};
        prods.forEach((p) => {
          initial[p.id] = { sellable: '', unassembled: '', defective: '' };
        });
        setEntries(initial);
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

  const grandTotal = products.reduce((acc, p) => acc + entryTotal(entries[p.id] ?? { sellable: '', unassembled: '', defective: '' }), 0);
  const filledCount = products.filter((p) => isEntryFilled(entries[p.id] ?? { sellable: '', unassembled: '', defective: '' })).length;
  const allFilled = filledCount === products.length && products.length > 0;

  function setField(productId: string, field: keyof ProductEntry, value: string) {
    setEntries((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  }

  async function handleSubmit() {
    if (!token || !cycleId || !allFilled) return;
    setLoading(true);
    setError('');
    try {
      const productsData = products.map((p) => {
        const e = entries[p.id] ?? { sellable: '', unassembled: '', defective: '' };
        return {
          product: p.name,
          sellable: parseNum(e.sellable),
          unassembled: parseNum(e.unassembled),
          defective: parseNum(e.defective),
          total: entryTotal(e),
        };
      });

      const res = await fetch('/api/v1/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cycle_id: cycleId,
          submission_type: 'closing_stock_furkan',
          data: { products: productsData },
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
          @keyframes scaleIn { from{transform:scale(0.5);opacity:0;}to{transform:scale(1);opacity:1;} }
          @keyframes checkDraw { from{stroke-dashoffset:40;}to{stroke-dashoffset:0;} }
          @keyframes fadeUp { from{transform:translateY(12px);opacity:0;}to{transform:translateY(0);opacity:1;} }
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
          <p className="s-txt" style={{color:'#22c55e',fontSize:'22px',fontWeight:700,margin:'0 0 8px'}}>Submit ho gaya!</p>
          <p className="s-sub" style={{color:'#71717a',fontSize:'14px',margin:0}}>Home screen par ja rahe hain...</p>
        </div>
      </>
    );
  }

  // ── Already done state ─────────────────────────────────────────────────────
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
          <p className="s-sub" style={{color:'#71717a',fontSize:'14px',margin:'0 0 28px',textAlign:'center'}}>Aapne closing stock pehle hi submit kar diya hai.</p>
          <button onClick={()=>router.push('/home')} style={{color:'#3b82f6',background:'none',border:'none',fontSize:'15px',cursor:'pointer',fontFamily:'inherit'}}>← Home par Jao</button>
        </div>
      </>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────────
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
        .cs-input {
          flex: 1;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 18px;
          font-weight: 700;
          color: #fafafa;
          text-align: center;
          outline: none;
          font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          min-width: 0;
          width: 100%;
        }
        .cs-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59,130,246,0.15);
        }
        .cs-input::placeholder { color: #52525b; font-weight: 400; font-size: 16px; }
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
        .accordion-body.open { max-height: 220px; }
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
        .field-label {
          font-size: 11px;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 600;
          margin-bottom: 6px;
          text-align: center;
        }
      `}</style>

      {/* Header — NOT sticky, scrolls away */}
      <div style={{padding:'28px 16px 0'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'6px'}}>
          <button onClick={()=>router.push('/home')} className="back-btn">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 style={{color:'#fafafa',fontSize:'20px',fontWeight:700,margin:0}}>Closing Stock</h1>
        </div>
        <p style={{color:'#71717a',fontSize:'13px',paddingLeft:'36px',marginBottom:'20px'}}>
          {filledCount}/{products.length} products filled
        </p>
      </div>

      {/* Scrollable accordion list */}
      <div style={{padding:'0 16px',paddingBottom:'160px',display:'flex',flexDirection:'column',gap:'10px'}}>
        {products.map((p, idx) => {
          const e = entries[p.id] ?? { sellable: '', unassembled: '', defective: '' };
          const isOpen = expanded === p.id;
          const filled = isEntryFilled(e);
          const total = entryTotal(e);

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
                  border: `2px solid ${filled ? '#22c55e' : isOpen ? '#3b82f6' : '#3f3f46'}`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  transition:'all 0.15s ease',
                }}>
                  {filled ? (
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2.5}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <span style={{color: isOpen ? '#3b82f6' : '#71717a',fontSize:'11px',fontWeight:700}}>{idx+1}</span>
                  )}
                </div>

                <div style={{flex:1,minWidth:0}}>
                  <p style={{color: filled ? '#22c55e' : '#fafafa',fontSize:'15px',fontWeight:600,margin:0,lineHeight:1.2}}>
                    {p.name}
                  </p>
                  {filled && !isOpen && (
                    <p style={{color:'#71717a',fontSize:'12px',margin:'2px 0 0'}}>
                      Total: <span style={{color:'#a1a1aa',fontWeight:600}}>{total}</span>
                    </p>
                  )}
                </div>

                <svg
                  width="18" height="18" fill="none" viewBox="0 0 24 24"
                  stroke={isOpen ? '#3b82f6' : '#52525b'} strokeWidth={2}
                  style={{transition:'transform 0.2s ease',transform: isOpen ? 'rotate(90deg)' : 'none',flexShrink:0}}
                >
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>

              <div className={`accordion-body${isOpen ? ' open' : ''}`}>
                <div style={{padding:'0 16px 16px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
                    {/* Bikau */}
                    <div>
                      <p className="field-label">Bikau</p>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="0"
                        value={e.sellable}
                        onChange={(ev)=>setField(p.id,'sellable',ev.target.value)}
                        className="cs-input"
                      />
                    </div>
                    {/* Bina Jode */}
                    <div>
                      <p className="field-label">Bina Jode</p>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="0"
                        value={e.unassembled}
                        onChange={(ev)=>setField(p.id,'unassembled',ev.target.value)}
                        className="cs-input"
                      />
                    </div>
                    {/* Kharab */}
                    <div>
                      <p className="field-label">Kharab</p>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="0"
                        value={e.defective}
                        onChange={(ev)=>setField(p.id,'defective',ev.target.value)}
                        className="cs-input"
                      />
                    </div>
                  </div>

                  {/* Row total */}
                  <div style={{marginTop:'12px',display:'flex',justifyContent:'flex-end',alignItems:'center',gap:'8px'}}>
                    <span style={{color:'#71717a',fontSize:'12px'}}>Total:</span>
                    <span style={{color:'#3b82f6',fontSize:'18px',fontWeight:700}}>{total}</span>
                    {idx < products.length - 1 && (
                      <button
                        onClick={()=>setExpanded(products[idx+1].id)}
                        style={{
                          marginLeft:'auto',
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
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky totals bar + submit */}
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
        {/* Grand total row */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
          <div style={{display:'flex',gap:'16px'}}>
            <span style={{color:'#71717a',fontSize:'12px'}}>
              <span style={{color:'#a1a1aa',fontWeight:600}}>{filledCount}</span>/{products.length} filled
            </span>
            <span style={{color:'#71717a',fontSize:'12px'}}>
              Grand Total: <span style={{color:'#3b82f6',fontWeight:700,fontSize:'14px'}}>{grandTotal}</span>
            </span>
          </div>
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
          {loading ? 'Submit ho raha hai...' : allFilled ? 'Final Submit Karo ✓' : `${products.length - filledCount} products baaki hain`}
        </button>
      </div>
    </>
  );
}
