import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../features/auth/AuthContext";
import type { WebAuthRole } from "../features/auth/auth.types";

type ProtectedRouteProps = {
  allowedRoles?: readonly WebAuthRole[];
};

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { status, session } = useAuth();
  const location = useLocation();

  if (status === "checking") {
    return (
      <main className="login-page">
        <section className="login-card" aria-live="polite">
          <p className="eyebrow">OpsPulse</p>
          <h1>Checking session</h1>
          <p className="login-description">
            Restoring your control tower session.
          </p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
