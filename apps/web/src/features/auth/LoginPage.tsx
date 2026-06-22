import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useDemoAuth } from "../../app/DemoAuthContext";

type LoginLocationState = {
  from?: string;
};

export function LoginPage() {
  const { session, login } = useDemoAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LoginLocationState | null;

  function enterDemo() {
    login();
    navigate(state?.from ?? "/dashboard", { replace: true });
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <p className="eyebrow">Offline-first field operations</p>
        <h1 id="login-title">OpsPulse Control Tower</h1>
        <p className="login-description">
          Admins and managers use this workspace to coordinate field work and
          monitor operational health.
        </p>

        <div className="demo-notice">
          <strong>Development demo login</strong>
          <span>No real authentication yet.</span>
          <span>Session is stored only in memory.</span>
          <span>Refreshing the page will log you out.</span>
        </div>

        <button className="button button-primary button-full" type="button" onClick={enterDemo}>
          Enter as Demo Admin
        </button>
      </section>
    </main>
  );
}
