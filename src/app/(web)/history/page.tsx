'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Cycle {
  id: string;
  cycle_month: string;
  status: string;
  created_at: string;
  signed_off_at?: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch('/api/v1/cycles/history', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setCycles(json.cycles || []);
        }
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  function statusColor(status: string) {
    if (status === 'active') return { bg: '#dcfce7', text: '#16a34a' };
    if (status === 'signed_off') return { bg: '#dbeafe', text: '#2563eb' };
    if (status === 'escalated') return { bg: '#fef2f2', text: '#dc2626' };
    return { bg: '#f3f4f6', text: '#6b7280' };
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
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>Cycle History</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>All reconciliation cycles</p>
      </div>

      {cycles.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: '15px' }}>No cycles found.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Cycle Month</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600', width: '120px' }}>Status</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Created</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Signed Off</th>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600', width: '100px' }}>Report</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((cycle) => {
                const colors = statusColor(cycle.status);
                return (
                  <tr key={cycle.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>
                        {new Date(cycle.cycle_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                      </p>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        fontSize: '12px',
                        padding: '3px 8px',
                        borderRadius: '99px',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                      }}>
                        {cycle.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#6b7280' }}>
                      {new Date(cycle.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#6b7280' }}>
                      {cycle.signed_off_at
                        ? new Date(cycle.signed_off_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <button
                        onClick={() => router.push(`/report?cycle_id=${cycle.id}`)}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
