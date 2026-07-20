"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "canuto-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type NavigatorWithInstallDetection = Navigator & {
  standalone?: boolean;
  getInstalledRelatedApps?: () => Promise<Array<{ platform: string }>>;
};

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function persistDismiss(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // private mode / quota — still hide this session
  }
}

/** True when the current document is running as the installed PWA. */
function isRunningAsInstalledApp(): boolean {
  const nav = navigator as NavigatorWithInstallDetection;
  if (nav.standalone) return true;

  return window.matchMedia(
    "(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui), (display-mode: window-controls-overlay)",
  ).matches;
}

/**
 * True if Canuto is already installed (even when browsing in a normal tab).
 * Relies on related_applications in the web manifest + getInstalledRelatedApps.
 */
async function isAppAlreadyInstalled(): Promise<boolean> {
  if (isRunningAsInstalledApp()) return true;

  const nav = navigator as NavigatorWithInstallDetection;
  if (typeof nav.getInstalledRelatedApps !== "function") return false;

  try {
    const related = await nav.getInstalledRelatedApps();
    return related.length > 0;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (wasDismissed()) return;
      if (await isAppAlreadyInstalled()) return;
      if (cancelled) return;

      const onBeforeInstall = (e: Event) => {
        if (wasDismissed() || isRunningAsInstalledApp()) return;
        e.preventDefault();
        setDeferred(e as BeforeInstallPromptEvent);
        setHidden(false);
      };

      const onInstalled = () => {
        setDeferred(null);
        setHidden(true);
      };

      window.addEventListener("beforeinstallprompt", onBeforeInstall);
      window.addEventListener("appinstalled", onInstalled);

      return () => {
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    let teardown: (() => void) | undefined;
    void setup().then((cleanup) => {
      if (cancelled) {
        cleanup?.();
        return;
      }
      teardown = cleanup;
    });

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  function dismissForever() {
    persistDismiss();
    setDeferred(null);
    setHidden(true);
  }

  if (hidden || !deferred) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar Canuto"
      className="fixed bottom-4 left-3 right-3 z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-full bg-[var(--ink)] px-4 py-2.5 text-[var(--on-ink)]"
      data-a11y-hide-simple
    >
      <p className="text-[13px] font-bold">¿Instalar?</p>
      <div className="flex gap-3 text-[13px] font-bold">
        <button type="button" className="opacity-70" onClick={dismissForever}>
          No
        </button>
        <button
          type="button"
          onClick={async () => {
            await deferred.prompt();
            const { outcome } = await deferred.userChoice;
            setDeferred(null);
            // Si cancela el diálogo nativo, el banner puede volver cuando el browser lo permita
            setHidden(outcome === "accepted");
          }}
        >
          Sí
        </button>
      </div>
    </div>
  );
}
