import { NavLink, Outlet } from "react-router-dom";

import { useDemoAuth } from "./DemoAuthContext";

const navigationItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/work-orders", label: "Work Orders" }
] as const;

export function AppLayout() {
  const { session, logout } = useDemoAuth();

  return (
    <div className="control-tower">
      <aside className="sidebar">
        <div>
          <p className="brand-kicker">OpsPulse</p>
          <h1 className="brand-title">Control Tower</h1>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <span className="role-badge">{session?.role}</span>
          <strong>{session?.displayName}</strong>
          <button className="button button-secondary" type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div>
            <span className="mobile-brand">OpsPulse Control Tower</span>
            <span className="environment-badge">Development shell</span>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
