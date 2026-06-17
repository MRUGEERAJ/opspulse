import {
  OPSPULSE_APP,
  USER_ROLES,
  WORK_ORDER_STATUSES
} from "@opspulse/shared";

export function App() {
  return (
    <main className="app-shell">
      <section className="intro">
        <p className="eyebrow">Offline-first Field Operations Platform</p>
        <h1>{OPSPULSE_APP.name} Control Tower</h1>
        <p>
          Admins and managers will use this web app to create, assign, and
          monitor field work.
        </p>
      </section>

      <section className="workspace-grid" aria-label="Shared contracts">
        <article>
          <h2>Roles</h2>
          <ul>
            {USER_ROLES.map((role) => (
              <li key={role}>{role}</li>
            ))}
          </ul>
        </article>

        <article>
          <h2>Work Order Statuses</h2>
          <ul>
            {WORK_ORDER_STATUSES.map((status) => (
              <li key={status}>{status}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
