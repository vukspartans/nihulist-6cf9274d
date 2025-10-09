
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
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
import SuppliersManagement from "./pages/admin/SuppliersManagement";
import ProjectsManagement from "./pages/admin/ProjectsManagement";
import RFPsManagement from "./pages/admin/RFPsManagement";
import UsersManagement from "./pages/admin/UsersManagement";
import AuditLog from "./pages/admin/AuditLog";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects/new" 
              element={
                <ProtectedRoute>
                  <ProjectWizard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/projects/:id" 
              element={
                <ProtectedRoute>
                  <ProjectDetail />
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
                  <AdvisorDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/advisor-profile" 
              element={
                <ProtectedRoute>
                  <AdvisorProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/submit-proposal/:rfp_id" 
              element={
                <ProtectedRoute>
                  <SubmitProposal />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/rfp-details/:rfp_id" 
              element={
                <ProtectedRoute>
                  <RFPDetails />
                </ProtectedRoute>
              } 
            />
            {/* Admin Routes */}
            <Route path="/heyadmin/login" element={<AdminLogin />} />
            <Route path="/heyadmin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/heyadmin/suppliers" element={<AdminRoute><SuppliersManagement /></AdminRoute>} />
            <Route path="/heyadmin/projects" element={<AdminRoute><ProjectsManagement /></AdminRoute>} />
            <Route path="/heyadmin/rfps" element={<AdminRoute><RFPsManagement /></AdminRoute>} />
            <Route path="/heyadmin/users" element={<AdminRoute><UsersManagement /></AdminRoute>} />
            <Route path="/heyadmin/audit" element={<AdminRoute><AuditLog /></AdminRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
