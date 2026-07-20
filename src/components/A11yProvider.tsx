"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_A11Y,
  applyA11ySettings,
  readA11ySettings,
  saveA11ySettings,
  type A11ySettings,
} from "@/lib/a11y";

type A11yContextValue = {
  settings: A11ySettings;
  setSettings: (next: A11ySettings | ((prev: A11ySettings) => A11ySettings)) => void;
  update: <K extends keyof A11ySettings>(key: K, value: A11ySettings[K]) => void;
  reset: () => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
};

const A11yContext = createContext<A11yContextValue | null>(null);

export function A11yProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<A11ySettings>(DEFAULT_A11Y);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initial = readA11ySettings();
    setSettingsState(initial);
    applyA11ySettings(initial);
    setHydrated(true);
  }, []);

  const setSettings = useCallback(
    (next: A11ySettings | ((prev: A11ySettings) => A11ySettings)) => {
      setSettingsState((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        saveA11ySettings(resolved);
        return resolved;
      });
    },
    [],
  );

  const update = useCallback(
    <K extends keyof A11ySettings>(key: K, value: A11ySettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [setSettings],
  );

  const reset = useCallback(() => {
    setSettings({ ...DEFAULT_A11Y });
  }, [setSettings]);

  const value = useMemo(
    () => ({
      settings: hydrated ? settings : DEFAULT_A11Y,
      setSettings,
      update,
      reset,
      panelOpen,
      setPanelOpen,
    }),
    [hydrated, settings, setSettings, update, reset, panelOpen],
  );

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export function useA11y() {
  const ctx = useContext(A11yContext);
  if (!ctx) {
    throw new Error("useA11y must be used within A11yProvider");
  }
  return ctx;
}
