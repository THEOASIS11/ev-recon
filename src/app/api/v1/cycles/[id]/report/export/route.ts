import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import * as XLSX from 'xlsx';

// GET /api/v1/cycles/[id]/report/export — download Excel report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthWithRole(request, ['reconciler', 'supervisor', 'admin']);
  if (auth instanceof NextResponse) return auth;

  const { id: cycleId } = await params;

  // Fetch cycle
  const { data: cycle } = await supabaseAdmin
    .from('cycles')
    .select('*')
    .eq('id', cycleId)
    .maybeSingle();

  if (!cycle) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });

  // Fetch submissions
  const { data: submissions } = await supabaseAdmin
    .from('submissions')
    .select('user_id, submission_type, payload, submitted_at, users(name)')
    .eq('cycle_id', cycleId);

  // Fetch products
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, sku')
    .order('name');

  const closingPayload: Record<string, number> =
    submissions?.find((s) => s.submission_type === 'closing_stock_furkan')?.payload || {};
  const countPayload: Record<string, number> =
    submissions?.find((s) => s.submission_type === 'physical_count_arjun')?.payload || {};

  const cycleLabel = new Date(cycle.cycle_month).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  // Build workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Leakage Report
  const reportData = (products || []).map((p) => {
    const closing = closingPayload[p.id] ?? '';
    const count = countPayload[p.id] ?? '';
    const diff =
      closing !== '' && count !== '' ? (count as number) - (closing as number) : '';
    return {
      'Product': p.name,
      'SKU': p.sku || '',
      'Furkan Closing Stock': closing,
      'Arjun Physical Count': count,
      'Difference (Count - Closing)': diff,
    };
  });

  const returnsInTransit = cycle.returns_in_transit || { amazon: 0, flipkart: 0 };
  reportData.push({} as Record<string, unknown>);
  reportData.push({
    'Product': 'Returns in Transit — Amazon',
    'SKU': '',
    'Furkan Closing Stock': '',
    'Arjun Physical Count': '',
    'Difference (Count - Closing)': returnsInTransit.amazon || 0,
  });
  reportData.push({
    'Product': 'Returns in Transit — Flipkart',
    'SKU': '',
    'Furkan Closing Stock': '',
    'Arjun Physical Count': '',
    'Difference (Count - Closing)': returnsInTransit.flipkart || 0,
  });

  const ws1 = XLSX.utils.json_to_sheet(reportData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Leakage Report');

  // Sheet 2: Submission Status
  const statusData = [
    { 'Name': 'Gopalji', 'Task': 'Readiness', 'Status': submissions?.find(s => s.submission_type === 'readiness_gopalji') ? 'Done' : 'Pending', 'Submitted At': submissions?.find(s => s.submission_type === 'readiness_gopalji')?.submitted_at || '' },
    { 'Name': 'Altab', 'Task': 'Readiness', 'Status': submissions?.find(s => s.submission_type === 'readiness_altab') ? 'Done' : 'Pending', 'Submitted At': submissions?.find(s => s.submission_type === 'readiness_altab')?.submitted_at || '' },
    { 'Name': 'Kashif', 'Task': 'Readiness', 'Status': submissions?.find(s => s.submission_type === 'readiness_kashif') ? 'Done' : 'Pending', 'Submitted At': submissions?.find(s => s.submission_type === 'readiness_kashif')?.submitted_at || '' },
    { 'Name': 'Kashif', 'Task': 'Defects', 'Status': submissions?.find(s => s.submission_type === 'defects_kashif') ? 'Done' : 'Pending', 'Submitted At': submissions?.find(s => s.submission_type === 'defects_kashif')?.submitted_at || '' },
    { 'Name': 'Furkan', 'Task': 'Readiness', 'Status': submissions?.find(s => s.submission_type === 'readiness_furkan') ? 'Done' : 'Pending', 'Submitted At': submissions?.find(s => s.submission_type === 'readiness_furkan')?.submitted_at || '' },
    { 'Name': 'Furkan', 'Task': 'Closing Stock', 'Status': submissions?.find(s => s.submission_type === 'closing_stock_furkan') ? 'Done' : 'Pending', 'Submitted At': submissions?.find(s => s.submission_type === 'closing_stock_furkan')?.submitted_at || '' },
    { 'Name': 'Arjun', 'Task': 'Physical Count', 'Status': submissions?.find(s => s.submission_type === 'physical_count_arjun') ? 'Done' : 'Pending', 'Submitted At': submissions?.find(s => s.submission_type === 'physical_count_arjun')?.submitted_at || '' },
  ];

  const ws2 = XLSX.utils.json_to_sheet(statusData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Submission Status');

  // Generate buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const filename = `EV-Recon-${cycleLabel.replace(' ', '-')}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
