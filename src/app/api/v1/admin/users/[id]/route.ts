import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// PATCH /api/v1/admin/users/:id — admin only
// Can update: is_active, role, password (any combination)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuthWithRole(request, ['admin']);
  if (auth instanceof NextResponse) return auth;

  const { id: targetId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  // Role change
  if (body.role !== undefined) {
    if (auth.userId === targetId) {
      return NextResponse.json({ error: 'You cannot change your own role.' }, { status: 403 });
    }
    const validRoles = ['factory_staff', 'supervisor', 'reconciler', 'admin'];
    if (!validRoles.includes(body.role as string)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }
    updates.role = body.role;
  }

  // Deactivate
  if (body.is_active === false) {
    // Cannot deactivate self
    if (auth.userId === targetId) {
      return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 403 });
    }
    // Cannot deactivate if last active admin
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true);

    const targetIsAdmin = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', targetId)
      .single();

    if (
      targetIsAdmin.data?.role === 'admin' &&
      admins &&
      admins.length <= 1
    ) {
      return NextResponse.json(
        { error: 'Cannot deactivate the last active admin account.' },
        { status: 403 }
      );
    }
    updates.is_active = false;
  } else if (body.is_active === true) {
    updates.is_active = true;
  }

  // Password change
  if (body.password !== undefined) {
    const pwd = body.password as string;
    if (pwd.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }
    updates.password_hash = await bcrypt.hash(pwd, 10);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', targetId)
    .select('id, name, phone, role, is_active, last_login, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}
