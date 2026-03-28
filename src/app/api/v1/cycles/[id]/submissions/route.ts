import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/v1/cycles/[id]/submissions — all submissions for a cycle (reconciler/supervisor/admin)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthWithRole(request, ['reconciler', 'supervisor', 'admin']);
  if (auth instanceof NextResponse) return auth;

  const { id: cycleId } = await params;

  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('id, user_id, submission_type, submitted_at, data, is_locked, users(name, role)')
    .eq('cycle_id', cycleId)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('cycles/[id]/submissions error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ submissions: data || [] });
}
