import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMe, login as loginRequest, signup as signupRequest } from "../api/sope";
import type { MeResponse } from "../api/types";
import { clearAccessToken, readAccessToken, writeAccessToken } from "../session";

type AuthContextValue = {
  ready: boolean;
  token: string | undefined;
  me: MeResponse | undefined;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  reload: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [me, setMe] = useState<MeResponse | undefined>(undefined);

  async function loadProfile(nextToken: string): Promise<void> {
    const profile = await getMe(nextToken);
    setToken(nextToken);
    setMe(profile);
  }

  useEffect(() => {
    void readAccessToken()
      .then(async (stored) => {
        if (stored === undefined) {
          return;
        }
        try {
          await loadProfile(stored);
        } catch {
          await clearAccessToken();
          setToken(undefined);
          setMe(undefined);
        }
      })
      .finally(() => {
        setReady(true);
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      token,
      me,
      login: async (email, password) => {
        const nextToken = await loginRequest(email, password);
        await writeAccessToken(nextToken);
        await loadProfile(nextToken);
      },
      signup: async (email, password) => {
        await signupRequest(email, password);
        const nextToken = await loginRequest(email, password);
        await writeAccessToken(nextToken);
        await loadProfile(nextToken);
      },
      logout: () => {
        void clearAccessToken();
        setToken(undefined);
        setMe(undefined);
      },
      reload: async () => {
        if (token === undefined) {
          return;
        }
        await loadProfile(token);
      },
    }),
    [ready, token, me],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
