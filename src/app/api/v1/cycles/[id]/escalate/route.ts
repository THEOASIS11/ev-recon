import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/v1/cycles/[id]/escalate — supervisor only
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthWithRole(request, ['supervisor']);
  if (auth instanceof NextResponse) return auth;

  const { id: cycleId } = await params;

  let notes = '';
  try {
    const body = await request.json();
    notes = body.notes || '';
  } catch { /* no body */ }

  // Fetch cycle
  const { data: cycle, error: cycleErr } = await supabaseAdmin
    .from('cycles')
    .select('id, status')
    .eq('id', cycleId)
    .maybeSingle();

  if (cycleErr || !cycle) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  // Update cycle status to escalated and save notes
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('cycles')
    .update({
      status: 'escalated',
      investigation_notes: notes || null,
    })
    .eq('id', cycleId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to escalate cycle.' }, { status: 500 });
  }

  return NextResponse.json({
    cycle: updated,
    escalation: {
      cycle_id: cycleId,
      raised_by: auth.userId,
      notes,
      created_at: new Date().toISOString(),
    },
  });
}
