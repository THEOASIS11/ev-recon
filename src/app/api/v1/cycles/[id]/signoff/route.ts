import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// PATCH /api/v1/cycles/[id]/signoff — supervisor only, permanent lock
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthWithRole(request, ['supervisor']);
  if (auth instanceof NextResponse) return auth;

  const { id: cycleId } = await params;

  // Fetch cycle
  const { data: cycle, error: cycleErr } = await supabaseAdmin
    .from('cycles')
    .select('id, status, cycle_month')
    .eq('id', cycleId)
    .maybeSingle();

  if (cycleErr || !cycle) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  if (cycle.status === 'signed_off') {
    return NextResponse.json({ error: 'Cycle is already signed off.' }, { status: 403 });
  }

  // Lock all submissions for this cycle
  const { error: lockErr } = await supabaseAdmin
    .from('submissions')
    .update({ is_locked: true })
    .eq('cycle_id', cycleId);

  if (lockErr) {
    return NextResponse.json({ error: 'Failed to lock submissions.' }, { status: 500 });
  }

  // Update cycle status
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('cycles')
    .update({
      status: 'signed_off',
      signed_off_at: new Date().toISOString(),
      signed_off_by: auth.userId,
    })
    .eq('id', cycleId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to sign off cycle.' }, { status: 500 });
  }

  return NextResponse.json({ cycle: updated });
}
