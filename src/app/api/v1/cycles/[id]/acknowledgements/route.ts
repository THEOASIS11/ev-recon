import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/v1/cycles/[id]/acknowledgements — all acks for a cycle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthWithRole(request, ['reconciler', 'supervisor', 'admin']);
  if (auth instanceof NextResponse) return auth;

  const { id: cycleId } = await params;

  const { data, error } = await supabaseAdmin
    .from('acknowledgements')
    .select('id, user_id, ack_type, acknowledged_at, users(name, role)')
    .eq('cycle_id', cycleId)
    .order('acknowledged_at', { ascending: false });

  if (error) {
    console.error('cycles/[id]/acknowledgements error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ acknowledgements: data || [] });
}
