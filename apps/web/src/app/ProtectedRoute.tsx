import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useDemoAuth } from "./DemoAuthContext";

export function ProtectedRoute() {
  const { session } = useDemoAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
