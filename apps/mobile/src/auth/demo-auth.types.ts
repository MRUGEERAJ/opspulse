export type DemoAuthContextValue = {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
};
