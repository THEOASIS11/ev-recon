import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// PATCH /api/v1/cycles/[id]/signoff
// Step 1 of two-tier sign-off: Arjun (supervisor) records investigation.
// Sets investigation_notes + signed_off_at + signed_off_by.
// Does NOT change cycle status to signed_off — Asis (admin) must confirm separately via /confirm.
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
    .select('id, status, signed_off_at')
    .eq('id', cycleId)
    .maybeSingle();

  if (cycleErr || !cycle) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  if (cycle.status !== 'active') {
    return NextResponse.json(
      { error: 'Sirf active cycle ka sign-off ho sakta hai.' },
      { status: 403 }
    );
  }

  if (cycle.signed_off_at) {
    return NextResponse.json(
      { error: 'Aap pehle hi sign-off kar chuke hain.' },
      { status: 409 }
    );
  }

  // Parse body for investigation_notes
  let investigationNotes = '';
  try {
    const body = await request.json();
    investigationNotes = body.investigation_notes || '';
  } catch {
    // notes optional
  }

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('cycles')
    .update({
      signed_off_at: new Date().toISOString(),
      signed_off_by: auth.userId,
      investigation_notes: investigationNotes,
    })
    .eq('id', cycleId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ cycle: updated, message: 'Sign-off recorded. Waiting for Asis confirmation.' });
}
