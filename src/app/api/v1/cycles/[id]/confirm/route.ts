import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// PATCH /api/v1/cycles/[id]/confirm
// Step 2 of two-tier sign-off: Asis (admin) confirms and closes the cycle.
// Requires signed_off_at to already be set (Arjun must sign first).
// Sets confirmed_at, confirmed_by, confirmation_notes; changes status to signed_off.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthWithRole(request, ['admin']);
  if (auth instanceof NextResponse) return auth;

  const { id: cycleId } = await params;

  // Fetch cycle
  const { data: cycle, error: cycleErr } = await supabaseAdmin
    .from('cycles')
    .select('id, status, signed_off_at')
    .eq('id', cycleId)
    .maybeSingle();

  if (cycleErr || !cycle) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  if (cycle.status === 'signed_off') {
    return NextResponse.json({ error: 'Cycle already confirmed and closed.' }, { status: 409 });
  }

  if (!cycle.signed_off_at) {
    return NextResponse.json(
      { error: 'Arjun ka sign-off pehle chahiye. Supervisor ne abhi sign-off nahi kiya.' },
      { status: 403 }
    );
  }

  // Parse body for confirmation_notes
  let confirmationNotes = '';
  try {
    const body = await request.json();
    confirmationNotes = body.confirmation_notes || '';
  } catch {
    // notes optional
  }

  // Lock all submissions for this cycle
  await supabaseAdmin
    .from('submissions')
    .update({ is_locked: true })
    .eq('cycle_id', cycleId);

  // Confirm and close the cycle
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('cycles')
    .update({
      status: 'signed_off',
      confirmed_at: new Date().toISOString(),
      confirmed_by: auth.userId,
      confirmation_notes: confirmationNotes,
    })
    .eq('id', cycleId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ cycle: updated, message: 'Cycle confirmed and closed by Asis.' });
}
