import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithRole } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/v1/admin/products — admin only, ALL products including inactive
export async function GET(request: NextRequest) {
  const auth = requireAuthWithRole(request, ['admin']);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, name, sku, is_active, display_order, created_at')
    .order('display_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data || [] });
}

// POST /api/v1/admin/products — admin only, create new product
export async function POST(request: NextRequest) {
  const auth = requireAuthWithRole(request, ['admin']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { name, display_order } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name,
        display_order: display_order ?? 999,
        is_active: true,
      })
      .select('id, name, sku, is_active, display_order, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ product: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
