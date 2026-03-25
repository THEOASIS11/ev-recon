import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from './auth';

export function getAuthPayload(request: NextRequest): JWTPayload | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

export function unauthorized(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(message = 'Internal server error'): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Use at the top of any protected API route.
 * Returns the JWT payload if auth is valid, or a 401 NextResponse.
 *
 * Usage:
 *   const auth = requireAuth(request);
 *   if (auth instanceof NextResponse) return auth;
 *   // auth is JWTPayload from here
 */
export function requireAuth(request: NextRequest): JWTPayload | NextResponse {
  const payload = getAuthPayload(request);
  if (!payload) return unauthorized();
  return payload;
}

/**
 * Require auth + specific roles.
 * Returns payload or a 401/403 NextResponse.
 */
export function requireAuthWithRole(
  request: NextRequest,
  allowedRoles: string[]
): JWTPayload | NextResponse {
  const payload = getAuthPayload(request);
  if (!payload) return unauthorized();
  if (!allowedRoles.includes(payload.role)) return forbidden('Access denied for your role.');
  return payload;
}
