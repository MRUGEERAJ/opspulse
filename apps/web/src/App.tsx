import { AppRouter } from "./app/AppRouter";
import { AuthProvider } from "./features/auth/AuthContext";

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
