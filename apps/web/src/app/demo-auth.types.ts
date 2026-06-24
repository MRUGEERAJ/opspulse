export type DemoSession = {
  displayName: string;
  role: "ADMIN" | "MANAGER";
};

export type DemoAuthContextValue = {
  session: DemoSession | null;
  login: () => void;
  logout: () => void;
};
