'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ProductRow {
  product_id: string;
  product_name: string;
  sku: string;
  closing_stock: number | null;
  physical_count: number | null;
  difference: number | null;
}

interface ReportData {
  cycle: {
    id: string;
    cycle_month: string;
    status: string;
    signed_off_at: string | null;
    signed_off_by: string | null;
    investigation_notes: string | null;
    returns_in_transit: { amazon: number; flipkart: number };
  };
  product_rows: ProductRow[];
  returns_in_transit: { amazon: number; flipkart: number };
  total_returns: number;
  submissions_summary: {
    closing_stock_done: boolean;
    physical_count_done: boolean;
    defects_done: boolean;
  };
  readiness: { type: string; submitted: boolean }[];
}

interface Clearance {
  user_id: string;
  status: string;
}

export default function SignoffPage() {
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [clearances, setClearances] = useState<Clearance[]>([]);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [signingOff, setSigningOff] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [signedOff, setSignedOff] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [user, setUser] = useState<{ role: string } | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch { /* ignore */ }
    }
  }, []);

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

      const [reportRes, clearRes] = await Promise.all([
        fetch(`/api/v1/cycles/${id}/report`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/v1/clearance?cycle_id=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (reportRes.ok) {
        const data = await reportRes.json();
        setReport(data);
        setNotes(data.cycle.investigation_notes || '');
        if (data.cycle.status === 'signed_off') setSignedOff(true);
        if (data.cycle.status === 'escalated') setEscalated(true);
      }
      if (clearRes.ok) {
        const clearData = await clearRes.json();
        setClearances(clearData.clearances || []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Guard: redirect non-supervisor
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.role !== 'supervisor' && u.role !== 'admin') {
          router.replace('/dashboard');
          return;
        }
      } catch { /* ignore */ }
    }
    fetchData();
  }, [fetchData, router]);

  async function saveNotes() {
    if (!cycleId || !token) return;
    setSavingNotes(true);
    try {
      await fetch(`/api/v1/cycles/${cycleId}/investigation-notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch { /* silent */ } finally {
      setSavingNotes(false);
    }
  }

  async function handleSignOff() {
    if (!cycleId || !token || !report) return;
    const cycleLabel = new Date(report.cycle.cycle_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const confirmed = window.confirm(
      `This will lock ALL data for ${cycleLabel}. This CANNOT be undone.\n\nAre you sure you want to sign off?`
    );
    if (!confirmed) return;

    setSigningOff(true);
    try {
      const res = await fetch(`/api/v1/cycles/${cycleId}/signoff`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSignedOff(true);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to sign off');
      }
    } catch { /* silent */ } finally {
      setSigningOff(false);
    }
  }

  async function handleEscalate() {
    if (!cycleId || !token) return;
    const escalateNotes = window.prompt('Enter escalation notes (required):');
    if (!escalateNotes || !escalateNotes.trim()) {
      alert('Escalation notes are required.');
      return;
    }

    setEscalating(true);
    try {
      const res = await fetch(`/api/v1/cycles/${cycleId}/escalate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: escalateNotes }),
      });
      if (res.ok) {
        setEscalated(true);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to escalate');
      }
    } catch { /* silent */ } finally {
      setEscalating(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
        <p style={{ color: '#9ca3af' }}>Loading...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 24px' }}>Sign-off</h1>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: '15px' }}>No active cycle found.</p>
        </div>
      </div>
    );
  }

  const cycle = report.cycle;
  const cycleLabel = new Date(cycle.cycle_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const totalDiff = report.product_rows.reduce((sum, r) => sum + (r.difference ?? 0), 0);
  const totalReturns = (cycle.returns_in_transit?.amazon || 0) + (cycle.returns_in_transit?.flipkart || 0);
  const netLeakage = totalDiff - totalReturns;
  const clearedCount = clearances.filter((c) => c.status === 'cleared').length;
  const submissionsDone = (report.submissions_summary.closing_stock_done ? 1 : 0) +
    (report.submissions_summary.physical_count_done ? 1 : 0) +
    (report.submissions_summary.defects_done ? 1 : 0) +
    report.readiness.filter((r) => r.submitted).length;
  const totalSubmissions = 3 + report.readiness.length;

  const isReadOnly = signedOff || escalated || cycle.status === 'signed_off' || cycle.status === 'escalated';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>Sign-off</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{cycleLabel}</p>
      </div>

      {/* Signed off banner */}
      {(signedOff || cycle.status === 'signed_off') && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '18px' }}>✅</span>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a', margin: '0 0 2px' }}>Cycle Signed Off</p>
            {cycle.signed_off_at && (
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                Signed off on {new Date(cycle.signed_off_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Escalated banner */}
      {(escalated || cycle.status === 'escalated') && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '18px' }}>🚨</span>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626', margin: '0 0 2px' }}>Escalated to Admin</p>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>This cycle has been escalated to Asis for review.</p>
          </div>
        </div>
      )}

      {/* Cycle summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px 20px' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px', fontWeight: '600' }}>Submissions</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>{submissionsDone} / {totalSubmissions}</p>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>tasks submitted</p>
        </div>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px 20px' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px', fontWeight: '600' }}>Clearance</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>{clearedCount} / {clearances.length || 5}</p>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>staff cleared</p>
        </div>
        <div style={{ backgroundColor: netLeakage < -2 ? '#fef2f2' : '#f0fdf4', borderRadius: '12px', border: `1px solid ${netLeakage < -2 ? '#fecaca' : '#bbf7d0'}`, padding: '16px 20px' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px', fontWeight: '600' }}>Net Leakage</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: netLeakage < -2 ? '#dc2626' : '#16a34a', margin: 0 }}>
            {netLeakage >= 0 ? '+' : ''}{netLeakage}
          </p>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>units (Diff − Returns)</p>
        </div>
      </div>

      {/* Incomplete data warning */}
      {(!report.submissions_summary.closing_stock_done || !report.submissions_summary.physical_count_done) && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '8px' }}>
          <span>⚠️</span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', margin: '0 0 2px' }}>Incomplete data</p>
            <p style={{ fontSize: '12px', color: '#92400e', margin: 0 }}>
              {!report.submissions_summary.closing_stock_done && 'Furkan has not submitted closing stock. '}
              {!report.submissions_summary.physical_count_done && 'Arjun has not submitted physical count. '}
              Report may be partial.
            </p>
          </div>
        </div>
      )}

      {/* Per-product comparison */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>Per-Product Comparison</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Product</th>
              <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: '600', width: '160px' }}>Furkan Closing</th>
              <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: '600', width: '160px' }}>Arjun Count</th>
              <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: '600', width: '140px' }}>Difference</th>
            </tr>
          </thead>
          <tbody>
            {report.product_rows.map((row) => {
              const diff = row.difference;
              const isNeg = diff !== null && diff < 0;
              return (
                <tr key={row.product_id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '13px 20px' }}>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: '0 0 2px' }}>{row.product_name}</p>
                    {row.sku && <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{row.sku}</p>}
                  </td>
                  <td style={{ padding: '13px 20px', textAlign: 'right', fontSize: '14px', color: '#374151' }}>
                    {row.closing_stock !== null ? row.closing_stock : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 20px', textAlign: 'right', fontSize: '14px', color: '#374151' }}>
                    {row.physical_count !== null ? row.physical_count : <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 20px', textAlign: 'right' }}>
                    {diff !== null ? (
                      <span style={{
                        fontSize: '14px', fontWeight: '600',
                        color: isNeg ? '#dc2626' : diff === 0 ? '#6b7280' : '#16a34a',
                        backgroundColor: isNeg ? '#fef2f2' : diff === 0 ? '#f9fafb' : '#f0fdf4',
                        border: `1px solid ${isNeg ? '#fecaca' : diff === 0 ? '#e5e7eb' : '#bbf7d0'}`,
                        borderRadius: '6px', padding: '2px 8px',
                      }}>
                        {diff >= 0 ? '+' : ''}{diff}
                      </span>
                    ) : (
                      <span style={{ color: '#d1d5db', fontSize: '14px' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
              <td style={{ padding: '12px 20px', fontSize: '13px', fontWeight: '700', color: '#111827' }}>Returns in Transit</td>
              <td colSpan={2} style={{ padding: '12px 20px', textAlign: 'right', fontSize: '13px', color: '#6b7280' }}>
                Amazon {cycle.returns_in_transit?.amazon || 0} + Flipkart {cycle.returns_in_transit?.flipkart || 0}
              </td>
              <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '2px 8px' }}>
                  +{totalReturns}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Investigation notes */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 4px' }}>Investigation Notes</h2>
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 16px' }}>Document your findings before signing off. Visible to Hardik and Asis.</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isReadOnly}
          placeholder="Document your findings before signing off..."
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '10px 14px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#111827',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            backgroundColor: isReadOnly ? '#f9fafb' : '#ffffff',
          }}
        />
        {!isReadOnly && (
          <button
            onClick={saveNotes}
            disabled={savingNotes}
            style={{
              marginTop: '10px',
              padding: '7px 18px',
              backgroundColor: notesSaved ? '#16a34a' : '#111827',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            {savingNotes ? 'Saving...' : notesSaved ? '✓ Saved' : 'Save Notes'}
          </button>
        )}
      </div>

      {/* Action buttons */}
      {!isReadOnly && user?.role === 'supervisor' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 4px' }}>Actions</h2>
          <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 16px' }}>Choose how to proceed with this cycle.</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSignOff}
              disabled={signingOff}
              style={{
                padding: '10px 24px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: signingOff ? 0.7 : 1,
              }}
            >
              {signingOff ? 'Signing Off...' : '✓ Sign Off Cycle'}
            </button>
            <button
              onClick={handleEscalate}
              disabled={escalating}
              style={{
                padding: '10px 24px',
                backgroundColor: '#ffffff',
                color: '#dc2626',
                border: '1px solid #dc2626',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: escalating ? 0.7 : 1,
              }}
            >
              {escalating ? 'Escalating...' : '🚨 Escalate to Admin'}
            </button>
          </div>
        </div>
      )}

      {/* Info box */}
      {!isReadOnly && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 18px', display: 'flex', gap: '10px' }}>
          <span>ℹ️</span>
          <p style={{ fontSize: '13px', color: '#166534', margin: 0 }}>
            Once signed off, all submission data is permanently locked. This cannot be undone. The cycle moves to History.
          </p>
        </div>
      )}
    </div>
  );
}
