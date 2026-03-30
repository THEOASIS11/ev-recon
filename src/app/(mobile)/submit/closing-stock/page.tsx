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

// A product is "done" if ANY of its 3 fields has been touched (even 0 counts)
function isEntryDone(e: ProductEntry): boolean {
  return e.sellable !== '' || e.unassembled !== '' || e.defective !== '';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ClosingStockPage() {
  const { user, token, ready } = useAuth();
  const router = useRouter();

  const [cycleId, setCycleId] = useState<string | null>(null);
  const [cycleStatus, setCycleStatus] = useState<string>('active');
  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<Record<string, ProductEntry>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [existingSubmission, setExistingSubmission] = useState<{ id: string; submitted_at: string } | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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
          setCycleStatus(json.cycle.status);

          // Load existing submission if any
          const subRes = await fetch(`/api/v1/submissions/me?cycle_id=${json.cycle.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (subRes.ok) {
            const subJson = await subRes.json();
            const existing = (subJson.submissions || []).find(
              (s: { submission_type: string; id: string; submitted_at: string; data: unknown }) =>
                s.submission_type === 'closing_stock_furkan'
            );
            if (existing) {
              setExistingSubmission({ id: existing.id, submitted_at: existing.submitted_at });
            }
          }
        }
      }

      if (prodRes.ok) {
        const json = await prodRes.json();
        const prods: Product[] = json.products || [];
        setProducts(prods);

        // Initialize empty entries — will be overwritten if existing submission found
        const initial: Record<string, ProductEntry> = {};
        prods.forEach((p) => { initial[p.id] = { sellable: '', unassembled: '', defective: '' }; });
        setEntries(initial);
        if (prods.length > 0) setExpanded(prods[0].id);
      }
    } catch {
      // silent
    } finally {
      setInitLoading(false);
    }
  }, [token, user]);

  // Second pass: once we have products AND an existing submission, load the saved values
  const loadExistingValues = useCallback(async () => {
    if (!token || !existingSubmission || products.length === 0) return;
    try {
      const subRes = await fetch(`/api/v1/submissions/me?cycle_id=${cycleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!subRes.ok) return;
      const subJson = await subRes.json();
      const existing = (subJson.submissions || []).find(
        (s: { submission_type: string }) => s.submission_type === 'closing_stock_furkan'
      );
      if (!existing?.data?.products) return;

      const savedEntries: Record<string, ProductEntry> = {};
      products.forEach((p) => { savedEntries[p.id] = { sellable: '', unassembled: '', defective: '' }; });

      (existing.data.products as Array<{ product: string; sellable: number; unassembled: number; defective: number }>).forEach((item) => {
        const prod = products.find((p) => p.name === item.product);
        if (prod) {
          savedEntries[prod.id] = {
            sellable: String(item.sellable ?? ''),
            unassembled: String(item.unassembled ?? ''),
            defective: String(item.defective ?? ''),
          };
        }
      });
      setEntries(savedEntries);
    } catch {
      // silent
    }
  }, [token, existingSubmission, products, cycleId]);

  useEffect(() => {
    if (ready && token && user) fetchData();
  }, [ready, token, user, fetchData]);

  useEffect(() => {
    if (existingSubmission && products.length > 0) loadExistingValues();
  }, [existingSubmission, products, loadExistingValues]);

  if (!ready || !user) return null;

  // Computed totals
  const totals = products.reduce(
    (acc, p) => {
      const e = entries[p.id] ?? { sellable: '', unassembled: '', defective: '' };
      acc.sellable += parseNum(e.sellable);
      acc.unassembled += parseNum(e.unassembled);
      acc.defective += parseNum(e.defective);
      acc.total += entryTotal(e);
      return acc;
    },
    { sellable: 0, unassembled: 0, defective: 0, total: 0 }
  );

  const doneCount = products.filter((p) => isEntryDone(entries[p.id] ?? { sellable: '', unassembled: '', defective: '' })).length;
  const allDone = doneCount === products.length && products.length > 0;
  const isReadOnly = cycleStatus === 'signed_off';

  function setField(productId: string, field: keyof ProductEntry, value: string) {
    setEntries((prev) => ({ ...prev, [productId]: { ...prev[productId], [field]: value } }));
  }

  async function handleSubmit() {
    if (!token || !cycleId || !allDone || isReadOnly) return;
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

      if (res.ok) {
        const json = await res.json();
        setExistingSubmission({ id: json.submission.id, submitted_at: json.submission.submitted_at });
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          router.push('/home');
        }, 2200);
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
          <p className="s-txt" style={{color:'#22c55e',fontSize:'22px',fontWeight:700,margin:'0 0 8px'}}>
            {existingSubmission ? 'Update ho gaya!' : 'Submit ho gaya!'}
          </p>
          <p className="s-sub" style={{color:'#71717a',fontSize:'14px',margin:0}}>Home screen par ja rahe hain...</p>
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

        /* Input */
        .cs-input {
          width: 100%;
          background: #09090b;
          border: 1px solid #27272a;
          border-radius: 10px;
          padding: 14px;
          font-size: 20px;
          font-weight: 600;
          color: #fafafa;
          text-align: center;
          outline: none;
          font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .cs-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }
        .cs-input::placeholder { color: #3f3f46; font-weight: 400; font-size: 18px; }
        .cs-input:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Accordion */
        .acc-item {
          border-radius: 14px;
          overflow: hidden;
          transition: border-color 0.15s ease;
          border: 1px solid #27272a;
          background: #111113;
        }
        .acc-item.open {
          background: #18181b;
          border-color: #3b82f6;
          box-shadow: 0 0 20px rgba(59,130,246,0.06);
        }
        .acc-item.done:not(.open) {
          border-left: 3px solid #22c55e;
        }
        .acc-header {
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
        .acc-header:disabled { cursor: default; }
        .acc-body {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.25s ease;
        }
        .acc-body.open { max-height: 400px; }

        /* Submit btn */
        .sub-btn {
          width: 100%;
          height: 56px;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 700;
          border: none;
          font-family: inherit;
          cursor: pointer;
          transition: opacity 0.15s ease, transform 0.1s ease;
        }
        .sub-btn.on { background: linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; }
        .sub-btn.on:hover { opacity:.88; }
        .sub-btn.on:active { transform:scale(0.98); }
        .sub-btn.off { background:#18181b; color:#71717a; cursor:not-allowed; }

        .back-btn { background:none;border:none;cursor:pointer;color:#71717a;padding:4px;font-family:inherit;transition:color 0.15s; }
        .back-btn:hover { color:#a1a1aa; }
        .field-label { font-size:13px; color:#a1a1aa; margin-bottom:6px; display:block; }
      `}</style>

      {/* Page wrapper */}
      <div style={{paddingBottom:'200px'}}>

        {/* ── Header ── */}
        <div style={{padding:'28px 16px 0'}}>
          <button onClick={()=>router.push('/home')} className="back-btn" style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'12px',fontSize:'14px'}}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <h1 style={{color:'#fafafa',fontSize:'22px',fontWeight:700,margin:'0 0 6px'}}>Tranzact Closing Stock</h1>
          <p style={{color:'#71717a',fontSize:'13px',margin:'0 0 16px',lineHeight:1.5}}>
            Enter Sellable, Unassembled, and Defective count for each product
          </p>

          {/* Edit mode banner */}
          {existingSubmission && !isReadOnly && (
            <div style={{
              background:'rgba(59,130,246,0.08)',
              border:'1px solid rgba(59,130,246,0.25)',
              borderRadius:'12px',
              padding:'10px 14px',
              marginBottom:'16px',
              display:'flex',
              alignItems:'flex-start',
              gap:'10px',
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth={2} style={{flexShrink:0,marginTop:'1px'}}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p style={{color:'#93c5fd',fontSize:'12px',margin:0,lineHeight:1.5}}>
                Submitted on {formatDate(existingSubmission.submitted_at)}. You can edit and resubmit until the cycle is signed off.
              </p>
            </div>
          )}

          {/* Signed-off banner */}
          {isReadOnly && (
            <div style={{
              background:'rgba(239,68,68,0.08)',
              border:'1px solid rgba(239,68,68,0.25)',
              borderRadius:'12px',
              padding:'10px 14px',
              marginBottom:'16px',
              display:'flex',
              gap:'10px',
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2} style={{flexShrink:0,marginTop:'1px'}}>
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <p style={{color:'#fca5a5',fontSize:'12px',margin:0,lineHeight:1.5}}>
                Cycle sign-off ho chuka hai. Ab koi changes nahi kar sakte.
              </p>
            </div>
          )}
        </div>

        {/* ── Sticky totals bar ── */}
        <div style={{
          position:'sticky',
          top:0,
          zIndex:20,
          margin:'0 16px 16px',
          background:'#111113',
          border:'1px solid #27272a',
          borderRadius:'14px',
          padding:'14px 16px',
        }}>
          {/* 4-column totals */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'8px',marginBottom:'10px'}}>
            {[
              {label:'Sellable', value:totals.sellable, color:'#22c55e'},
              {label:'Unassembled', value:totals.unassembled, color:'#3b82f6'},
              {label:'Defective', value:totals.defective, color:'#ef4444'},
              {label:'Total', value:totals.total, color:'#fafafa'},
            ].map(({label,value,color})=>(
              <div key={label} style={{textAlign:'center'}}>
                <p style={{fontSize:'10px',color:'#71717a',textTransform:'uppercase',letterSpacing:'0.5px',margin:'0 0 3px',fontWeight:600}}>{label}</p>
                <p style={{fontSize:'20px',fontWeight:700,color,margin:0,lineHeight:1}}>{value}</p>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div style={{height:'3px',background:'#27272a',borderRadius:'99px',overflow:'hidden',marginBottom:'6px'}}>
            <div style={{
              height:'100%',
              background:'#3b82f6',
              borderRadius:'99px',
              width:`${products.length>0 ? (doneCount/products.length)*100 : 0}%`,
              transition:'width 0.3s ease',
            }}/>
          </div>
          <p style={{fontSize:'11px',color:'#71717a',margin:0,textAlign:'right'}}>
            {doneCount}/{products.length} products done
          </p>
        </div>

        {/* ── Accordion product list ── */}
        <div style={{padding:'0 16px',display:'flex',flexDirection:'column',gap:'10px'}}>
          {products.map((p, idx) => {
            const e = entries[p.id] ?? {sellable:'',unassembled:'',defective:''};
            const isOpen = expanded === p.id;
            const done = isEntryDone(e);
            const total = entryTotal(e);

            return (
              <div key={p.id} className={`acc-item${isOpen?' open':''}${done&&!isOpen?' done':''}`}>
                <button
                  className="acc-header"
                  onClick={()=>setExpanded(isOpen ? null : p.id)}
                  disabled={isReadOnly}
                >
                  {/* Status indicator */}
                  <div style={{
                    width:'32px',height:'32px',borderRadius:'50%',flexShrink:0,
                    background: done ? 'rgba(34,197,94,0.12)' : isOpen ? 'rgba(59,130,246,0.12)' : '#18181b',
                    border:`2px solid ${done ? '#22c55e' : isOpen ? '#3b82f6' : '#3f3f46'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    transition:'all 0.15s ease',
                  }}>
                    {done ? (
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2.5}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <span style={{color:isOpen?'#3b82f6':'#71717a',fontSize:'11px',fontWeight:700}}>{idx+1}</span>
                    )}
                  </div>

                  {/* Name + summary */}
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{
                      color: done ? '#fafafa' : '#a1a1aa',
                      fontSize:'15px',fontWeight:done?600:400,margin:0,lineHeight:1.2,
                    }}>
                      {done && <span style={{color:'#22c55e',marginRight:'4px'}}>✓</span>}
                      {p.name}
                    </p>
                    {done && !isOpen && (
                      <p style={{color:'#71717a',fontSize:'12px',margin:'3px 0 0'}}>
                        Sellable: {parseNum(e.sellable)} · Unassembled: {parseNum(e.unassembled)} · Defective: {parseNum(e.defective)}
                      </p>
                    )}
                  </div>

                  {/* Right: total or chevron */}
                  <div style={{textAlign:'right',flexShrink:0}}>
                    {done ? (
                      <span style={{color:'#3b82f6',fontSize:'16px',fontWeight:700}}>
                        {total}
                      </span>
                    ) : (
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24"
                        stroke={isOpen?'#3b82f6':'#52525b'} strokeWidth={2}
                        style={{transition:'transform 0.2s ease',transform:isOpen?'rotate(90deg)':'none'}}
                      >
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    )}
                  </div>
                </button>

                {/* Expanded body */}
                <div className={`acc-body${isOpen?' open':''}`}>
                  <div style={{padding:'0 16px 20px'}}>
                    <p style={{color:'#fafafa',fontSize:'16px',fontWeight:700,margin:'0 0 16px'}}>{p.name}</p>

                    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
                      {/* Sellable */}
                      <div>
                        <label className="field-label">Sellable</label>
                        <input
                          type="number" inputMode="numeric" min="0" placeholder="0"
                          value={e.sellable}
                          onChange={(ev)=>setField(p.id,'sellable',ev.target.value)}
                          className="cs-input"
                          disabled={isReadOnly}
                          autoFocus={isOpen && !done}
                        />
                      </div>
                      {/* Unassembled */}
                      <div>
                        <label className="field-label">Unassembled</label>
                        <input
                          type="number" inputMode="numeric" min="0" placeholder="0"
                          value={e.unassembled}
                          onChange={(ev)=>setField(p.id,'unassembled',ev.target.value)}
                          className="cs-input"
                          disabled={isReadOnly}
                        />
                      </div>
                      {/* Defective */}
                      <div>
                        <label className="field-label">Defective</label>
                        <input
                          type="number" inputMode="numeric" min="0" placeholder="0"
                          value={e.defective}
                          onChange={(ev)=>setField(p.id,'defective',ev.target.value)}
                          className="cs-input"
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>

                    {/* Live total + next button */}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'14px'}}>
                      <span style={{color:'#3b82f6',fontSize:'16px',fontWeight:700}}>
                        Total: {total}
                      </span>
                      {idx < products.length - 1 && (
                        <button
                          onClick={()=>setExpanded(products[idx+1].id)}
                          style={{
                            background:'rgba(59,130,246,0.12)',
                            border:'1px solid rgba(59,130,246,0.25)',
                            borderRadius:'8px',
                            color:'#60a5fa',
                            fontSize:'13px',
                            fontWeight:600,
                            padding:'6px 14px',
                            cursor:'pointer',
                            fontFamily:'inherit',
                          }}
                        >
                          Next →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Sticky bottom bar ── */}
      <div style={{
        position:'fixed',
        bottom:64,
        left:'50%',
        transform:'translateX(-50%)',
        width:'100%',
        maxWidth:'480px',
        background:'rgba(9,9,11,0.97)',
        borderTop:'1px solid #27272a',
        backdropFilter:'blur(12px)',
        WebkitBackdropFilter:'blur(12px)',
        padding:'14px 16px',
        zIndex:50,
      }}>
        {/* Progress text */}
        <p style={{color:'#71717a',fontSize:'12px',margin:'0 0 10px',textAlign:'center'}}>
          {allDone
            ? `${products.length}/${products.length} products done — ready to submit`
            : `${doneCount}/${products.length} done — ${products.length-doneCount} remaining`}
        </p>

        {error && (
          <div style={{
            background:'#1c1917',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'10px',
            padding:'8px 12px',marginBottom:'10px',display:'flex',alignItems:'center',gap:'8px',
          }}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#ef4444',flexShrink:0}}/>
            <p style={{color:'#fca5a5',fontSize:'13px',margin:0}}>{error}</p>
          </div>
        )}

        {!isReadOnly && (
          <button
            onClick={handleSubmit}
            disabled={!allDone || loading}
            className={`sub-btn ${allDone&&!loading ? 'on' : 'off'}`}
          >
            {loading
              ? 'Submit ho raha hai...'
              : existingSubmission
              ? 'Update Closing Stock'
              : 'Submit Closing Stock'}
          </button>
        )}
      </div>
    </>
  );
}
