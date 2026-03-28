import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET!;
const LOCKOUT_MINUTES = 15;
const MAX_ATTEMPTS = 3;

export interface JWTPayload {
  userId: string;
  name: string;
  role: string;
  iat?: number;
  exp?: number;
}

// In-memory fail tracker — keys are phone numbers
// Resets on server restart; good enough for a small internal app
const failedAttempts: Record<string, { count: number; lockedUntil: number | null }> = {};

export async function authenticateUser(
  phone: string,
  password: string
): Promise<
  | { token: string; user: { id: string; name: string; role: string } }
  | { error: string; status: number }
> {
  // Strip whitespace and normalize case
  const cleanPhone = phone.trim().toLowerCase();

  // Check lockout
  const attempts = failedAttempts[cleanPhone];
  if (attempts?.lockedUntil && Date.now() < attempts.lockedUntil) {
    const minutesLeft = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
    return {
      error: `3 baar galat try hua. ${minutesLeft} minute baad try karo.`,
      status: 423,
    };
  }

  // Find user by phone
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, name, phone, role, password_hash, is_active')
    .eq('phone', cleanPhone)
    .single();

  if (error || !user) {
    incrementFailCount(cleanPhone);
    return { error: 'Username ya password galat hai. Dobara try karo.', status: 401 };
  }

  if (!user.is_active) {
    return { error: 'Account deactivated. Admin se poocho.', status: 403 };
  }

  // Verify password using bcryptjs (works with pgcrypto $2a$ hashes)
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    incrementFailCount(cleanPhone);
    const current = failedAttempts[cleanPhone]?.count ?? 0;
    if (current >= MAX_ATTEMPTS) {
      return {
        error: `3 baar galat try hua. ${LOCKOUT_MINUTES} minute baad try karo.`,
        status: 423,
      };
    }
    return { error: 'Username ya password galat hai. Dobara try karo.', status: 401 };
  }

  // Clear fail count on successful login
  delete failedAttempts[cleanPhone];

  // Update last_login timestamp
  await supabaseAdmin
    .from('users')
    .update({ last_login: new Date().toISOString() })
    .eq('id', user.id);

  // Issue JWT — role is embedded at issue time
  const payload: JWTPayload = {
    userId: user.id,
    name: user.name,
    role: user.role,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

  return {
    token,
    user: { id: user.id, name: user.name, role: user.role },
  };
}

function incrementFailCount(phone: string) {
  if (!failedAttempts[phone]) {
    failedAttempts[phone] = { count: 0, lockedUntil: null };
  }
  failedAttempts[phone].count++;
  if (failedAttempts[phone].count >= MAX_ATTEMPTS) {
    failedAttempts[phone].lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
  }
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function requireRole(payload: JWTPayload, allowedRoles: string[]): boolean {
  return allowedRoles.includes(payload.role);
}

export async function resetPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }
  const hash = await bcrypt.hash(newPassword, 10);
  const { error } = await supabaseAdmin
    .from('users')
    .update({ password_hash: hash })
    .eq('id', userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
