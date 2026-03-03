import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getLoginRouteForRole } from "@/lib/roleNavigation";
import { Loader2 } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading, isAdmin, primaryRole } = useAuth();

  if (import.meta.env.DEV) console.log('AdminRoute - user:', user?.id, 'loading:', loading, 'isAdmin:', isAdmin);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    if (import.meta.env.DEV) console.log('AdminRoute - No user, redirecting to login');
    return <Navigate to="/heyadmin/login" replace />;
  }

  if (!isAdmin) {
    if (import.meta.env.DEV) console.log('AdminRoute - User is not admin, redirecting to role-based login');
    const loginRoute = getLoginRouteForRole(primaryRole);
    return <Navigate to={loginRoute} replace />;
  }

  if (import.meta.env.DEV) console.log('AdminRoute - User is admin, rendering children');
  return <>{children}</>;
};

export default AdminRoute;
