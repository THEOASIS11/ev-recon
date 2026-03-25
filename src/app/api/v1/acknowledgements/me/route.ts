import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

function fromDbAckType(dbType: string): string {
  if (dbType === 'read') return 'reminder_20th';
  if (dbType === 'dismissed') return 'reminder_25th';
  return dbType;
}

// GET /api/v1/acknowledgements/me?cycle_id=...
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const cycle_id = searchParams.get('cycle_id');

  let query = supabaseAdmin
    .from('acknowledgements')
    .select('*')
    .eq('user_id', auth.userId);

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
