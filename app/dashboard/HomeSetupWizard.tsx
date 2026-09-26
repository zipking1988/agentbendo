"use client";

import { HomeFloorModel } from "@/app/dashboard/HomeFloorModel";
import {
  FloorPlanAnalysisRequestGuard,
  floorPlanRoomsFromResponse,
  type FloorPlanAnalysisRequest,
} from "@/lib/home-setup-analysis";
import {
  DEMO_FLOOR_PLAN_URL,
  hasAllRequiredRooms,
  isAllowedFloorPlanFile,
  pointInBBox,
  readImageAsDataUrl,
  type HomeSetup,
  type RoomRegion,
  type WifiPin,
} from "@/lib/home-setup";
import IconArrowLeft from "@tabler/icons-react/dist/esm/icons/IconArrowLeft.mjs";
import IconCheck from "@tabler/icons-react/dist/esm/icons/IconCheck.mjs";
import IconHome from "@tabler/icons-react/dist/esm/icons/IconHome.mjs";
import IconPhoto from "@tabler/icons-react/dist/esm/icons/IconPhoto.mjs";
import IconRoute from "@tabler/icons-react/dist/esm/icons/IconRoute.mjs";
import IconShieldLock from "@tabler/icons-react/dist/esm/icons/IconShieldLock.mjs";
import IconSparkles from "@tabler/icons-react/dist/esm/icons/IconSparkles.mjs";
import IconUpload from "@tabler/icons-react/dist/esm/icons/IconUpload.mjs";
import IconWifi from "@tabler/icons-react/dist/esm/icons/IconWifi.mjs";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Step = "upload" | "analyzing" | "review" | "wifi";

type HomeSetupWizardProps = {
  onComplete: (setup: HomeSetup) => void;
};

const DEMO_WIFI: WifiPin = { x: 58, y: 56 };
const DEMO_ROOMS: RoomRegion[] = [
  { id: "kitchen", label: "Kitchen", bbox: { x: 21, y: 14, w: 21, h: 29 } },
  { id: "bedroom", label: "Bedroom", bbox: { x: 48, y: 14, w: 21, h: 23 } },
  { id: "living", label: "Living room", bbox: { x: 45, y: 43, w: 24, h: 29 } },
  { id: "bathroom", label: "Bathroom", bbox: { x: 69, y: 43, w: 12, h: 24 } },
];

function stepTitle(step: Step): string {
  if (step === "upload") return "Bring the home into view.";
  if (step === "analyzing") return "Understanding the floor plan.";
  if (step === "review") return "The home is ready to review.";
  return "Place the Wi‑Fi router.";
}

function stepLead(step: Step): string {
  if (step === "upload") {
    return "Add a floor-plan image so care updates can use familiar room names. The finished setup is saved in this browser.";
  }
  if (step === "analyzing") {
    return "The configured room-analysis provider is identifying the main rooms used in the care story. Your original image remains unchanged.";
  }
  if (step === "review") {
    return "Check the source image and the rooms we found, then place the router that anchors the demo.";
  }
  return "Mark the router’s real position. This gives the demo a clear sensing origin without adding a camera.";
}

function setupStep(step: Step): number {
  if (step === "upload" || step === "analyzing") return 1;
  if (step === "review") return 2;
  return 3;
}

async function buildRoomModel(imageDataUrl: string, signal: AbortSignal): Promise<RoomRegion[]> {
  const response = await fetch("/api/floor-plan/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl }),
    signal,
  });
  return floorPlanRoomsFromResponse(await response.json(), response.ok);
}

export function HomeSetupWizard({ onComplete }: HomeSetupWizardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const analysisGuard = useMemo(() => new FloorPlanAnalysisRequestGuard(), []);
  const [step, setStep] = useState<Step>("wifi");
  const [imageUrl, setImageUrl] = useState<string | null>(DEMO_FLOOR_PLAN_URL);
  const [fileName, setFileName] = useState("Japanese demo home");
  const [rooms, setRooms] = useState<RoomRegion[]>(DEMO_ROOMS);
  const [wifi, setWifi] = useState<WifiPin | null>(DEMO_WIFI);
  const [error, setError] = useState<string | null>(null);
  const [draggingFile, setDraggingFile] = useState(false);

  const roomsReady = hasAllRequiredRooms(rooms);
  const usingDemoHome = imageUrl === DEMO_FLOOR_PLAN_URL;

  useEffect(() => {
    return () => analysisGuard.cancel();
  }, [analysisGuard]);

  const restoreDemoHome = () => {
    analysisGuard.cancel();
    setImageUrl(DEMO_FLOOR_PLAN_URL);
    setFileName("Japanese demo home");
    setRooms(DEMO_ROOMS);
    setWifi(DEMO_WIFI);
    setError(null);
    setDraggingFile(false);
    setStep("wifi");
  };

  const runAnalyze = async (dataUrl: string, request: FloorPlanAnalysisRequest) => {
    setStep("analyzing");
    setError(null);
    setRooms([]);
    setWifi(null);
    try {
      const nextRooms = await buildRoomModel(dataUrl, request.controller.signal);
      if (!analysisGuard.canApply(request)) return;
      setRooms(nextRooms);
      setStep("review");
    } catch (err) {
      if (!analysisGuard.canApply(request)) return;
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setStep("upload");
    } finally {
      analysisGuard.finish(request);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (!isAllowedFloorPlanFile(file)) {
      analysisGuard.cancel();
      setError("Use an image under 4.5MB (PNG, JPG, or WebP).");
      return;
    }

    const request = analysisGuard.begin();
    try {
      const dataUrl = await readImageAsDataUrl(file);
      if (!analysisGuard.canApply(request)) return;
      setImageUrl(dataUrl);
      setFileName(file.name);
      await runAnalyze(dataUrl, request);
    } catch {
      if (!analysisGuard.canApply(request)) return;
      setError("Could not read that image. Try another file.");
      setStep("upload");
      analysisGuard.finish(request);
    }
  };

  const finish = () => {
    if (!imageUrl || !wifi || !roomsReady) return;
    onComplete({
      floorPlanDataUrl: imageUrl,
      fileName,
      wifi,
      rooms,
      savedAt: new Date().toISOString(),
    });
  };

  const routerRoom = wifi
    ? rooms.find((room) => pointInBBox(wifi, room.bbox))
    : null;
  const routerPosition = wifi
    ? `${routerRoom?.label ?? "Unlabeled area"} · ${Math.round(wifi.x)}% from left, ${Math.round(wifi.y)}% from top`
    : null;
  const currentStep = setupStep(step);
  const panelTitle = step === "upload"
    ? "Choose a floor plan"
    : step === "analyzing"
      ? "Reading your floor plan"
      : step === "review"
        ? "Review the room model"
        : "Confirm the sensing point";

  return (
    <section className="setup-shell">
      <div className="setup-copy">
        <Link className="dashboard-back" href="/">
          <IconArrowLeft size={16} />
          Back to site
        </Link>

        <p className="eyebrow"><span /> PRIVATE HOME SETUP</p>
        <h1>{stepTitle(step)}</h1>
        <p className="dashboard-lead">{stepLead(step)}</p>

        <ol className="setup-steps" aria-label="Setup progress">
          <li className={currentStep === 1 ? "active" : currentStep > 1 ? "complete" : ""} aria-current={currentStep === 1 ? "step" : undefined}>
            <span className="setup-step-num">{currentStep > 1 ? <IconCheck size={14} /> : "01"}</span>
            <span>
              <strong>Add the home</strong>
              <small>Use the sample or upload a plan</small>
            </span>
          </li>
          <li className={currentStep === 2 ? "active" : currentStep > 2 ? "complete" : ""} aria-current={currentStep === 2 ? "step" : undefined}>
            <span className="setup-step-num">{currentStep > 2 ? <IconCheck size={14} /> : "02"}</span>
            <span>
              <strong>Confirm the rooms</strong>
              <small>Rooms identified in the background</small>
            </span>
          </li>
          <li className={currentStep === 3 ? "active" : ""} aria-current={currentStep === 3 ? "step" : undefined}>
            <span className="setup-step-num">03</span>
            <span>
              <strong>Place the router</strong>
              <small>Start the interactive family demo</small>
            </span>
          </li>
        </ol>

        <div className="setup-assurance" aria-label="Privacy information">
          <IconShieldLock size={19} stroke={1.7} />
          <p>
            <strong>Private by design</strong>
            <span>No cameras, microphones or recordings. The saved setup stays in this browser after room analysis.</span>
          </p>
        </div>
      </div>

      <div className="setup-panel">
        <div className="setup-panel-head">
          <div>
            <span>STEP {currentStep} OF 3</span>
            <h2>{panelTitle}</h2>
          </div>
          <span className="setup-panel-status">
            <span aria-hidden="true" />
            Interactive demo
          </span>
        </div>

        {step === "upload" ? (
          <div
            className={`setup-dropzone ${draggingFile ? "dragging" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDraggingFile(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDraggingFile(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDraggingFile(false);
              void handleFile(event.dataTransfer.files?.[0]);
            }}
          >
            <span className="setup-dropzone-icon"><IconPhoto size={28} stroke={1.6} /></span>
            <h3>Use your own floor plan</h3>
            <p>Drop a PNG, JPG or WebP here, or choose an image from your device. Maximum 4.5 MB.</p>
            <button
              type="button"
              className="play-button dashboard-play"
              onClick={() => inputRef.current?.click()}
            >
              <IconUpload size={18} stroke={2} />
              Choose image
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            {error ? <p className="setup-error" role="alert">{error}</p> : null}
            <div className="setup-demo-option">
              <span>Want to explore first?</span>
              <button type="button" className="dashboard-ghost setup-demo-return" onClick={restoreDemoHome}>
                <IconHome size={17} stroke={1.8} />
                Use demo home
              </button>
            </div>
          </div>
        ) : null}

        {step === "analyzing" && imageUrl ? (
          <div className="setup-pin-stage">
            <div className="setup-analyzing" role="status" aria-live="polite">
              <IconSparkles size={22} stroke={1.7} />
              <p>
                <strong>Finding the essential rooms…</strong>
                <span>Living room, kitchen, bedroom and bathroom</span>
              </p>
            </div>
            <div className="setup-plan-frame">
              <p className="setup-plan-label">Your uploaded floor plan</p>
              <HomeFloorModel imageUrl={imageUrl} wifi={null} label="Reading your floor plan upload" />
            </div>
            <button type="button" className="dashboard-ghost setup-demo-return" onClick={restoreDemoHome}>
              <IconHome size={17} stroke={1.8} />
              Use demo home
            </button>
          </div>
        ) : null}

        {step === "review" && imageUrl ? (
          <div className="setup-pin-stage">
            <div className="setup-plan-frame">
              <div className="setup-plan-heading">
                <p className="setup-plan-label">Your uploaded floor plan</p>
                <span><IconCheck size={14} /> 4 rooms found</span>
              </div>
              <HomeFloorModel imageUrl={imageUrl} wifi={null} rooms={rooms} label="Your floor plan" />
            </div>

            <div className="setup-room-summary" aria-label="Identified rooms">
              {rooms.map((room) => (
                <span key={room.id}><IconCheck size={13} /> {room.label}</span>
              ))}
            </div>

            <div className="setup-pin-actions">
              <button
                type="button"
                className="dashboard-ghost"
                onClick={() => {
                  setStep("upload");
                  setRooms([]);
                  setWifi(null);
                  setImageUrl(null);
                }}
              >
                Re-upload
              </button>
              <button type="button" className="dashboard-ghost" onClick={restoreDemoHome}>
                <IconHome size={17} stroke={1.8} />
                Use demo home
              </button>
              <button
                type="button"
                className="play-button dashboard-play"
                disabled={!roomsReady}
                onClick={() => setStep("wifi")}
              >
                <IconSparkles size={18} stroke={2} />
                Continue to router
              </button>
            </div>

            <p className="setup-pin-note">Room regions stay behind the image and only guide the demo.</p>
          </div>
        ) : null}

        {step === "wifi" && imageUrl ? (
          <div className="setup-pin-stage">
            <div className="setup-plan-frame">
              <div className="setup-plan-heading">
                <p className="setup-plan-label">
                  {usingDemoHome ? "Sample floor plan" : "Your uploaded floor plan"}
                </p>
                <span><IconCheck size={14} /> Rooms ready</span>
              </div>
              <HomeFloorModel
                imageUrl={imageUrl}
                wifi={wifi}
                rooms={rooms}
                interactive
                onPin={setWifi}
                label="Place Wi‑Fi on your floor plan"
              />
            </div>

            <div className={`setup-router-readout ${wifi ? "ready" : ""}`} role="status" aria-live="polite">
              <IconRoute size={20} stroke={1.7} />
              <p>
                <strong>{wifi ? routerRoom?.label ?? "Router placed" : "Router position needed"}</strong>
                <span>{wifi ? routerPosition : "Click the plan, then use arrow keys for precise placement."}</span>
              </p>
            </div>

            <div className="setup-pin-actions">
              <button
                type="button"
                className="dashboard-ghost"
                onClick={() => {
                  setStep("upload");
                  setRooms([]);
                  setWifi(null);
                  setImageUrl(null);
                  setFileName("");
                }}
              >
                Use my own plan
              </button>
              {!usingDemoHome ? (
                <button type="button" className="dashboard-ghost" onClick={restoreDemoHome}>
                  <IconHome size={17} stroke={1.8} />
                  Use demo home
                </button>
              ) : null}
              <button
                type="button"
                className="play-button dashboard-play"
                disabled={!wifi}
                onClick={finish}
              >
                <IconWifi size={18} stroke={2} />
                Start demo
              </button>
            </div>

            {!wifi ? (
              <p className="setup-pin-note">
                Select the map and press Enter to place the router. Arrow keys move it; hold Shift for larger steps.
              </p>
            ) : (
              <p className="setup-pin-note ok">
                Ready to start. The family dashboard will use this plan and router position.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
