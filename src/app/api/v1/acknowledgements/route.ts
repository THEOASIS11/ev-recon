import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { supabaseService } from '@/lib/supabase';

// ack_type enum in DB: 'read' | 'dismissed'
// We map:   reminder_20th → 'read'
//           reminder_25th → 'dismissed'
function toDbAckType(type: string): string | null {
  if (type === 'reminder_20th') return 'read';
  if (type === 'reminder_25th') return 'dismissed';
  return null;
}

function fromDbAckType(dbType: string): string {
  if (dbType === 'read') return 'reminder_20th';
  if (dbType === 'dismissed') return 'reminder_25th';
  return dbType;
}

// POST /api/v1/acknowledgements
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: { type: string; cycle_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, cycle_id } = body;
  if (!type || !cycle_id) {
    return NextResponse.json({ error: 'type and cycle_id are required' }, { status: 400 });
  }

  const dbAckType = toDbAckType(type);
  if (!dbAckType) {
    return NextResponse.json({ error: 'Invalid ack type. Use reminder_20th or reminder_25th' }, { status: 400 });
  }

  // Check for duplicate
  const { data: existing } = await supabaseService
    .from('acknowledgements')
    .select('id')
    .eq('user_id', auth.userId)
    .eq('cycle_id', cycle_id)
    .eq('ack_type', dbAckType)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Already acknowledged' }, { status: 409 });
  }

  const { data, error } = await supabaseService
    .from('acknowledgements')
    .insert({
      user_id: auth.userId,
      cycle_id,
      ack_type: dbAckType,
      acknowledged_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('acknowledgements insert error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({
    acknowledgement: {
      ...data,
      ack_type: fromDbAckType(data.ack_type),
    },
  }, { status: 201 });
}

// GET /api/v1/acknowledgements?cycle_id=...
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const cycle_id = searchParams.get('cycle_id');

  let query = supabaseService.from('acknowledgements').select('*');
  if (cycle_id) query = query.eq('cycle_id', cycle_id);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({
    acknowledgements: (data || []).map((a) => ({
      ...a,
      ack_type: fromDbAckType(a.ack_type),
    })),
  });
}
