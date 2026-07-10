import * as React from 'react';
import { Navigate } from 'react-router-dom';

import type { AppRole } from '../../lib/roles';
import { normalizeAppRole } from '../../lib/roles';
import { useAuthStore } from '../../store/useAuthStore';

export function ProtectedRoute({
  children,
  requireOnboarding = false,
  allowedRoles,
}: {
  children: React.ReactNode;
  requireOnboarding?: boolean;
  allowedRoles?: AppRole[];
}) {
  const { user, profile, loading } = useAuthStore();

  if (loading || (user && !profile)) {
    return (
      <div className="section-shell flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="panel flex items-center gap-4 px-6 py-5">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-black border-t-transparent" />
          <p className="text-sm font-medium text-black/60">Checking access.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireOnboarding && !profile?.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(normalizeAppRole(profile.role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
