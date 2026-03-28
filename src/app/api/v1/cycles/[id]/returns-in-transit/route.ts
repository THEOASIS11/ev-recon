import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/v1/cycles/[id]/returns-in-transit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthWithRole(request, ['reconciler', 'supervisor', 'admin']);
  if (auth instanceof NextResponse) return auth;

  const { id: cycleId } = await params;

  const { data, error } = await supabaseAdmin
    .from('cycles')
    .select('returns_in_transit')
    .eq('id', cycleId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });

  return NextResponse.json({
    returns_in_transit: data.returns_in_transit || { amazon: 0, flipkart: 0 },
  });
}

// PATCH /api/v1/cycles/[id]/returns-in-transit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthWithRole(request, ['reconciler', 'admin']);
  if (auth instanceof NextResponse) return auth;

  const { id: cycleId } = await params;

  let body: { amazon?: number; flipkart?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { amazon, flipkart } = body;
  if (amazon === undefined && flipkart === undefined) {
    return NextResponse.json({ error: 'Provide amazon and/or flipkart value' }, { status: 400 });
  }

  // Get current value first
  const { data: existing } = await supabaseAdmin
    .from('cycles')
    .select('returns_in_transit')
    .eq('id', cycleId)
    .maybeSingle();

  const current = existing?.returns_in_transit || { amazon: 0, flipkart: 0 };
  const updated = {
    amazon: amazon !== undefined ? Number(amazon) : current.amazon,
    flipkart: flipkart !== undefined ? Number(flipkart) : current.flipkart,
  };

  const { error } = await supabaseAdmin
    .from('cycles')
    .update({ returns_in_transit: updated })
    .eq('id', cycleId);

  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 });

  return NextResponse.json({ returns_in_transit: updated });
}
