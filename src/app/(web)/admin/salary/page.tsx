'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Cycle {
  id: string;
  cycle_month: string;
  status: string;
}

interface SalaryRow {
  user_id: string;
  name: string;
  role: string;
  ack_20th: boolean;
  ack_25th: boolean;
  has_submission: boolean;
  submission_types: string[];
  clearance_status: string;
  clearance_note: string | null;
  cleared_at: string | null;
  tasks_completed: number;
}

function rolePill(role: string) {
  const colors: Record<string, { bg: string; color: string }> = {
    factory_staff: { bg: '#f3f4f6', color: '#374151' },
    supervisor: { bg: '#dcfce7', color: '#16a34a' },
    reconciler: { bg: '#dbeafe', color: '#1d4ed8' },
    admin: { bg: '#ede9fe', color: '#7c3aed' },
  };
  const c = colors[role] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ backgroundColor: c.bg, color: c.color, fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '99px' }}>
      {role.replace('_', ' ')}
    </span>
  );
}

function clearancePill(status: string) {
  if (status === 'cleared') {
    return <span style={{ backgroundColor: '#dcfce7', color: '#16a34a', fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '99px' }}>Cleared</span>;
  }
  if (status === 'hold') {
    return <span style={{ backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '99px' }}>Hold</span>;
  }
  return <span style={{ backgroundColor: '#f3f4f6', color: '#6b7280', fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '99px' }}>Pending</span>;
}

function check(val: boolean) {
  return <span style={{ color: val ? '#16a34a' : '#d1d5db', fontSize: '16px' }}>{val ? '✓' : '○'}</span>;
}

export default function SalaryReportPage() {
  const router = useRouter();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [cycleName, setCycleName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [exporting, setExporting] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Guard: admin only
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
  }, [router]);

  // Fetch cycles list
  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/v1/cycles/history', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          const list: Cycle[] = data.cycles || [];
          setCycles(list);
          if (list.length > 0) {
            setSelectedCycleId(list[0].id);
          }
        }
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const fetchReport = useCallback(async (cycleId: string) => {
    if (!token || !cycleId) return;
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/v1/admin/salary-report/${cycleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows || []);
        setCycleName(
          data.cycle
            ? new Date(data.cycle.cycle_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
            : ''
        );
      }
    } catch { /* silent */ } finally {
      setLoadingReport(false);
    }
  }, [token]);

  useEffect(() => {
    if (selectedCycleId) fetchReport(selectedCycleId);
  }, [selectedCycleId, fetchReport]);

  async function exportReport() {
    if (!rows.length) return;
    setExporting(true);
    try {
      // Build CSV manually
      const headers = ['Name', 'Role', '20th Ack', '25th Ack', 'Submission', 'Clearance', 'Reason'];
      const csvRows = rows.map((r) => [
        r.name,
        r.role,
        r.ack_20th ? 'Yes' : 'No',
        r.ack_25th ? 'Yes' : 'No',
        r.has_submission ? 'Yes' : 'No',
        r.clearance_status,
        r.clearance_note || '',
      ]);
      const csv = [headers, ...csvRows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Salary-Report-${cycleName.replace(/\s+/g, '-')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
        <p style={{ color: '#9ca3af' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>Salary Report</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Per-person clearance status with reasons</p>
        </div>
        <button
          onClick={exportReport}
          disabled={exporting || rows.length === 0}
          style={{
            padding: '8px 18px',
            backgroundColor: '#111827',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            opacity: rows.length === 0 ? 0.5 : 1,
          }}
        >
          {exporting ? 'Exporting...' : '⬇ Export Report'}
        </button>
      </div>

      {/* Admin-only notice */}
      <div style={{ backgroundColor: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '8px' }}>
        <span>🔒</span>
        <p style={{ fontSize: '13px', color: '#5b21b6', margin: 0, fontWeight: '500' }}>
          This screen is only visible to Admin (Asis). No other user can see salary Hold/Release status with reasons.
        </p>
      </div>

      {/* Cycle selector */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px 20px', marginBottom: '20px' }}>
        <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>Select Cycle</label>
        <select
          value={selectedCycleId}
          onChange={(e) => setSelectedCycleId(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', color: '#111827', outline: 'none', minWidth: '200px', backgroundColor: '#fff' }}
        >
          {cycles.length === 0 && <option value="">No cycles found</option>}
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {new Date(c.cycle_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} — {c.status}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loadingReport ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading report...</div>
      ) : rows.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af' }}>No data found for this cycle.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>
              {cycleName} — Per-Person Clearance
            </h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Person</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Role</th>
                <th style={{ padding: '10px 20px', textAlign: 'center', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>20th Ack</th>
                <th style={{ padding: '10px 20px', textAlign: 'center', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>25th Ack</th>
                <th style={{ padding: '10px 20px', textAlign: 'center', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>29th Submit</th>
                <th style={{ padding: '10px 20px', textAlign: 'center', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Clearance</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 20px', fontWeight: '600', color: '#111827' }}>{row.name}</td>
                  <td style={{ padding: '14px 20px' }}>{rolePill(row.role)}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>{check(row.ack_20th)}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>{check(row.ack_25th)}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>{check(row.has_submission)}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>{clearancePill(row.clearance_status)}</td>
                  <td style={{ padding: '14px 20px', color: '#6b7280', fontSize: '13px' }}>
                    {row.role === 'reconciler'
                      ? <em style={{ color: '#9ca3af' }}>Process tasks only — not held for data mismatches</em>
                      : row.clearance_note || <span style={{ color: '#d1d5db' }}>—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
