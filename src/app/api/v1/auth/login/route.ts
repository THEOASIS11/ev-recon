import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone aur password dono chahiye.' },
        { status: 400 }
      );
    }

    const result = await authenticateUser(String(phone), String(password));

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Server error. Thodi der baad try karo.' }, { status: 500 });
  }
}
