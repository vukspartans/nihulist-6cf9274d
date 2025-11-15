import { ReactNode, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ToSAcceptanceModal } from '@/components/ToSAcceptanceModal';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      // Give it a moment before redirecting in case session is loading
      const timer = setTimeout(() => {
        setShouldRedirect(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setShouldRedirect(false);
    }
  }, [loading, user]);

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

  if (!user && shouldRedirect) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <>
      <ToSAcceptanceModal />
      {children}
    </>
  );
};

export default ProtectedRoute;