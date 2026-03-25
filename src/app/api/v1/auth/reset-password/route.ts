import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { resetPassword } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  // Admin only
  const auth = requireAuthWithRole(request, ['admin']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { user_id, new_password } = body;

    if (!user_id || !new_password) {
      return NextResponse.json(
        { error: 'user_id and new_password are required.' },
        { status: 400 }
      );
    }

    // Verify target user exists
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .eq('id', user_id)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const result = await resetPassword(user_id, new_password);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, name: targetUser.name });
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
