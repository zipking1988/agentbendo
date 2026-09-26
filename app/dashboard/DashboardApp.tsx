"use client";

import { FamilyBoard } from "@/app/dashboard/FamilyBoard";
import { HomeSetupWizard } from "@/app/dashboard/HomeSetupWizard";
import {
  clearHomeSetup,
  createDemoHomeSetup,
  loadHomeSetup,
  saveHomeSetup,
  type HomeSetup,
} from "@/lib/home-setup";
import { useState, useSyncExternalStore } from "react";

let cachedSetup: HomeSetup | null | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getClientSetup(): HomeSetup | null {
  if (cachedSetup === undefined) {
    cachedSetup = loadHomeSetup();
  }
  return cachedSetup;
}

function getServerSetup(): HomeSetup | null {
  return null;
}

function publishSetup(next: HomeSetup | null): string | null {
  if (next && !saveHomeSetup(next)) {
    return "Could not save the demo setup in this browser. Check browser storage permissions, then try again.";
  }
  if (!next) clearHomeSetup();
  cachedSetup = next;
  for (const listener of listeners) listener();
  return null;
}

type DashboardAppProps = {
  autoStart?: boolean;
};

export function DashboardApp({ autoStart = false }: DashboardAppProps) {
  const storedSetup = useSyncExternalStore(subscribe, getClientSetup, getServerSetup);
  const [demoSetup, setDemoSetup] = useState<HomeSetup | null>(() => (
    autoStart ? createDemoHomeSetup() : null
  ));
  const [startFreshDemo, setStartFreshDemo] = useState(autoStart);
  const setup = storedSetup ?? demoSetup;

  // Keep the automatic sample fallback in memory. Persisting it during hydration
  // can replace a saved home before useSyncExternalStore reads localStorage.

  if (!setup) {
    return (
      <HomeSetupWizard
        onComplete={(next) => {
          const error = publishSetup(next);
          if (!error) {
            setStartFreshDemo(true);
          }
          return error;
        }}
      />
    );
  }

  return (
    <FamilyBoard
      homeSetup={setup}
      autoStart={startFreshDemo}
      onResetSetup={() => {
        setStartFreshDemo(false);
        setDemoSetup(null);
        publishSetup(null);
      }}
    />
  );
}
