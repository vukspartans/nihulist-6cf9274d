/**
 * Centralized role-based navigation logic
 * SECURITY: Never hardcode dashboard paths in components - always use these functions
 */

export type AppRole = 'admin' | 'advisor' | 'entrepreneur' | 'supplier';

/**
 * Get the primary dashboard route for a given role
 * Implements role hierarchy: admin > advisor > entrepreneur > supplier
 */
export const getDashboardRouteForRole = (primaryRole: AppRole | null): string => {
  switch (primaryRole) {
    case 'admin':
      return '/heyadmin';
    case 'advisor':
      return '/advisor-dashboard';
    case 'entrepreneur':
      return '/dashboard';
    case 'supplier':
      return '/'; // or appropriate route for suppliers
    default:
      return '/';
  }
};

/**
 * Get the login route for a given role
 * Used for sign-out redirects
 */
export const getLoginRouteForRole = (primaryRole: AppRole | null): string => {
  switch (primaryRole) {
    case 'admin':
      return '/heyadmin/login';
    case 'advisor':
      return '/auth?mode=login&type=advisor&logged_out=1';
    case 'entrepreneur':
      return '/auth?mode=login&type=entrepreneur&logged_out=1';
    default:
      return '/auth?mode=login&type=entrepreneur&logged_out=1';
  }
};

/**
 * Determine the primary role from an array of roles
 * Implements role hierarchy: admin > advisor > entrepreneur > supplier
 * SECURITY: This is the single source of truth for role priority
 */
export const getPrimaryRole = (roles: AppRole[]): AppRole | null => {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('advisor')) return 'advisor';
  if (roles.includes('entrepreneur')) return 'entrepreneur';
  if (roles.includes('supplier')) return 'supplier';
  return null;
};
