import type { HealthResponse } from "@opspulse/shared";
import { useCallback, useEffect, useState } from "react";

import { getApiHealth } from "../api/health";

type HealthState =
  | { status: "loading" }
  | { status: "success"; data: HealthResponse }
  | { status: "error"; message: string };

export function ApiHealthCard() {
  const [healthState, setHealthState] = useState<HealthState>({
    status: "loading"
  });

  const loadHealth = useCallback(async () => {
    setHealthState({ status: "loading" });

    try {
      const data = await getApiHealth();
      setHealthState({ status: "success", data });
    } catch (error) {
      setHealthState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Unknown API health error"
      });
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  return (
    <article className="health-card" aria-live="polite">
      <div>
        <p className="card-kicker">Backend connectivity</p>
        <h3>OpsPulse API</h3>
      </div>

      {healthState.status === "loading" && (
        <p className="health-message">Checking API health…</p>
      )}

      {healthState.status === "success" && (
        <div className="health-details">
          <span className="health-indicator health-indicator-up">Available</span>
          <span>{healthState.data.service}</span>
          <span>Environment: {healthState.data.environment}</span>
          <span>
            Checked: {new Date(healthState.data.timestamp).toLocaleString()}
          </span>
        </div>
      )}

      {healthState.status === "error" && (
        <div className="health-details">
          <span className="health-indicator health-indicator-down">
            Unavailable
          </span>
          <span>{healthState.message}</span>
        </div>
      )}

      <button
        className="button button-secondary"
        type="button"
        onClick={() => void loadHealth()}
        disabled={healthState.status === "loading"}
      >
        Retry
      </button>
    </article>
  );
}
