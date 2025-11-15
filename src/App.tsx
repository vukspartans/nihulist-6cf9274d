import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import RoleBasedRoute from "@/components/RoleBasedRoute";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdvisorDashboard from "./pages/AdvisorDashboard";
import AdvisorProfile from "./pages/AdvisorProfile";
import { ProjectWizard } from "./pages/ProjectWizard";
import { ProjectDetail } from "./pages/ProjectDetail";
import Profile from "./pages/Profile";
import SupplierSubmit from "./pages/SupplierSubmit";
import SubmitProposal from "./pages/SubmitProposal";
import RFPDetails from "./pages/RFPDetails";
import ForEntrepreneurs from "./pages/ForEntrepreneurs";
import ForConsultants from "./pages/ForConsultants";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import EntrepreneursManagement from "./pages/admin/EntrepreneursManagement";
import AdvisorsManagement from "./pages/admin/AdvisorsManagement";
import ProjectsManagement from "./pages/admin/ProjectsManagement";
import RFPsManagement from "./pages/admin/RFPsManagement";
import UsersManagement from "./pages/admin/UsersManagement";
import AuditLog from "./pages/admin/AuditLog";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

// Scroll to top component for route changes
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const AppContent = () => {
  const { user, profile } = useAuth();
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  useEffect(() => {
    if (user && profile?.requires_password_change) {
      setShowPasswordChange(true);
    } else {
      setShowPasswordChange(false);
    }
  }, [user, profile]);

  return (
    <>
      {user && profile?.requires_password_change && (
        <PasswordChangeModal
          open={showPasswordChange}
          userId={user.id}
          onSuccess={() => {
            setShowPasswordChange(false);
            window.location.reload();
          }}
        />
      )}
      <TooltipProvider>
        <ErrorBoundary>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <RecoveryDeepLinkHandler />
            <AuthEventRouter />
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/for-entrepreneurs" element={<ForEntrepreneurs />} />
            <Route path="/for-consultants" element={<ForConsultants />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/submit" element={<SupplierSubmit />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['entrepreneur']}>
                    <Dashboard />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects/new" 
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['entrepreneur']}>
                    <ProjectWizard />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects/:id" 
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['entrepreneur']}>
                    <ProjectDetail />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/advisor-dashboard" 
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['advisor']}>
                    <AdvisorDashboard />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/advisor-profile" 
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['advisor']}>
                    <AdvisorProfile />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/submit-proposal/:rfp_id" 
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['advisor']}>
                    <SubmitProposal />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/invite/:invite_id/submit" 
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['advisor']}>
                    <SubmitProposal />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/rfp-details/:rfp_id" 
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['advisor']}>
                    <RFPDetails />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/invite/:invite_id/details" 
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['advisor']}>
                    <RFPDetails />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } 
            />
            {/* Admin Routes */}
            <Route path="/heyadmin/login" element={<AdminLogin />} />
            <Route path="/heyadmin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/heyadmin/entrepreneurs" element={<AdminRoute><EntrepreneursManagement /></AdminRoute>} />
            <Route path="/heyadmin/advisors" element={<AdminRoute><AdvisorsManagement /></AdminRoute>} />
            <Route path="/heyadmin/projects" element={<AdminRoute><ProjectsManagement /></AdminRoute>} />
            <Route path="/heyadmin/rfps" element={<AdminRoute><RFPsManagement /></AdminRoute>} />
            <Route path="/heyadmin/users" element={<AdminRoute><UsersManagement /></AdminRoute>} />
            <Route path="/heyadmin/audit" element={<AdminRoute><AuditLog /></AdminRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </>
  );
};

const RecoveryDeepLinkHandler = () => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if the URL hash contains type=recovery
    if (window.location.hash.includes('type=recovery')) {
      if (pathname.startsWith('/heyadmin')) {
        console.log('[Recovery] Admin recovery deep-link detected');
        navigate('/heyadmin/login?type=recovery', { replace: true });
      } else {
        console.log('[Recovery] Non-admin recovery deep-link detected');
        navigate('/auth?type=recovery', { replace: true });
      }
    }
  }, [pathname, search, navigate]);

  return null;
};

const AuthEventRouter = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (pathname.startsWith('/heyadmin')) {
          console.log('[AuthEvent] Admin password recovery');
          navigate('/heyadmin/login?type=recovery', { replace: true });
        } else {
          console.log('[AuthEvent] Non-admin password recovery');
          navigate('/auth?type=recovery', { replace: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
