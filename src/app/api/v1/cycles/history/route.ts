import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/v1/cycles/history — all cycles ordered by most recent
export async function GET(request: NextRequest) {
  const auth = requireAuthWithRole(request, ['reconciler', 'supervisor', 'admin']);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await supabaseAdmin
    .from('cycles')
    .select('id, cycle_month, status, created_at, signed_off_at, signed_off_by')
    .order('cycle_month', { ascending: false })
    .limit(24);

  if (error) {
    console.error('cycles/history error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ cycles: data || [] });
}
