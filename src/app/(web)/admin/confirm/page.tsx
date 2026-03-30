'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface CategoryData {
  sellable: number;
  unassembled: number;
  defective: number;
  total: number;
}

interface ProductRow {
  product_id: string;
  product_name: string;
  closing: CategoryData | null;
  count: CategoryData | null;
  gap: CategoryData | null;
}

interface ReportData {
  cycle: {
    id: string;
    cycle_month: string;
    status: string;
    signed_off_at: string | null;
    signed_off_by: string | null;
    confirmed_at: string | null;
    investigation_notes: string | null;
    returns_in_transit: { amazon: number; flipkart: number };
  };
  product_rows: ProductRow[];
  totals_closing: CategoryData;
  totals_count: CategoryData;
  totals_gap: CategoryData;
  total_returns: number;
  returns_in_transit: { amazon: number; flipkart: number };
  submissions_summary: {
    closing_stock_done: boolean;
    physical_count_done: boolean;
    defects_done: boolean;
  };
}

const CATS: Array<{ key: keyof CategoryData; label: string }> = [
  { key: 'sellable', label: 'Sellable' },
  { key: 'unassembled', label: 'Unassembled' },
  { key: 'defective', label: 'Defective' },
  { key: 'total', label: 'Total' },
];

function GapBadge({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: '#d1d5db' }}>—</span>;
  const isNeg = value < 0;
  const isZero = value === 0;
  return (
    <span style={{
      fontSize: '13px', fontWeight: '600',
      color: isNeg ? '#dc2626' : isZero ? '#6b7280' : '#16a34a',
      backgroundColor: isNeg ? '#fef2f2' : isZero ? '#f9fafb' : '#f0fdf4',
      border: `1px solid ${isNeg ? '#fecaca' : isZero ? '#e5e7eb' : '#bbf7d0'}`,
      borderRadius: '6px', padding: '2px 8px', display: 'inline-block',
    }}>
      {value >= 0 ? '+' : ''}{value}
    </span>
  );
}

export default function AdminConfirmPage() {
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [waitingData, setWaitingData] = useState<{ closing_stock_done: boolean; physical_count_done: boolean; noSignoff?: boolean } | null>(null);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmationNotes, setConfirmationNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const cycleRes = await fetch('/api/v1/cycles/active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!cycleRes.ok) { setLoading(false); return; }
      const cycleJson = await cycleRes.json();
      if (!cycleJson.cycle) { setLoading(false); return; }
      const id = cycleJson.cycle.id;
      setCycleId(id);

      const reportRes = await fetch(`/api/v1/cycles/${id}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (reportRes.ok) {
        const data = await reportRes.json();
        if (data.status === 'waiting') {
          setWaitingData({ closing_stock_done: data.closing_stock_done, physical_count_done: data.physical_count_done });
          setReport(null);
        } else {
          setReport(data);
          setWaitingData(null);
          // Check if Arjun signed off
          if (!data.cycle.signed_off_at) {
            setWaitingData({ closing_stock_done: true, physical_count_done: true, noSignoff: true });
            setReport(null);
          }
          // Check if already confirmed by Asis
          if (data.cycle.confirmed_at || data.cycle.status === 'signed_off') {
            setAlreadyConfirmed(true);
            setReport(data);
            setWaitingData(null);
          }
        }
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.role !== 'admin') {
          router.replace('/dashboard');
          return;
        }
      } catch { /* ignore */ }
    }
    fetchData();
  }, [fetchData, router]);

  async function handleConfirm() {
    if (!cycleId || !token || !report) return;
    const cycleLabel = new Date(report.cycle.cycle_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const ok = window.confirm(
      `${cycleLabel} cycle ko permanently close karein?\n\nYeh action undo nahi ho sakti.`
    );
    if (!ok) return;

    setConfirming(true);
    try {
      const res = await fetch(`/api/v1/cycles/${cycleId}/confirm`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation_notes: confirmationNotes }),
      });
      if (res.ok) {
        setAlreadyConfirmed(true);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Confirmation failed');
      }
    } catch { /* silent */ } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
        <p style={{ color: '#9ca3af' }}>Loading...</p>
      </div>
    );
  }

  // Waiting state — submissions not done or Arjun hasn't signed off
  if (waitingData && !report) {
    const noSignoff = waitingData.noSignoff;
    return (
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 24px' }}>Confirm Cycle</h1>
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '14px', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
          <p style={{ fontSize: '18px', fontWeight: '700', color: '#92400e', margin: '0 0 12px' }}>
            {noSignoff ? 'Arjun Ka Sign-off Pending' : 'Data Submission Pending'}
          </p>
          <p style={{ fontSize: '14px', color: '#92400e', margin: '0 0 24px' }}>
            {noSignoff
              ? 'Arjun (supervisor) ne abhi sign-off nahi kiya hai. Unka sign-off hone ke baad aap confirm kar sakte hain.'
              : 'Both Furkan aur Arjun ka data submit hona zaroori hai confirm karne se pehle.'}
          </p>
          <button
            onClick={fetchData}
            style={{ padding: '8px 20px', backgroundColor: '#92400e', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 24px' }}>Confirm Cycle</h1>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: '15px' }}>No active cycle found.</p>
        </div>
      </div>
    );
  }

  const cycle = report.cycle;
  const cycleLabel = new Date(cycle.cycle_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const netLeakage = report.totals_gap.total - report.total_returns;
  const cell: React.CSSProperties = { padding: '9px 14px', fontSize: '13px', color: '#374151', textAlign: 'right', borderBottom: '1px solid #f9fafb', whiteSpace: 'nowrap' };
  const headCell: React.CSSProperties = { padding: '10px 14px', fontSize: '11px', color: '#6b7280', fontWeight: '600', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>Confirm Cycle</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{cycleLabel}</p>
      </div>

      {/* Already confirmed banner */}
      {alreadyConfirmed && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '24px' }}>✅</span>
          <div>
            <p style={{ fontSize: '15px', fontWeight: '700', color: '#16a34a', margin: '0 0 2px' }}>Cycle Confirmed & Closed</p>
            {cycle.confirmed_at && (
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                {new Date(cycle.confirmed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Arjun's sign-off info */}
      {cycle.signed_off_at && (
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#1d4ed8', margin: '0 0 4px' }}>
            ✍️ Arjun ka sign-off: {new Date(cycle.signed_off_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
          {cycle.investigation_notes && (
            <p style={{ fontSize: '13px', color: '#374151', margin: '8px 0 0', padding: '10px 14px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #dbeafe', fontStyle: 'italic' }}>
              &quot;{cycle.investigation_notes}&quot;
            </p>
          )}
          {!cycle.investigation_notes && (
            <p style={{ fontSize: '12px', color: '#93c5fd', margin: '4px 0 0' }}>Koi investigation notes nahi hain</p>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px 20px' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px', fontWeight: '600' }}>Total Gap</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: report.totals_gap.total < 0 ? '#dc2626' : '#111827', margin: '0 0 4px' }}>
            {report.totals_gap.total >= 0 ? '+' : ''}{report.totals_gap.total}
          </p>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
            S: {report.totals_gap.sellable >= 0 ? '+' : ''}{report.totals_gap.sellable} · U: {report.totals_gap.unassembled >= 0 ? '+' : ''}{report.totals_gap.unassembled} · D: {report.totals_gap.defective >= 0 ? '+' : ''}{report.totals_gap.defective}
          </p>
        </div>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px 20px' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px', fontWeight: '600' }}>Returns in Transit</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>{report.total_returns}</p>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>Amazon: {cycle.returns_in_transit?.amazon || 0} · Flipkart: {cycle.returns_in_transit?.flipkart || 0}</p>
        </div>
        <div style={{ backgroundColor: netLeakage < -2 ? '#fef2f2' : '#f0fdf4', borderRadius: '12px', border: `1px solid ${netLeakage < -2 ? '#fecaca' : '#bbf7d0'}`, padding: '16px 20px' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px', fontWeight: '600' }}>Net Leakage</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: netLeakage < -2 ? '#dc2626' : '#16a34a', margin: '0 0 4px' }}>
            {netLeakage >= 0 ? '+' : ''}{netLeakage}
          </p>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>Gap minus Returns</p>
        </div>
      </div>

      {/* 3-category comparison table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>Per-Product Comparison</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ ...headCell, textAlign: 'left', minWidth: '160px', position: 'sticky', left: 0, backgroundColor: '#f9fafb', zIndex: 1 }}>Product</th>
                <th style={{ ...headCell, textAlign: 'left', minWidth: '100px' }}>Category</th>
                <th style={{ ...headCell, minWidth: '90px' }}>Tranzact</th>
                <th style={{ ...headCell, minWidth: '90px' }}>Physical</th>
                <th style={{ ...headCell, minWidth: '90px' }}>Gap</th>
              </tr>
            </thead>
            <tbody>
              {report.product_rows.map((row) =>
                CATS.map((cat, catIdx) => {
                  const isTotal = cat.key === 'total';
                  const closingVal = row.closing ? row.closing[cat.key] : null;
                  const countVal = row.count ? row.count[cat.key] : null;
                  const gapVal = row.gap ? row.gap[cat.key] : null;
                  const isFirstCat = catIdx === 0;
                  const isLastCat = catIdx === CATS.length - 1;
                  return (
                    <tr key={`${row.product_id}-${cat.key}`} style={{ borderTop: isFirstCat ? '1px solid #e5e7eb' : '1px solid #f9fafb', backgroundColor: isTotal ? '#f9fafb' : 'transparent' }}>
                      {isFirstCat && (
                        <td rowSpan={4} style={{ padding: '13px 14px', verticalAlign: 'top', borderRight: '1px solid #f3f4f6', position: 'sticky', left: 0, backgroundColor: '#ffffff', zIndex: 1 }}>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0, whiteSpace: 'nowrap' }}>{row.product_name}</p>
                        </td>
                      )}
                      <td style={{ ...cell, textAlign: 'left', color: isTotal ? '#111827' : '#6b7280', fontWeight: isTotal ? '700' : '400', fontSize: isTotal ? '13px' : '12px', borderBottom: isLastCat ? '1px solid #e5e7eb' : '1px solid #f9fafb', paddingLeft: '14px' }}>
                        {isTotal ? 'Total' : cat.label}
                      </td>
                      <td style={{ ...cell, fontWeight: isTotal ? '700' : '400', color: isTotal ? '#111827' : '#374151', borderBottom: isLastCat ? '1px solid #e5e7eb' : '1px solid #f9fafb' }}>
                        {closingVal !== null ? closingVal : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={{ ...cell, fontWeight: isTotal ? '700' : '400', color: isTotal ? '#111827' : '#374151', borderBottom: isLastCat ? '1px solid #e5e7eb' : '1px solid #f9fafb' }}>
                        {countVal !== null ? countVal : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={{ ...cell, borderBottom: isLastCat ? '1px solid #e5e7eb' : '1px solid #f9fafb' }}>
                        <GapBadge value={gapVal} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation section */}
      {!alreadyConfirmed && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 4px' }}>Step 2: Aapka Confirmation (Asis)</h2>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 16px' }}>
            Arjun ka sign-off review karke cycle close karein. Yeh final step hai.
          </p>
          <textarea
            value={confirmationNotes}
            onChange={(e) => setConfirmationNotes(e.target.value)}
            placeholder="Confirmation notes (optional) — koi additional comments ya decisions..."
            style={{
              width: '100%', minHeight: '100px', padding: '10px 14px',
              border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px',
              color: '#111827', resize: 'vertical', outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box', marginBottom: '16px',
            }}
          />
          <button
            onClick={handleConfirm}
            disabled={confirming}
            style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#ffffff', border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: '700', cursor: 'pointer',
              opacity: confirming ? 0.7 : 1,
            }}
          >
            {confirming ? 'Confirming...' : '✅ Confirm & Close Cycle'}
          </button>
        </div>
      )}

      {/* Info */}
      <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 18px', display: 'flex', gap: '10px' }}>
        <span>⚠️</span>
        <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
          Confirm karne ke baad cycle status permanently &quot;Confirmed & Closed&quot; ho jayegi aur koi changes nahi ho sakte.
        </p>
      </div>
    </div>
  );
}
