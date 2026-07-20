"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (hidden || !deferred) return null;

  return (
    <div className="fixed bottom-4 left-3 right-3 z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-full bg-[var(--ink)] px-4 py-2.5 text-white">
      <p className="text-[13px] font-bold">¿Instalar?</p>
      <div className="flex gap-3 text-[13px] font-bold">
        <button type="button" className="opacity-70" onClick={() => setHidden(true)}>
          No
        </button>
        <button
          type="button"
          onClick={async () => {
            await deferred.prompt();
            setHidden(true);
          }}
        >
          Sí
        </button>
      </div>
    </div>
  );
}
