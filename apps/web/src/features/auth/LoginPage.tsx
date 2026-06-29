import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { ApiError } from "../../shared/api/api-client";
import { useAuth } from "./AuthContext";
import type { WebAuthRole } from "./auth.types";

type LoginLocationState = {
  from?: string;
};

export function LoginPage() {
  const { status, session, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LoginLocationState | null;
  const [email, setEmail] = useState("admin@opspulse.local");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const nextSession = await login({
        email,
        password
      });

      navigate(destinationForRole(nextSession.user.role, state?.from), {
        replace: true
      });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Could not sign in. Check that the API is running."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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

  if (session) {
    return (
      <Navigate
        to={destinationForRole(session.user.role, state?.from)}
        replace
      />
    );
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

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Email</span>
            <input
              autoComplete="email"
              inputMode="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className="form-field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {errorMessage ? (
            <div className="form-error" role="alert">
              {errorMessage}
            </div>
          ) : null}

          <button
            className="button button-primary button-full"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="demo-notice">
          <strong>Development seed users</strong>
          <span>admin@opspulse.local</span>
          <span>manager@opspulse.local</span>
          <span>agent@opspulse.local</span>
        </div>
      </section>
    </main>
  );
}

function destinationForRole(role: WebAuthRole, from?: string): string {
  if (role === "FIELD_AGENT") {
    return "/unauthorized";
  }

  if (from && from !== "/login" && from !== "/unauthorized") {
    return from;
  }

  return "/dashboard";
}
