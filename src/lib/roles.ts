/**
 * Role constants and permission helpers.
 * Role is always read from the JWT — never from frontend state.
 */

export const ROLES = {
  FACTORY_STAFF: 'factory_staff',
  SUPERVISOR: 'supervisor',
  RECONCILER: 'reconciler',
  ADMIN: 'admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Which submission_type each user is allowed to submit
export const SUBMISSION_ROLE_MAP: Record<string, string[]> = {
  gopalji_9100000001: ['readiness_gopalji'],
  altab: ['readiness_altab'],
  kashif: ['readiness_kashif', 'defects_kashif'],
  furkan: ['readiness_furkan', 'closing_stock_furkan'],
  arjun: ['physical_count_arjun'],
};

// Roles that can access the web dashboard
export const WEB_ROLES: Role[] = [ROLES.RECONCILER, ROLES.SUPERVISOR, ROLES.ADMIN];

// Roles that can access all submissions (not just own)
export const CAN_READ_ALL_SUBMISSIONS: Role[] = [ROLES.RECONCILER, ROLES.SUPERVISOR, ROLES.ADMIN];

// Only role that can manage users
export const ADMIN_ONLY: Role[] = [ROLES.ADMIN];

// Only supervisor can sign off
export const SUPERVISOR_ONLY: Role[] = [ROLES.SUPERVISOR];

// Reconciler manages clearance
export const RECONCILER_ONLY: Role[] = [ROLES.RECONCILER];
