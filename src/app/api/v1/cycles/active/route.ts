import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const today = new Date();
  const { data, error } = await supabaseAdmin
    .from('cycles')
    .select('*')
    .eq('status', 'active')
    .lte('start_date', today.toISOString().split('T')[0])
    .order('start_date', { ascending: false })
    .maybeSingle();

  if (error) {
    console.error('cycles/active error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ cycle: null });
  }

  // Calculate days until cutoff (28th of cycle month)
  const cycleMonth = new Date(data.start_date);
  const cutoffDate = new Date(cycleMonth.getFullYear(), cycleMonth.getMonth(), 28);
  const msPerDay = 1000 * 60 * 60 * 24;
  const days_until_cutoff = Math.ceil((cutoffDate.getTime() - today.getTime()) / msPerDay);

  return NextResponse.json({
    cycle: {
      ...data,
      days_until_cutoff,
    },
  });
}
