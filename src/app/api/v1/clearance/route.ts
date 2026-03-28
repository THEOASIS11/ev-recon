import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/v1/clearance?cycle_id=...
export async function GET(request: NextRequest) {
  const auth = requireAuthWithRole(request, ['reconciler', 'supervisor', 'admin']);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycle_id');

  if (!cycleId) {
    return NextResponse.json({ error: 'cycle_id is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('clearances')
    .select('id, cycle_id, user_id, status, cleared_by, cleared_at, note, created_at, users!clearances_user_id_fkey(name, role)')
    .eq('cycle_id', cycleId);

  if (error) {
    console.error('clearance GET error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ clearances: data || [] });
}

// POST /api/v1/clearance — upsert clearance for a user/cycle
export async function POST(request: NextRequest) {
  const auth = requireAuthWithRole(request, ['reconciler', 'admin']);
  if (auth instanceof NextResponse) return auth;

  let body: { cycle_id: string; user_id: string; status: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { cycle_id, user_id, status, note } = body;
  if (!cycle_id || !user_id || !status) {
    return NextResponse.json({ error: 'cycle_id, user_id, and status are required' }, { status: 400 });
  }

  if (!['cleared', 'hold', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'status must be cleared, hold, or pending' }, { status: 400 });
  }

  const upsertData: Record<string, unknown> = {
    cycle_id,
    user_id,
    status,
    note: note || null,
  };

  if (status === 'cleared') {
    upsertData.cleared_by = auth.userId;
    upsertData.cleared_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('clearances')
    .upsert(upsertData, { onConflict: 'cycle_id,user_id' })
    .select()
    .single();

  if (error) {
    console.error('clearance POST error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ clearance: data });
}
