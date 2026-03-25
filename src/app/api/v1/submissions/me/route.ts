import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/v1/submissions/me?cycle_id=...
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const cycle_id = searchParams.get('cycle_id');

  let query = supabaseAdmin
    .from('submissions')
    .select('*')
    .eq('user_id', auth.userId)
    .order('submitted_at', { ascending: false });

  if (cycle_id) query = query.eq('cycle_id', cycle_id);

  const { data, error } = await query;

  if (error) {
    console.error('submissions/me error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ submissions: data || [] });
}
