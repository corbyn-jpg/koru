import { lazy, Suspense, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { useAuth } from "./contexts/AuthContext";

import RouteSpeechAnnouncer from "./components/UI/routeSpeechAnnouncer";
import ProtectedRoute from "./components/ProtectedRoute";
import AppSidebar from "./components/AppSidebar";
import { FeedbackHost } from "./components/UI/feedback";

// Pages load on demand so the first screen doesn't wait for every page's code
const pages = {
  Dashboard: () => import("./pages/dashboard"),
  CalendarPage: () => import("./pages/calendar"),
  Courses: () => import("./pages/courses"),
  Onboarding: () => import("./pages/onboarding"),
  Login: () => import("./pages/login"),
  SettingsPage: () => import("./pages/settings"),
  TeacherAssistant: () => import("./pages/Assistant/teacherAssistant"),
  Profile: () => import("./pages/profile/profile"),
  AnalyticsPage: () => import("./pages/analytics"),
  AdminCourses: () => import("./pages/courses/adminCourses"),
};
const Dashboard = lazy(pages.Dashboard);
const CalendarPage = lazy(pages.CalendarPage);
const Courses = lazy(pages.Courses);
const Onboarding = lazy(pages.Onboarding);
const Login = lazy(pages.Login);
const SettingsPage = lazy(pages.SettingsPage);
const TeacherAssistant = lazy(pages.TeacherAssistant);
const Profile = lazy(pages.Profile);
const AnalyticsPage = lazy(pages.AnalyticsPage);
const AdminCourses = lazy(pages.AdminCourses);

// Once the first screen is up, fetch the other pages in the background, one at a time,
// so moving between pages doesn't pause while that page's code downloads
function preloadPages() {
  const queue = Object.values(pages);
  const next = () => queue.length && queue.shift()().catch(() => {}).then(() => setTimeout(next, 100));
  setTimeout(next, 1500);
}

// Root application component – sets up routing and the shared layout
function App() {
  const { role } = useAuth();
  const isIframeMode = window.self !== window.top;

  useEffect(preloadPages, []);

  // Stamp the user role on <body> so CSS can drive role-specific backgrounds
  useEffect(() => {
    if (role) {
      document.body.setAttribute("data-role", role);
    } else {
      document.body.removeAttribute("data-role");
    }
  }, [role]);

  return (
    // reducedMotion="user" makes every framer-motion animation respect the OS "reduce motion" setting
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <RouteSpeechAnnouncer />

        {/* Unified left sidebar – rendered once, visible on all protected routes */}
        <AppSidebar />

        {/* Main content area – offset for the floating 80px sidebar (16px margin + 80px width + 16px gap) */}
        <main className={isIframeMode ? "" : "py-4 pl-[112px] pr-4 min-h-screen"}>
          <Suspense fallback={null}>
            <Routes>
              {/* Public routes – landing & role-specific login portals */}
              <Route path="/" element={<Onboarding />} />
              <Route path="/student/login" element={<Login role="student" />} />
              <Route path="/teacher/login" element={<Login role="teacher" />} />
              <Route path="/admin/login" element={<Login role="admin" />} />

              {/* Protected routes – require authentication */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
              <Route path="/courses/*" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/teacherassistant" element={<ProtectedRoute allowedRoles={["teacher", "admin", "student"]}><TeacherAssistant /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/admin/courses" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCourses /></ProtectedRoute>} />

              {/* Profile routes*/}
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/:slug" element={<Profile publicRoute />} />

              {/* Catch-all – redirect unknown paths to landing */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        <FeedbackHost />
      </HashRouter>
    </MotionConfig>
  );
}

export default App
