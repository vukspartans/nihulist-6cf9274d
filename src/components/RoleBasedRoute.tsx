import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRouteForRole } from '@/lib/roleNavigation';
import type { AppRole } from '@/lib/roleNavigation';

interface RoleBasedRouteProps {
  children: ReactNode;
  allowedRoles: AppRole[];
  redirectTo?: string;
}

/**
 * Route guard that restricts access based on user roles
 * SECURITY: Prevents users from accessing dashboards they're not authorized for
 */
const RoleBasedRoute = ({ children, allowedRoles, redirectTo }: RoleBasedRouteProps) => {
  const { primaryRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">טוען...</p>
        </div>
      </div>
    );
  }

  // If user doesn't have an allowed role, redirect to their appropriate dashboard
  if (!primaryRole || !allowedRoles.includes(primaryRole)) {
    const fallback = redirectTo || getDashboardRouteForRole(primaryRole);
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default RoleBasedRoute;
