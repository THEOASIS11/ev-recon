import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  // Add token to deny-list in Supabase
  const authHeader = request.headers.get('authorization')!;
  const token = authHeader.slice(7);

  try {
    await supabaseAdmin.from('token_denylist').insert({
      token,
      user_id: auth.userId,
      expires_at: auth.exp ? new Date(auth.exp * 1000).toISOString() : null,
    });
  } catch {
    // If deny-list table doesn't exist yet, still return success
    // Token will expire naturally after 30 days
  }

  return NextResponse.json({ success: true });
}
