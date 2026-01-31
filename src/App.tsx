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
import { FeedbackWidget } from "@/components/FeedbackWidget";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import EmailVerified from "./pages/EmailVerified";
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
import FeedbackManagement from "./pages/admin/FeedbackManagement";
import MunicipalitiesManagement from "./pages/admin/MunicipalitiesManagement";
import LicensingPhasesManagement from "./pages/admin/LicensingPhasesManagement";
import TaskTemplatesManagement from "./pages/admin/TaskTemplatesManagement";
import PaymentCategoriesManagement from "./pages/admin/PaymentCategoriesManagement";
import PaymentStatusesManagement from "./pages/admin/PaymentStatusesManagement";
import MilestoneTemplatesManagement from "./pages/admin/MilestoneTemplatesManagement";
import RFPTemplatesManagement from "./pages/admin/RFPTemplatesManagement";
import FeeTemplatesHierarchy from "./pages/admin/FeeTemplatesHierarchy";
import FeeTemplatesByProject from "./pages/admin/FeeTemplatesByProject";
import FeeTemplateCategories from "./pages/admin/FeeTemplateCategories";
import FeeTemplateSubmissionMethods from "./pages/admin/FeeTemplateSubmissionMethods";
import NegotiationResponse from "./pages/NegotiationResponse";
import OrganizationOnboarding from "./pages/OrganizationOnboarding";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

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
            <FeedbackWidget />
            <RecoveryDeepLinkHandler />
            <AuthEventRouter />
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/for-entrepreneurs" element={<ForEntrepreneurs />} />
            <Route path="/for-consultants" element={<ForConsultants />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/verified" element={<EmailVerified />} />
            <Route path="/submit" element={<SupplierSubmit />} />
            <Route 
              path="/organization/onboarding" 
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['entrepreneur']}>
                    <OrganizationOnboarding />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } 
            />
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
            <Route 
              path="/negotiation/:sessionId" 
              element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['advisor']}>
                    <NegotiationResponse />
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
            <Route path="/heyadmin/rfp-templates" element={<AdminRoute><RFPTemplatesManagement /></AdminRoute>} />
            <Route path="/heyadmin/fee-templates" element={<AdminRoute><FeeTemplatesHierarchy /></AdminRoute>} />
            <Route path="/heyadmin/fee-templates/:advisorType" element={<AdminRoute><FeeTemplatesByProject /></AdminRoute>} />
            <Route path="/heyadmin/fee-templates/:advisorType/:projectType" element={<AdminRoute><FeeTemplateCategories /></AdminRoute>} />
            <Route path="/heyadmin/fee-templates/:advisorType/:projectType/:categoryId" element={<AdminRoute><FeeTemplateSubmissionMethods /></AdminRoute>} />
            <Route path="/heyadmin/users" element={<AdminRoute><UsersManagement /></AdminRoute>} />
            <Route path="/heyadmin/feedback" element={<AdminRoute><FeedbackManagement /></AdminRoute>} />
            <Route path="/heyadmin/audit" element={<AdminRoute><AuditLog /></AdminRoute>} />
            <Route path="/heyadmin/municipalities" element={<AdminRoute><MunicipalitiesManagement /></AdminRoute>} />
            <Route path="/heyadmin/licensing-phases" element={<AdminRoute><LicensingPhasesManagement /></AdminRoute>} />
            <Route path="/heyadmin/task-templates" element={<AdminRoute><TaskTemplatesManagement /></AdminRoute>} />
            <Route path="/heyadmin/payment-categories" element={<AdminRoute><PaymentCategoriesManagement /></AdminRoute>} />
            <Route path="/heyadmin/payment-statuses" element={<AdminRoute><PaymentStatusesManagement /></AdminRoute>} />
            <Route path="/heyadmin/milestone-templates" element={<AdminRoute><MilestoneTemplatesManagement /></AdminRoute>} />
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
  const { pathname } = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    // Check if the URL hash contains type=recovery
    if (hash.includes('type=recovery')) {
      // Determine target path based on current location
      const targetPath = pathname.startsWith('/heyadmin') 
        ? '/heyadmin/login' 
        : '/auth';
      
      console.log('[Recovery] Deep-link detected, preserving hash and redirecting to:', targetPath);
      
      // Use window.location.href to preserve the hash fragment (navigate() loses it)
      // Only redirect if we're not already on the target path
      if (!pathname.includes(targetPath.replace('/', ''))) {
        window.location.href = `${window.location.origin}${targetPath}${hash}`;
      }
    }
  }, [pathname]);

  return null;
};

const AuthEventRouter = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthEventRouter] Auth event:', event, 'Session:', !!session);
      
      if (event === 'PASSWORD_RECOVERY') {
        // Set flag BEFORE navigating to ensure login page sees it
        localStorage.setItem('passwordRecoveryPending', 'true');
        
        // Check if this is an admin recovery (check localStorage for last admin email or current path)
        const lastAdminEmail = localStorage.getItem('lastAdminEmail');
        const isAdminRecovery = pathname.startsWith('/heyadmin') || lastAdminEmail;
        
        if (isAdminRecovery) {
          console.log('[AuthEvent] Admin password recovery - setting flag and navigating');
          localStorage.setItem('adminPasswordRecovery', 'true');
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
