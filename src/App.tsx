import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import CustomCursor from "./components/CustomCursor";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { MainLayout } from "./components/layout/MainLayout";
import { RouteLoader } from "./components/site/RouteLoader";
import { useAuthStore } from "./store/useAuthStore";

const About = lazy(() => import("./pages/About"));
const Admin = lazy(() => import("./pages/Admin"));
const Auth = lazy(() => import("./pages/Auth"));
const Blog = lazy(() => import("./pages/Blog"));
const Booking = lazy(() => import("./pages/Booking"));
const Careers = lazy(() => import("./pages/Careers"));
const Cities = lazy(() => import("./pages/Cities"));
const Contact = lazy(() => import("./pages/Contact"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DriverOnboarding = lazy(() => import("./pages/DriverOnboarding"));
const FAQ = lazy(() => import("./pages/FAQ"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Home = lazy(() => import("./pages/Home"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Profile = lazy(() => import("./pages/Profile"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Safety = lazy(() => import("./pages/Safety"));
const Terms = lazy(() => import("./pages/Terms"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));

function AppRoutes() {
  const loading = useAuthStore((state) => state.loading);

  useEffect(() => {
    void useAuthStore.getState().initialize();
  }, []);

  if (loading) {
    return <RouteLoader />;
  }

  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="/blog" element={<Blog />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/cities" element={<Cities />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route
            path="/book"
            element={
              <ProtectedRoute requireOnboarding>
                <Booking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireOnboarding>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver-signup"
            element={
              <ProtectedRoute requireOnboarding>
                <DriverOnboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider-signup"
            element={<Navigate to="/driver-signup" replace />}
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
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
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <Router>
      <CustomCursor />
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            border: "2px solid #000",
            borderRadius: "0",
            padding: "12px 14px",
            fontWeight: "700",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            boxShadow: "4px 4px 0 0 rgba(0,0,0,1)",
          },
          success: {
            style: {
              background: "#000",
              color: "#fff",
            },
          },
          error: {
            style: {
              background: "#fff",
              color: "#000",
            },
          },
        }}
      />
    </Router>
  );
}

export default App;
