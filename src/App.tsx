import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CourseView from "./pages/CourseView";
import Certificates from "./pages/Certificates";
import AdminLayout from "./components/layout/AdminLayout";
import StudentLayout from "./components/layout/StudentLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import EmployeeManagement from "./pages/admin/EmployeeManagement";
import EmployeeDetail from "./pages/admin/EmployeeDetail";
import CourseManagement from "./pages/admin/CourseManagement";
import CourseEditor from "./pages/admin/CourseEditor";
import LessonPageBuilder from "./pages/admin/LessonPageBuilder";
import NotFound from "./pages/NotFound";
import AdminMails from "./pages/admin/AdminMails";
import AdminCertificates from "./pages/admin/AdminCertificates";
import AdminSettings from "./pages/admin/AdminSettings";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Impressum from "./pages/Impressum";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            <Route element={<StudentLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/certificates" element={<Certificates />} />
            </Route>

            <Route path="/course/:courseId" element={<CourseView />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="employees" element={<EmployeeManagement />} />
              <Route path="employees/:userId" element={<EmployeeDetail />} />
              <Route path="courses" element={<CourseManagement />} />
              <Route path="courses/:courseId" element={<CourseEditor />} />
              <Route path="mails" element={<AdminMails />} />
              <Route path="certificates" element={<AdminCertificates />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route path="/admin/courses/:courseId/lessons/:lessonIndex" element={<LessonPageBuilder />} />
            <Route path="/datenschutz" element={<PrivacyPolicy />} />
            <Route path="/impressum" element={<Impressum />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
