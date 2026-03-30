import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

interface ProductCategoryData {
  sellable: number;
  unassembled: number;
  defective: number;
  total: number;
}

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

  // Find the two key submissions
  const closingStockSub = submissions?.find((s) => s.submission_type === 'closing_stock_furkan');
  const physicalCountSub = submissions?.find((s) => s.submission_type === 'physical_count_arjun');

  // Build lookup maps: product name → {sellable, unassembled, defective, total}
  type ProductMap = Map<string, ProductCategoryData>;

  function buildProductMap(sub: { data?: unknown } | undefined): ProductMap {
    const map: ProductMap = new Map();
    if (!sub?.data) return map;

    const data = sub.data as { products?: Array<{ product: string; sellable?: number; unassembled?: number; defective?: number; total?: number }> };

    if (Array.isArray(data.products)) {
      // New format: { products: [{ product, sellable, unassembled, defective, total }] }
      for (const item of data.products) {
        map.set(item.product, {
          sellable: item.sellable ?? 0,
          unassembled: item.unassembled ?? 0,
          defective: item.defective ?? 0,
          total: item.total ?? ((item.sellable ?? 0) + (item.unassembled ?? 0) + (item.defective ?? 0)),
        });
      }
    }
    return map;
  }

  const closingMap = buildProductMap(closingStockSub as { data?: unknown } | undefined);
  const countMap = buildProductMap(physicalCountSub as { data?: unknown } | undefined);

  // Build per-product rows with per-category breakdown
  const productRows = (products || []).map((p) => {
    const closing = closingMap.has(p.name) ? closingMap.get(p.name)! : null;
    const count = countMap.has(p.name) ? countMap.get(p.name)! : null;

    const gap: ProductCategoryData | null =
      closing !== null && count !== null
        ? {
            sellable: count.sellable - closing.sellable,
            unassembled: count.unassembled - closing.unassembled,
            defective: count.defective - closing.defective,
            total: count.total - closing.total,
          }
        : null;

    return {
      product_id: p.id,
      product_name: p.name,
      sku: p.sku,
      closing,
      count,
      gap,
    };
  });

  // Compute overall totals (for summary cards)
  const totalsClosing = productRows.reduce(
    (acc, r) => ({
      sellable: acc.sellable + (r.closing?.sellable ?? 0),
      unassembled: acc.unassembled + (r.closing?.unassembled ?? 0),
      defective: acc.defective + (r.closing?.defective ?? 0),
      total: acc.total + (r.closing?.total ?? 0),
    }),
    { sellable: 0, unassembled: 0, defective: 0, total: 0 }
  );

  const totalsCount = productRows.reduce(
    (acc, r) => ({
      sellable: acc.sellable + (r.count?.sellable ?? 0),
      unassembled: acc.unassembled + (r.count?.unassembled ?? 0),
      defective: acc.defective + (r.count?.defective ?? 0),
      total: acc.total + (r.count?.total ?? 0),
    }),
    { sellable: 0, unassembled: 0, defective: 0, total: 0 }
  );

  const totalsGap = {
    sellable: totalsCount.sellable - totalsClosing.sellable,
    unassembled: totalsCount.unassembled - totalsClosing.unassembled,
    defective: totalsCount.defective - totalsClosing.defective,
    total: totalsCount.total - totalsClosing.total,
  };

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
    totals_closing: totalsClosing,
    totals_count: totalsCount,
    totals_gap: totalsGap,
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
