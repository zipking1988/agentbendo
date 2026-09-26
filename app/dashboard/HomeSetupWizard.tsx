"use client";

import { HomeFloorModel } from "@/app/dashboard/HomeFloorModel";
import {
  DEMO_FLOOR_PLAN_URL,
  DEMO_ROOMS,
  DEMO_WIFI,
  createDemoHomeSetup,
  pointInBBox,
  type HomeSetup,
  type WifiPin,
} from "@/lib/home-setup";
import IconArrowLeft from "@tabler/icons-react/dist/esm/icons/IconArrowLeft.mjs";
import IconCheck from "@tabler/icons-react/dist/esm/icons/IconCheck.mjs";
import IconRoute from "@tabler/icons-react/dist/esm/icons/IconRoute.mjs";
import IconShieldLock from "@tabler/icons-react/dist/esm/icons/IconShieldLock.mjs";
import IconWifi from "@tabler/icons-react/dist/esm/icons/IconWifi.mjs";
import Link from "next/link";
import { useState } from "react";

type HomeSetupWizardProps = {
  onComplete: (setup: HomeSetup) => string | null;
};

export function HomeSetupWizard({ onComplete }: HomeSetupWizardProps) {
  const [wifi, setWifi] = useState<WifiPin>(DEMO_WIFI);
  const [error, setError] = useState<string | null>(null);

  const routerRoom = DEMO_ROOMS.find((room) => pointInBBox(wifi, room.bbox));
  const routerPosition = `${routerRoom?.label ?? "Router placed"} · ${Math.round(wifi.x)}% from left, ${Math.round(wifi.y)}% from top`;

  const finish = () => {
    const saveError = onComplete(createDemoHomeSetup(wifi));
    setError(saveError);
  };

  return (
    <section className="setup-shell">
      <div className="setup-copy">
        <Link className="dashboard-back" href="/">
          <IconArrowLeft size={16} aria-hidden="true" />
          Back to site
        </Link>

        <p className="eyebrow"><span /> INTERACTIVE DEMO SETUP</p>
        <h1>Place the Wi‑Fi router.</h1>
        <p className="dashboard-lead">
          Use the sample home to explore the complete family care story. Move the router if you want to change the demo&apos;s sensing origin.
        </p>

        <ol className="setup-steps" aria-label="Demo setup">
          <li className="complete">
            <span className="setup-step-num"><IconCheck size={14} aria-hidden="true" /></span>
            <span>
              <strong>Sample home ready</strong>
              <small>A Japanese floor plan is included</small>
            </span>
          </li>
          <li className="complete">
            <span className="setup-step-num"><IconCheck size={14} aria-hidden="true" /></span>
            <span>
              <strong>Story rooms ready</strong>
              <small>Living room, kitchen, bedroom and bathroom</small>
            </span>
          </li>
          <li className="active" aria-current="step">
            <span className="setup-step-num">03</span>
            <span>
              <strong>Place the router</strong>
              <small>Then start the interactive family demo</small>
            </span>
          </li>
        </ol>

        <div className="setup-assurance" aria-label="Privacy information">
          <IconShieldLock size={19} stroke={1.7} aria-hidden="true" />
          <p>
            <strong>Private by design</strong>
            <span>No cameras, microphones or recordings. This prototype uses a local, scripted care story.</span>
          </p>
        </div>
      </div>

      <div className="setup-panel">
        <div className="setup-panel-head">
          <div>
            <span>DEMO SETUP</span>
            <h2>Confirm the sensing point</h2>
          </div>
          <span className="setup-panel-status">
            <span aria-hidden="true" />
            Interactive demo
          </span>
        </div>

        <div className="setup-pin-stage">
          <div className="setup-plan-frame">
            <div className="setup-plan-heading">
              <p className="setup-plan-label">Sample floor plan</p>
              <span><IconCheck size={14} aria-hidden="true" /> Ready</span>
            </div>
            <HomeFloorModel
              imageUrl={DEMO_FLOOR_PLAN_URL}
              wifi={wifi}
              interactive
              onPin={setWifi}
              label="Place Wi-Fi on the sample floor plan"
            />
          </div>

          <div className="setup-router-readout ready" role="status" aria-live="polite">
            <IconRoute size={20} stroke={1.7} aria-hidden="true" />
            <p>
              <strong>{routerRoom?.label ?? "Router placed"}</strong>
              <span>{routerPosition}</span>
            </p>
          </div>

          <div className="setup-pin-actions">
            <button
              type="button"
              className="dashboard-ghost"
              onClick={() => {
                setWifi(DEMO_WIFI);
                setError(null);
              }}
            >
              Reset router
            </button>
            <button type="button" className="play-button dashboard-play" onClick={finish}>
              <IconWifi size={18} stroke={2} aria-hidden="true" />
              Start demo
            </button>
          </div>

          {error ? <p className="setup-error" role="alert">{error}</p> : null}

          <p className="setup-pin-note ok">
            Click the plan to move the router. Focus the plan and use arrow keys for precise placement; hold Shift for larger steps.
          </p>
        </div>
      </div>
    </section>
  );
}
