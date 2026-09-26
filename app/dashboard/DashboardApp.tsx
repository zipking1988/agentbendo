"use client";

import { FamilyBoard } from "@/app/dashboard/FamilyBoard";
import { HomeSetupWizard } from "@/app/dashboard/HomeSetupWizard";
import {
  clearHomeSetup,
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

function publishSetup(next: HomeSetup | null) {
  cachedSetup = next;
  if (next) saveHomeSetup(next);
  else clearHomeSetup();
  for (const listener of listeners) listener();
}

type DashboardAppProps = {
  autoStart?: boolean;
};

export function DashboardApp({ autoStart = false }: DashboardAppProps) {
  const setup = useSyncExternalStore(subscribe, getClientSetup, getServerSetup);
  const [startFreshDemo, setStartFreshDemo] = useState(autoStart);
  const [chooseFloorPlan, setChooseFloorPlan] = useState(false);

  if (!setup) {
    return (
      <HomeSetupWizard
        initialStep={chooseFloorPlan ? "upload" : "wifi"}
        onComplete={(next) => {
          setChooseFloorPlan(false);
          setStartFreshDemo(true);
          publishSetup(next);
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
        setChooseFloorPlan(true);
        publishSetup(null);
      }}
    />
  );
}
