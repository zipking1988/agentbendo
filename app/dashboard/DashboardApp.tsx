"use client";

import { FamilyBoard } from "@/app/dashboard/FamilyBoard";
import { HomeSetupWizard } from "@/app/dashboard/HomeSetupWizard";
import {
  clearHomeSetup,
  loadHomeSetup,
  saveHomeSetup,
  type HomeSetup,
} from "@/lib/home-setup";
import { useSyncExternalStore } from "react";

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

function publishSetup(next: HomeSetup | null) {
  cachedSetup = next;
  if (next) saveHomeSetup(next);
  else clearHomeSetup();
  for (const listener of listeners) listener();
}

export function DashboardApp() {
  const setup = useSyncExternalStore(subscribe, getClientSetup, getServerSetup);

  if (!setup) {
    return (
      <HomeSetupWizard
        onComplete={(next) => {
          publishSetup(next);
        }}
      />
    );
  }

  return (
    <FamilyBoard
      homeSetup={setup}
      onResetSetup={() => {
        publishSetup(null);
      }}
    />
  );
}
