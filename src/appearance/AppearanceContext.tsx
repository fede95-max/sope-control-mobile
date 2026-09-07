import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_BACKGROUND_COLOR } from "./constants";
import { clearStoredBackgroundColor, readStoredBackgroundColor, writeStoredBackgroundColor } from "./storage";

type AppearanceContextValue = {
  ready: boolean;
  backgroundColor: string;
  setBackgroundColor: (color: string) => Promise<void>;
  resetBackgroundColor: () => Promise<void>;
};

const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [backgroundColor, setBackgroundColorState] = useState(DEFAULT_BACKGROUND_COLOR);

  useEffect(() => {
    void readStoredBackgroundColor()
      .then((stored) => {
        setBackgroundColorState(stored ?? DEFAULT_BACKGROUND_COLOR);
      })
      .finally(() => {
        setReady(true);
      });
  }, []);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      ready,
      backgroundColor,
      setBackgroundColor: async (color: string) => {
        await writeStoredBackgroundColor(color);
        setBackgroundColorState(color.toLowerCase());
      },
      resetBackgroundColor: async () => {
        await clearStoredBackgroundColor();
        setBackgroundColorState(DEFAULT_BACKGROUND_COLOR);
      },
    }),
    [ready, backgroundColor],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const value = useContext(AppearanceContext);
  if (value === undefined) {
    throw new Error("useAppearance must be used within AppearanceProvider");
  }
  return value;
}
