import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
  useState
} from "react";

type DemoSession = {
  displayName: string;
  role: "ADMIN" | "MANAGER";
};

type DemoAuthContextValue = {
  session: DemoSession | null;
  login: () => void;
  logout: () => void;
};

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
