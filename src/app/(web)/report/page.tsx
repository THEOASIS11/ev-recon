'use client';

import { useEffect, useState, useCallback } from 'react';

interface ProductRow {
  product_id: string;
  product_name: string;
  sku: string;
  closing_stock: number | null;
  physical_count: number | null;
  difference: number | null;
}

interface ReportData {
  cycle: { id: string; cycle_month: string; status: string; returns_in_transit: { amazon: number; flipkart: number } };
  product_rows: ProductRow[];
  returns_in_transit: { amazon: number; flipkart: number };
  total_returns: number;
  submissions_summary: {
    closing_stock_done: boolean;
    physical_count_done: boolean;
    defects_done: boolean;
  };
}

export default function ReportPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchReport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Get active cycle first
      const cycleRes = await fetch('/api/v1/cycles/active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!cycleRes.ok) return;
      const cycleJson = await cycleRes.json();
      if (!cycleJson.cycle) { setLoading(false); return; }
      const id = cycleJson.cycle.id;
      setCycleId(id);

      const reportRes = await fetch(`/api/v1/cycles/${id}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (reportRes.ok) {
        const data = await reportRes.json();
        setReport(data);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  async function exportExcel() {
    if (!cycleId || !token) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/v1/cycles/${cycleId}/report/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EV-Recon-Report.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
        <p style={{ color: '#9ca3af' }}>Loading report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 24px' }}>Leakage Report</h1>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: '15px' }}>No active cycle found.</p>
        </div>
      </div>
    );
  }

  const cycleLabel = new Date(report.cycle.cycle_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const totalDiff = report.product_rows.reduce((sum, r) => sum + (r.difference ?? 0), 0);
  const totalReturns = (report.returns_in_transit.amazon || 0) + (report.returns_in_transit.flipkart || 0);
  const netLeakage = totalDiff - totalReturns;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>Leakage Report</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{cycleLabel}</p>
        </div>
        <button
          onClick={exportExcel}
          disabled={exporting || !report.submissions_summary.closing_stock_done || !report.submissions_summary.physical_count_done}
          style={{
            padding: '8px 18px',
            backgroundColor: '#111827',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            opacity: exporting ? 0.7 : 1,
          }}
        >
          {exporting ? 'Exporting...' : '⬇ Export Excel'}
        </button>
      </div>

      {/* Data availability warning */}
      {(!report.submissions_summary.closing_stock_done || !report.submissions_summary.physical_count_done) && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '8px' }}>
          <span>⚠️</span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', margin: '0 0 4px' }}>Incomplete data</p>
            <p style={{ fontSize: '12px', color: '#92400e', margin: 0 }}>
              {!report.submissions_summary.closing_stock_done && 'Furkan has not submitted closing stock. '}
              {!report.submissions_summary.physical_count_done && 'Arjun has not submitted physical count. '}
              Report may show partial data.
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px 20px' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px', fontWeight: '600' }}>Total Difference</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: totalDiff < 0 ? '#dc2626' : '#111827', margin: 0 }}>
            {totalDiff >= 0 ? '+' : ''}{totalDiff}
          </p>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>Count minus Closing</p>
        </div>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px 20px' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px', fontWeight: '600' }}>Returns in Transit</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>{totalReturns}</p>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>Amazon: {report.returns_in_transit.amazon} · Flipkart: {report.returns_in_transit.flipkart}</p>
        </div>
        <div style={{ backgroundColor: netLeakage < -2 ? '#fef2f2' : '#f0fdf4', borderRadius: '12px', border: `1px solid ${netLeakage < -2 ? '#fecaca' : '#bbf7d0'}`, padding: '16px 20px' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px', fontWeight: '600' }}>Net Leakage</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: netLeakage < -2 ? '#dc2626' : '#16a34a', margin: 0 }}>
            {netLeakage >= 0 ? '+' : ''}{netLeakage}
          </p>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0' }}>Difference minus Returns</p>
        </div>
      </div>

      {/* Product table */}
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
                        fontSize: '14px',
                        fontWeight: '600',
                        color: isNeg ? '#dc2626' : diff === 0 ? '#6b7280' : '#16a34a',
                        backgroundColor: isNeg ? '#fef2f2' : diff === 0 ? '#f9fafb' : '#f0fdf4',
                        border: `1px solid ${isNeg ? '#fecaca' : diff === 0 ? '#e5e7eb' : '#bbf7d0'}`,
                        borderRadius: '6px',
                        padding: '2px 8px',
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
                Amazon {report.returns_in_transit.amazon} + Flipkart {report.returns_in_transit.flipkart}
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
    </div>
  );
}
