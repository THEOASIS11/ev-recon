import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// Submission types each user is allowed to submit
const USER_SUBMISSION_TYPES: Record<string, string[]> = {
  factory_staff_gopalji: ['readiness_gopalji'],
  factory_staff_altab: ['readiness_altab'],
  factory_staff_kashif: ['readiness_kashif', 'defects_kashif'],
  factory_staff_furkan: ['readiness_furkan', 'closing_stock_furkan'],
  supervisor: ['physical_count_arjun'],
};

function getAllowedTypes(role: string, name: string): string[] {
  if (role === 'supervisor') return ['physical_count_arjun'];
  if (role === 'factory_staff') {
    const nameLower = name.toLowerCase();
    for (const [key, types] of Object.entries(USER_SUBMISSION_TYPES)) {
      if (key.includes(nameLower)) return types;
    }
  }
  // reconciler and admin cannot submit operational data
  return [];
}

// GET /api/v1/submissions?cycle_id=...
// factory_staff: own submissions only
// supervisor/reconciler/admin: all submissions for the cycle
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get('cycle_id');

  if (!cycleId) {
    return NextResponse.json({ error: 'cycle_id query param required.' }, { status: 400 });
  }

  let query = supabaseAdmin
    .from('submissions')
    .select('id, cycle_id, user_id, submission_type, data, submitted_at, is_locked')
    .eq('cycle_id', cycleId);

  // factory_staff can only see own submissions
  if (auth.role === 'factory_staff') {
    query = query.eq('user_id', auth.userId);
  }

  const { data, error } = await query.order('submitted_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submissions: data });
}

// POST /api/v1/submissions
// One submission per type per cycle per user — PERMANENT LOCK.
// No editing ever. 409 if already submitted.
export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { cycle_id, submission_type, data } = body;

    if (!cycle_id || !submission_type || !data) {
      return NextResponse.json(
        { error: 'cycle_id, submission_type, and data are required.' },
        { status: 400 }
      );
    }

    // Check cycle exists and get its status
    const { data: cycle, error: cycleError } = await supabaseAdmin
      .from('cycles')
      .select('status')
      .eq('id', cycle_id)
      .single();

    if (cycleError || !cycle) {
      return NextResponse.json({ error: 'Cycle not found.' }, { status: 404 });
    }

    // Only active cycles accept new submissions
    if (cycle.status !== 'active') {
      return NextResponse.json(
        { error: 'Is cycle mein submit nahi kar sakte. Cycle active nahi hai.' },
        { status: 403 }
      );
    }

    // Role check: verify user is allowed to submit this type
    const allowedTypes = getAllowedTypes(auth.role, auth.name);
    if (!allowedTypes.includes(submission_type)) {
      return NextResponse.json(
        { error: 'Aapko yeh type submit karne ki permission nahi hai.' },
        { status: 403 }
      );
    }

    // Check for existing submission — PERMANENT LOCK, no editing allowed
    const { data: existing } = await supabaseAdmin
      .from('submissions')
      .select('id')
      .eq('cycle_id', cycle_id)
      .eq('user_id', auth.userId)
      .eq('submission_type', submission_type)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Aap pehle hi submit kar chuke hain. Data lock hai — koi changes nahi ho sakte.' },
        { status: 409 }
      );
    }

    // Insert new submission — locked immediately
    const { data: submission, error: insertError } = await supabaseAdmin
      .from('submissions')
      .insert({
        cycle_id,
        user_id: auth.userId,
        submission_type,
        data,
        is_locked: true,
      })
      .select()
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json({ submission }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
