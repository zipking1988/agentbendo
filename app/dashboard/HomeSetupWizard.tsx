"use client";

import { HomeFloorModel } from "@/app/dashboard/HomeFloorModel";
import {
  hasAllRequiredRooms,
  isAllowedFloorPlanFile,
  readImageAsDataUrl,
  type HomeSetup,
  type RoomRegion,
  type WifiPin,
} from "@/lib/home-setup";
import IconArrowLeft from "@tabler/icons-react/dist/esm/icons/IconArrowLeft.mjs";
import IconPhoto from "@tabler/icons-react/dist/esm/icons/IconPhoto.mjs";
import IconSparkles from "@tabler/icons-react/dist/esm/icons/IconSparkles.mjs";
import IconUpload from "@tabler/icons-react/dist/esm/icons/IconUpload.mjs";
import IconWifi from "@tabler/icons-react/dist/esm/icons/IconWifi.mjs";
import Link from "next/link";
import { useRef, useState } from "react";

type Step = "upload" | "analyzing" | "review" | "wifi";

type HomeSetupWizardProps = {
  onComplete: (setup: HomeSetup) => void;
};

function stepTitle(step: Step): string {
  if (step === "upload") return "Show us the home.";
  if (step === "analyzing") return "Building the room model.";
  if (step === "review") return "Room model ready.";
  return "Place the Wi‑Fi.";
}

function stepLead(step: Step): string {
  if (step === "upload") {
    return "Upload your floor-plan photo. We keep your picture as the map and build a quiet room model underneath so Grandpa’s story matches real rooms.";
  }
  if (step === "analyzing") {
    return "StepFun is finding living, kitchen, bedroom, and bathroom on your plan.";
  }
  if (step === "review") {
    return "Your photo is the map. Room boxes stay in the background for Grandpa’s story — nothing drawn on top. Re-upload if something feels wrong.";
  }
  return "Click or drag on your plan to place the router. That pin is the sensing origin — not a camera.";
}

async function buildRoomModel(imageDataUrl: string): Promise<RoomRegion[]> {
  const response = await fetch("/api/floor-plan/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl }),
  });
  const payload = (await response.json()) as {
    rooms?: RoomRegion[];
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || "Could not build a room model from that floor plan.");
  }
  if (!payload.rooms || !hasAllRequiredRooms(payload.rooms)) {
    throw new Error("Room model did not include all required rooms.");
  }
  return payload.rooms;
}

export function HomeSetupWizard({ onComplete }: HomeSetupWizardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [rooms, setRooms] = useState<RoomRegion[]>([]);
  const [wifi, setWifi] = useState<WifiPin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draggingFile, setDraggingFile] = useState(false);

  const roomsReady = hasAllRequiredRooms(rooms);

  const runAnalyze = async (dataUrl: string) => {
    setStep("analyzing");
    setError(null);
    setRooms([]);
    setWifi(null);
    try {
      const nextRooms = await buildRoomModel(dataUrl);
      setRooms(nextRooms);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setStep("upload");
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (!isAllowedFloorPlanFile(file)) {
      setError("Use an image under 4.5MB (PNG, JPG, or WebP).");
      return;
    }

    try {
      const dataUrl = await readImageAsDataUrl(file);
      setImageUrl(dataUrl);
      setFileName(file.name);
      await runAnalyze(dataUrl);
    } catch {
      setError("Could not read that image. Try another file.");
      setStep("upload");
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

  return (
    <section className="setup-shell">
      <div className="setup-copy">
        <Link className="dashboard-back" href="/">
          <IconArrowLeft size={16} />
          Back to the story
        </Link>

        <p className="eyebrow"><span /> HOME SETUP</p>
        <h1>{stepTitle(step)}</h1>
        <p className="dashboard-lead">{stepLead(step)}</p>

        <ol className="setup-steps" aria-label="Setup progress">
          <li className={step === "upload" ? "active" : step === "analyzing" ? "active" : "complete"}>
            <span className="setup-step-num">01</span>
            <span>
              <strong>Floor plan photo</strong>
              <small>Your upload is the visual map</small>
            </span>
          </li>
          <li
            className={
              step === "analyzing" || step === "review"
                ? "active"
                : step === "wifi" || roomsReady
                  ? "complete"
                  : ""
            }
          >
            <span className="setup-step-num">02</span>
            <span>
              <strong>Room model</strong>
              <small>Colored regions on your photo</small>
            </span>
          </li>
          <li className={step === "wifi" ? "active" : ""}>
            <span className="setup-step-num">03</span>
            <span>
              <strong>Wi‑Fi point</strong>
              <small>Click or drag to place</small>
            </span>
          </li>
          <li>
            <span className="setup-step-num">04</span>
            <span>
              <strong>Watch Grandpa</strong>
              <small>Story maps into room regions</small>
            </span>
          </li>
        </ol>
      </div>

      <aside className="setup-panel">
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
            <IconPhoto size={28} stroke={1.6} />
            <h2>Drop a floor plan</h2>
            <p>Hand-drawn, scanned, or a clean Japanese madori layout.</p>
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
              accept="image/png,image/jpeg,image/webp,image/gif"
              hidden
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            {error ? <p className="setup-error">{error}</p> : null}
          </div>
        ) : null}

        {step === "analyzing" && imageUrl ? (
          <div className="setup-pin-stage">
            <div className="setup-analyzing" role="status" aria-live="polite">
              <IconSparkles size={22} stroke={1.7} />
              <strong>Building 2D room model…</strong>
              <span>Finding living, kitchen, bedroom, bathroom on your plan</span>
            </div>
            <HomeFloorModel
              imageUrl={imageUrl}
              wifi={null}
              label="Reading your floor plan upload"
            />
          </div>
        ) : null}

        {step === "review" && imageUrl ? (
          <div className="setup-pin-stage">
            <HomeFloorModel
              imageUrl={imageUrl}
              wifi={null}
              rooms={rooms}
              label="Your floor plan"
            />

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
              <button
                type="button"
                className="play-button dashboard-play"
                disabled={!roomsReady}
                onClick={() => setStep("wifi")}
              >
                <IconSparkles size={18} stroke={2} />
                Looks good — place Wi‑Fi
              </button>
            </div>

            <p className="setup-pin-note ok">
              Your photo · room model stays invisible
            </p>
          </div>
        ) : null}

        {step === "wifi" && imageUrl ? (
          <div className="setup-pin-stage">
            <HomeFloorModel
              imageUrl={imageUrl}
              wifi={wifi}
              rooms={rooms}
              interactive
              onPin={setWifi}
              label="Place Wi‑Fi on your floor plan"
            />

            <div className="setup-pin-actions">
              <button
                type="button"
                className="dashboard-ghost"
                onClick={() => setStep("review")}
              >
                Back to rooms
              </button>
              <button
                type="button"
                className="play-button dashboard-play"
                disabled={!wifi}
                onClick={finish}
              >
                <IconWifi size={18} stroke={2} />
                Start monitoring
              </button>
            </div>

            {!wifi ? (
              <p className="setup-pin-note">
                Click anywhere on the plan — or drag the Wi‑Fi marker — to set the router.
              </p>
            ) : (
              <p className="setup-pin-note ok">Router pinned · drag again anytime to move it</p>
            )}
          </div>
        ) : null}
      </aside>
    </section>
  );
}
