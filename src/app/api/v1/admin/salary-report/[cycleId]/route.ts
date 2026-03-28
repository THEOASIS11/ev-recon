import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/v1/admin/salary-report/:cycleId — admin only
// Returns per-person: name, role, tasks completed, clearance status + reason
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  const auth = requireAuthWithRole(request, ['admin']);
  if (auth instanceof NextResponse) return auth;

  const { cycleId } = await params;

  // Fetch cycle
  const { data: cycle, error: cycleErr } = await supabaseAdmin
    .from('cycles')
    .select('id, cycle_month, status')
    .eq('id', cycleId)
    .maybeSingle();

  if (cycleErr || !cycle) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  // Fetch all users
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, name, role, is_active')
    .order('name');

  // Fetch all submissions for this cycle
  const { data: submissions } = await supabaseAdmin
    .from('submissions')
    .select('user_id, submission_type, submitted_at')
    .eq('cycle_id', cycleId);

  // Fetch all acknowledgements for this cycle
  const { data: acks } = await supabaseAdmin
    .from('acknowledgements')
    .select('user_id, ack_type, acknowledged_at')
    .eq('cycle_id', cycleId);

  // Fetch all clearances for this cycle (with full reason — admin only)
  const { data: clearances } = await supabaseAdmin
    .from('clearances')
    .select('user_id, status, note, cleared_by, cleared_at')
    .eq('cycle_id', cycleId);

  const subsByUser: Record<string, string[]> = {};
  (submissions || []).forEach((s) => {
    if (!subsByUser[s.user_id]) subsByUser[s.user_id] = [];
    subsByUser[s.user_id].push(s.submission_type);
  });

  const acksByUser: Record<string, string[]> = {};
  (acks || []).forEach((a) => {
    if (!acksByUser[a.user_id]) acksByUser[a.user_id] = [];
    acksByUser[a.user_id].push(a.ack_type);
  });

  const clearanceByUser: Record<string, { status: string; note: string | null; cleared_at: string | null }> = {};
  (clearances || []).forEach((c) => {
    clearanceByUser[c.user_id] = { status: c.status, note: c.note, cleared_at: c.cleared_at };
  });

  // Build per-person rows (exclude admin role from salary report)
  const relevantUsers = (users || []).filter((u) => u.role !== 'admin');

  const rows = relevantUsers.map((u) => {
    const userSubs = subsByUser[u.id] || [];
    const userAcks = acksByUser[u.id] || [];
    const clearance = clearanceByUser[u.id] || { status: 'pending', note: null, cleared_at: null };

    // Count tasks
    const has20thAck = userAcks.some((a) => a === 'ack_20th' || a.includes('20'));
    const has25thAck = userAcks.some((a) => a === 'ack_25th' || a.includes('25'));
    const hasSub = userSubs.length > 0;

    return {
      user_id: u.id,
      name: u.name,
      role: u.role,
      ack_20th: has20thAck,
      ack_25th: has25thAck,
      has_submission: hasSub,
      submission_types: userSubs,
      clearance_status: clearance.status,
      clearance_note: clearance.note,
      cleared_at: clearance.cleared_at,
      tasks_completed: userSubs.length + (has20thAck ? 1 : 0) + (has25thAck ? 1 : 0),
    };
  });

  return NextResponse.json({ cycle, rows });
}
