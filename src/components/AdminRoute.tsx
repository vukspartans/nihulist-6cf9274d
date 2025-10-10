import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading, isAdmin } = useAuth();

  console.log('AdminRoute - user:', user?.id, 'loading:', loading, 'isAdmin:', isAdmin);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    console.log('AdminRoute - No user, redirecting to login');
    return <Navigate to="/heyadmin/login" replace />;
  }

  if (!isAdmin) {
    console.log('AdminRoute - User is not admin, redirecting to login');
    return <Navigate to="/heyadmin/login" replace />;
  }

  console.log('AdminRoute - User is admin, rendering children');
  return <>{children}</>;
};

export default AdminRoute;
