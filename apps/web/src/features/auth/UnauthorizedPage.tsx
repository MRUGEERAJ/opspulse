import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthContext";

export function UnauthorizedPage() {
  const { status, session, logout } = useAuth();

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
    return <Navigate to="/login" replace />;
  }

  if (session.user.role === "ADMIN" || session.user.role === "MANAGER") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="unauthorized-title">
        <p className="eyebrow">Control tower access</p>
        <h1 id="unauthorized-title">Use the mobile app</h1>
        <p className="login-description">
          {session.user.name} is signed in as a FieldAgent. Field work happens
          in the mobile app, while this web control tower is for Admin and
          Manager roles.
        </p>

        <button
          className="button button-primary button-full"
          type="button"
          onClick={logout}
        >
          Log out
        </button>
      </section>
    </main>
  );
}
