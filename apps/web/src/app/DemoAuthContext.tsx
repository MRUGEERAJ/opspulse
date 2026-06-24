import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
  useState
} from "react";

import type {
  DemoAuthContextValue,
  DemoSession
} from "./demo-auth.types";

const DemoAuthContext = createContext<DemoAuthContextValue | null>(null);

export function DemoAuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<DemoSession | null>(null);
  const value = useMemo<DemoAuthContextValue>(
    () => ({
      session,
      login: () =>
        setSession({
          displayName: "Demo Admin",
          role: "ADMIN"
        }),
      logout: () => setSession(null)
    }),
    [session]
  );

  return (
    <DemoAuthContext.Provider value={value}>
      {children}
    </DemoAuthContext.Provider>
  );
}

export function useDemoAuth(): DemoAuthContextValue {
  const context = useContext(DemoAuthContext);

  if (!context) {
    throw new Error("useDemoAuth must be used inside DemoAuthProvider");
  }

  return context;
}
