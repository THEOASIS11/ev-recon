'use client';

import { useEffect, useState, useCallback } from 'react';

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
  cycle: { id: string; cycle_month: string; status: string; returns_in_transit: { amazon: number; flipkart: number } };
  product_rows: ProductRow[];
  totals_closing: CategoryData;
  totals_count: CategoryData;
  totals_gap: CategoryData;
  returns_in_transit: { amazon: number; flipkart: number };
  total_returns: number;
  submissions_summary: {
    closing_stock_done: boolean;
    physical_count_done: boolean;
    defects_done: boolean;
  };
}

const CATEGORIES: Array<{ key: keyof CategoryData; label: string }> = [
  { key: 'sellable', label: 'Sellable' },
  { key: 'unassembled', label: 'Unassembled' },
  { key: 'defective', label: 'Defective' },
  { key: 'total', label: 'Total' },
];

function GapBadge({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: '#d1d5db', fontSize: '13px' }}>—</span>;
  const isNeg = value < 0;
  const isZero = value === 0;
  return (
    <span style={{
      fontSize: '13px',
      fontWeight: '600',
      color: isNeg ? '#dc2626' : isZero ? '#6b7280' : '#16a34a',
      backgroundColor: isNeg ? '#fef2f2' : isZero ? '#f9fafb' : '#f0fdf4',
      border: `1px solid ${isNeg ? '#fecaca' : isZero ? '#e5e7eb' : '#bbf7d0'}`,
      borderRadius: '6px',
      padding: '2px 8px',
      display: 'inline-block',
    }}>
      {value >= 0 ? '+' : ''}{value}
    </span>
  );
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
  const { totals_gap, total_returns } = report;
  const netLeakage = totals_gap.total - total_returns;

  const cell: React.CSSProperties = {
    padding: '9px 14px',
    fontSize: '13px',
    color: '#374151',
    textAlign: 'right',
    borderBottom: '1px solid #f3f4f6',
    whiteSpace: 'nowrap',
  };
  const headCell: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  };

  return (
    <div>
      {/* ── Header ── */}
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

      {/* ── Incomplete data warning ── */}
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

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px 20px' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px', fontWeight: '600' }}>Total Gap</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: totals_gap.total < 0 ? '#dc2626' : '#111827', margin: '0 0 4px' }}>
            {totals_gap.total >= 0 ? '+' : ''}{totals_gap.total}
          </p>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
            S: {totals_gap.sellable >= 0 ? '+' : ''}{totals_gap.sellable} · U: {totals_gap.unassembled >= 0 ? '+' : ''}{totals_gap.unassembled} · D: {totals_gap.defective >= 0 ? '+' : ''}{totals_gap.defective}
          </p>
        </div>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px 20px' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px', fontWeight: '600' }}>Returns in Transit</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>{total_returns}</p>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>Amazon: {report.returns_in_transit.amazon} · Flipkart: {report.returns_in_transit.flipkart}</p>
        </div>
        <div style={{ backgroundColor: netLeakage < -2 ? '#fef2f2' : '#f0fdf4', borderRadius: '12px', border: `1px solid ${netLeakage < -2 ? '#fecaca' : '#bbf7d0'}`, padding: '16px 20px' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px', fontWeight: '600' }}>Net Leakage</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: netLeakage < -2 ? '#dc2626' : '#16a34a', margin: '0 0 4px' }}>
            {netLeakage >= 0 ? '+' : ''}{netLeakage}
          </p>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>Gap minus Returns</p>
        </div>
      </div>

      {/* ── Per-product table ── */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>Per-Product Comparison</h2>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Tranzact = Furkan closing · Physical = Arjun count</p>
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
              {report.product_rows.map((row) => (
                CATEGORIES.map((cat, catIdx) => {
                  const isTotal = cat.key === 'total';
                  const closingVal = row.closing ? row.closing[cat.key] : null;
                  const countVal = row.count ? row.count[cat.key] : null;
                  const gapVal = row.gap ? row.gap[cat.key] : null;
                  const isFirstCat = catIdx === 0;
                  const isLastCat = catIdx === CATEGORIES.length - 1;

                  return (
                    <tr
                      key={`${row.product_id}-${cat.key}`}
                      style={{
                        borderTop: isFirstCat ? '1px solid #e5e7eb' : '1px solid #f9fafb',
                        backgroundColor: isTotal ? '#f9fafb' : 'transparent',
                      }}
                    >
                      {/* Product name — only on first category row, spans 4 rows */}
                      {isFirstCat && (
                        <td
                          rowSpan={4}
                          style={{
                            padding: '13px 14px',
                            verticalAlign: 'top',
                            borderRight: '1px solid #f3f4f6',
                            position: 'sticky',
                            left: 0,
                            backgroundColor: '#ffffff',
                            zIndex: 1,
                          }}
                        >
                          <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0, whiteSpace: 'nowrap' }}>{row.product_name}</p>
                        </td>
                      )}

                      {/* Category label */}
                      <td style={{
                        ...cell,
                        textAlign: 'left',
                        color: isTotal ? '#111827' : '#6b7280',
                        fontWeight: isTotal ? '700' : '400',
                        fontSize: isTotal ? '13px' : '12px',
                        borderBottom: isLastCat ? '1px solid #e5e7eb' : '1px solid #f9fafb',
                        paddingLeft: '14px',
                      }}>
                        {isTotal ? 'Total' : cat.label}
                      </td>

                      {/* Tranzact (Furkan closing) */}
                      <td style={{
                        ...cell,
                        fontWeight: isTotal ? '700' : '400',
                        color: isTotal ? '#111827' : '#374151',
                        borderBottom: isLastCat ? '1px solid #e5e7eb' : '1px solid #f9fafb',
                      }}>
                        {closingVal !== null ? closingVal : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>

                      {/* Physical (Arjun count) */}
                      <td style={{
                        ...cell,
                        fontWeight: isTotal ? '700' : '400',
                        color: isTotal ? '#111827' : '#374151',
                        borderBottom: isLastCat ? '1px solid #e5e7eb' : '1px solid #f9fafb',
                      }}>
                        {countVal !== null ? countVal : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>

                      {/* Gap */}
                      <td style={{
                        ...cell,
                        borderBottom: isLastCat ? '1px solid #e5e7eb' : '1px solid #f9fafb',
                      }}>
                        <GapBadge value={gapVal} />
                      </td>
                    </tr>
                  );
                })
              ))}
            </tbody>

            {/* Grand totals footer */}
            <tfoot>
              {CATEGORIES.map((cat, catIdx) => {
                const isTotal = cat.key === 'total';
                const closingVal = report.totals_closing[cat.key];
                const countVal = report.totals_count[cat.key];
                const gapVal = report.totals_gap[cat.key];
                const isFirstCat = catIdx === 0;

                return (
                  <tr
                    key={`footer-${cat.key}`}
                    style={{
                      borderTop: isFirstCat ? '2px solid #e5e7eb' : '1px solid #f3f4f6',
                      backgroundColor: isTotal ? '#f0f4ff' : '#f9fafb',
                    }}
                  >
                    {isFirstCat && (
                      <td
                        rowSpan={4}
                        style={{
                          padding: '12px 14px',
                          verticalAlign: 'top',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#111827',
                          borderRight: '1px solid #e5e7eb',
                          position: 'sticky',
                          left: 0,
                          backgroundColor: '#f9fafb',
                          zIndex: 1,
                        }}
                      >
                        All Products
                      </td>
                    )}
                    <td style={{ padding: '9px 14px', fontSize: isTotal ? '13px' : '12px', fontWeight: isTotal ? '700' : '500', color: isTotal ? '#111827' : '#6b7280', textAlign: 'left' }}>
                      {isTotal ? 'Total' : cat.label}
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: '13px', fontWeight: isTotal ? '700' : '500', color: '#111827', textAlign: 'right' }}>
                      {closingVal}
                    </td>
                    <td style={{ padding: '9px 14px', fontSize: '13px', fontWeight: isTotal ? '700' : '500', color: '#111827', textAlign: 'right' }}>
                      {countVal}
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'right' }}>
                      <GapBadge value={gapVal} />
                    </td>
                  </tr>
                );
              })}

              {/* Returns in transit row */}
              <tr style={{ borderTop: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '700', color: '#111827', position: 'sticky', left: 0, backgroundColor: '#f9fafb', zIndex: 1 }}>Returns in Transit</td>
                <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6b7280' }} colSpan={2}>
                  Amazon {report.returns_in_transit.amazon} + Flipkart {report.returns_in_transit.flipkart}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right' }} colSpan={2}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '2px 8px' }}>
                    +{total_returns}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
