import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/v1/cycles/[id]/investigation-notes — supervisor only
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
    notes = body.notes ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('cycles')
    .update({ investigation_notes: notes })
    .eq('id', cycleId)
    .select('id, investigation_notes')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to save notes.' }, { status: 500 });
  }

  return NextResponse.json({ cycle: data });
}
