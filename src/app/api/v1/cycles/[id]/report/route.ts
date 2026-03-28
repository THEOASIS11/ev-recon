import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/v1/cycles/[id]/report — full reconciliation report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthWithRole(request, ['reconciler', 'supervisor', 'admin']);
  if (auth instanceof NextResponse) return auth;

  const { id: cycleId } = await params;

  // Fetch cycle info
  const { data: cycle, error: cycleErr } = await supabaseAdmin
    .from('cycles')
    .select('*')
    .eq('id', cycleId)
    .maybeSingle();

  if (cycleErr || !cycle) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  // Fetch all submissions for this cycle
  const { data: submissions, error: subErr } = await supabaseAdmin
    .from('submissions')
    .select('user_id, submission_type, data, submitted_at, users(name)')
    .eq('cycle_id', cycleId);

  if (subErr) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // Fetch products
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, sku')
    .order('name');

  // Build per-product comparison
  const closingStockSub = submissions?.find((s) => s.submission_type === 'closing_stock_furkan');
  const physicalCountSub = submissions?.find((s) => s.submission_type === 'physical_count_arjun');

  const closingPayload: Record<string, number> = (closingStockSub as { data?: Record<string, number> } | undefined)?.data || {};
  const countPayload: Record<string, number> = (physicalCountSub as { data?: Record<string, number> } | undefined)?.data || {};

  const productRows = (products || []).map((p) => {
    const closing = closingPayload[p.id] ?? null;
    const count = countPayload[p.id] ?? null;
    const diff = closing !== null && count !== null ? count - closing : null;
    return {
      product_id: p.id,
      product_name: p.name,
      sku: p.sku,
      closing_stock: closing,
      physical_count: count,
      difference: diff,
    };
  });

  // Returns in transit
  const returnsInTransit = cycle.returns_in_transit || { amazon: 0, flipkart: 0 };
  const totalReturns = (returnsInTransit.amazon || 0) + (returnsInTransit.flipkart || 0);

  // Readiness submissions
  const readinessTypes = ['readiness_gopalji', 'readiness_altab', 'readiness_kashif', 'readiness_furkan'];
  const readiness = readinessTypes.map((type) => {
    const sub = submissions?.find((s) => s.submission_type === type);
    return {
      type,
      submitted: !!sub,
      submitted_at: sub?.submitted_at || null,
    };
  });

  return NextResponse.json({
    cycle,
    product_rows: productRows,
    returns_in_transit: returnsInTransit,
    total_returns: totalReturns,
    readiness,
    submissions_summary: {
      closing_stock_done: !!closingStockSub,
      physical_count_done: !!physicalCountSub,
      defects_done: !!submissions?.find((s) => s.submission_type === 'defects_kashif'),
    },
  });
}
