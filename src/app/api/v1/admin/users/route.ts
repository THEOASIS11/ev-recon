import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// GET /api/v1/admin/users — admin only, all users
export async function GET(request: NextRequest) {
  const auth = requireAuthWithRole(request, ['admin']);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, phone, role, is_active, last_login, created_at')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data || [] });
}

// POST /api/v1/admin/users — admin only, create new user
export async function POST(request: NextRequest) {
  const auth = requireAuthWithRole(request, ['admin']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { name, phone, role, password } = body;

    if (!name || !phone || !role || !password) {
      return NextResponse.json({ error: 'name, phone, role, and password are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const validRoles = ['factory_staff', 'supervisor', 'reconciler', 'admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }

    // Check phone uniqueness
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Phone number already in use.' }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({ name, phone, role, password_hash, is_active: true })
      .select('id, name, phone, role, is_active, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ user: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
