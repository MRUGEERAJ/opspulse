import {
  createBrowserRouter,
  Navigate,
  RouterProvider
} from "react-router-dom";

import { DashboardPage } from "../features/dashboard/DashboardPage";
import { LoginPage } from "../features/auth/LoginPage";
import { UnauthorizedPage } from "../features/auth/UnauthorizedPage";
import { WorkOrderDetailPage } from "../features/work-orders/WorkOrderDetailPage";
import { WorkOrdersPage } from "../features/work-orders/WorkOrdersPage";
import { AppLayout } from "./AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/unauthorized",
    element: <UnauthorizedPage />
  },
  {
    element: <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />
          },
          {
            path: "/work-orders",
            element: <WorkOrdersPage />
          },
          {
            path: "/work-orders/:workOrderId",
            element: <WorkOrderDetailPage />
          }
        ]
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
