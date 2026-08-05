import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import CustomCursor from "./components/CustomCursor";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { MainLayout } from "./components/layout/MainLayout";
import { RouteLoader } from "./components/site/RouteLoader";
import { useAuthStore } from "./store/useAuthStore";
import { ErrorBoundary } from "./components/ErrorBoundary";

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

interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <ErrorBoundary
      error={error}
      resetErrorBoundary={resetErrorBoundary}
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-white border-b-2 border-black px-4 py-8">
          <div className="max-w-md text-center">
            <div className="mb-8">
              <div className="inline-flex h-16 w-16 items-center justify-center border-2 border-black bg-black text-white font-black text-2xl">
                !
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-black border-b-2 border-black pb-4">
              Error
            </h1>
            <p className="text-lg text-black font-medium mb-2">
              {error?.message || 'Something went wrong'}
            </p>
            {import.meta.env.DEV && error?.stack && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-mono text-gray-600 hover:text-black">
                  Stack trace (dev only)
                </summary>
                <pre className="mt-2 overflow-auto bg-gray-100 p-2 text-xs border border-gray-300 rounded">
                  {error.stack}
                </pre>
              </details>
            )}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={resetErrorBoundary}
                className="flex-1 px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm border-2 border-black hover:bg-white hover:text-black transition-colors shadow-soft"
                aria-label="Retry"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-6 py-3 bg-white text-black font-bold uppercase tracking-widest text-sm border-2 border-black hover:bg-black hover:text-white transition-colors shadow-soft"
                aria-label="Go home"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      }
    >
      <div />
    </ErrorBoundary>
  );
}

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
          <Route path="/" element={<Home />} errorElement={<ErrorFallback />} />
          <Route path="/about" element={<About />} errorElement={<ErrorFallback />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Admin />
              </ProtectedRoute>
            }
            errorElement={<ErrorFallback />}
          />
          <Route path="/blog" element={<Blog />} errorElement={<ErrorFallback />} />
          <Route path="/careers" element={<Careers />} errorElement={<ErrorFallback />} />
          <Route path="/cities" element={<Cities />} errorElement={<ErrorFallback />} />
          <Route path="/contact" element={<Contact />} errorElement={<ErrorFallback />} />
          <Route path="/faq" element={<FAQ />} errorElement={<ErrorFallback />} />
          <Route path="/privacy" element={<Privacy />} errorElement={<ErrorFallback />} />
          <Route path="/safety" element={<Safety />} errorElement={<ErrorFallback />} />
          <Route path="/terms" element={<Terms />} errorElement={<ErrorFallback />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Auth />} errorElement={<ErrorFallback />} />
          <Route path="/forgot-password" element={<ForgotPassword />} errorElement={<ErrorFallback />} />
          <Route path="/reset-password" element={<ResetPassword />} errorElement={<ErrorFallback />} />
          <Route path="/verify-email" element={<VerifyEmail />} errorElement={<ErrorFallback />} />
          <Route
            path="/book"
            element={
              <ProtectedRoute requireOnboarding>
                <Booking />
              </ProtectedRoute>
            }
            errorElement={<ErrorFallback />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireOnboarding>
                <Dashboard />
              </ProtectedRoute>
            }
            errorElement={<ErrorFallback />}
          />
          <Route
            path="/driver-signup"
            element={
              <ProtectedRoute requireOnboarding>
                <DriverOnboarding />
              </ProtectedRoute>
            }
            errorElement={<ErrorFallback />}
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
            errorElement={<ErrorFallback />}
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
            errorElement={<ErrorFallback />}
          />
          <Route path="*" element={<NotFound />} errorElement={<ErrorFallback />} />
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
