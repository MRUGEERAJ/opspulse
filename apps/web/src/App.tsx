import { AppRouter } from "./app/AppRouter";
import { DemoAuthProvider } from "./app/DemoAuthContext";

export function App() {
  return (
    <DemoAuthProvider>
      <AppRouter />
    </DemoAuthProvider>
  );
}
