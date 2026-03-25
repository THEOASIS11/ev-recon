import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/v1/cycles — returns the current active cycle
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await supabaseAdmin
    .from('cycles')
    .select('id, cycle_month, status, created_at')
    .eq('status', 'active')
    .order('cycle_month', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // No active cycle found
    return NextResponse.json({ cycle: null });
  }

  // Calculate days until cutoff (28th of cycle month)
  const cycleMonth = new Date(data.cycle_month);
  const cutoff = new Date(cycleMonth.getFullYear(), cycleMonth.getMonth(), 28);
  const today = new Date();
  const daysUntilCutoff = Math.ceil((cutoff.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return NextResponse.json({
    cycle: {
      ...data,
      days_until_cutoff: Math.max(0, daysUntilCutoff),
    },
  });
}

// POST /api/v1/cycles — admin only, create new cycle
export async function POST(request: NextRequest) {
  const auth = requireAuthWithRole(request, ['admin']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { cycle_month } = body;

    if (!cycle_month) {
      return NextResponse.json({ error: 'cycle_month is required (YYYY-MM-DD).' }, { status: 400 });
    }

    // Ensure no active cycle exists
    const { data: existing } = await supabaseAdmin
      .from('cycles')
      .select('id')
      .eq('status', 'active')
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'An active cycle already exists. Sign off the current cycle before creating a new one.' },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('cycles')
      .insert({ cycle_month, status: 'active' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ cycle: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
