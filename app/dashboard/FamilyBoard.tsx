"use client";

import { HomeFloorModel } from "@/app/dashboard/HomeFloorModel";
import { ServiceStatusPanel } from "@/app/dashboard/ServiceStatusPanel";
import { StatusHero } from "@/app/dashboard/StatusHero";
import {
  activityLabel,
  demoCareJourneyProgress,
  demoCareJourneyStage,
  demoCarePresentation,
  demoCareStageAt,
  frameAt,
  loadDemoFrames,
  latestCheckInNote,
  logsUpTo,
  roomLabel,
  translateLogText,
  translateStatusReason,
  type DemoCareJourneyStage,
  type DemoFramesData,
} from "@/lib/demo-frames";
import { DEMO_FLOOR_PLAN_URL, mapPresence, type HomeSetup } from "@/lib/home-setup";
import IconChevronRight from "@tabler/icons-react/dist/esm/icons/IconChevronRight.mjs";
import IconShieldCheck from "@tabler/icons-react/dist/esm/icons/IconShieldCheck.mjs";
import IconUpload from "@tabler/icons-react/dist/esm/icons/IconUpload.mjs";
import dynamic from "next/dynamic";
import { useEffect, useEffectEvent, useRef, useState } from "react";

const CsiSignalField = dynamic(
  () => import("./CsiSignalField").then((m) => m.CsiSignalField),
  {
    ssr: false,
    loading: () => (
      <div className="csi-field-loading" aria-hidden>
        Loading CSI field…
      </div>
    ),
  },
);

type Mode = "calm" | "replay";

const IDLE_T = 149.9;

const CARE_JOURNEY: ReadonlyArray<{
  stage: DemoCareJourneyStage;
  label: string;
  description: string;
}> = [
  {
    stage: "checking_stillness",
    label: "Routine went quiet",
    description: "Wi-Fi noticed a change in movement patterns.",
  },
  {
    stage: "arranging_check_in",
    label: "Check-in requested",
    description: "Agent Bento arranged a friendly human visit.",
  },
  {
    stage: "resident_responding",
    label: "Resident responding",
    description: "Movement returned while confirmation was pending.",
  },
  {
    stage: "check_in_complete",
    label: "All clear",
    description: "The check-in was confirmed and routine resumed.",
  },
];

const CARE_JOURNEY_STAGES = CARE_JOURNEY.map((item) => item.stage);

function formatReplayTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

type FamilyBoardProps = {
  homeSetup: HomeSetup;
  onResetSetup: () => void;
};

export function FamilyBoard({ homeSetup, onResetSetup }: FamilyBoardProps) {
  const [data, setData] = useState<DemoFramesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("calm");
  const [playing, setPlaying] = useState(false);
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [t, setT] = useState(IDLE_T);

  const tRef = useRef(IDLE_T);
  const lastStampRef = useRef<number | null>(null);
  const lastUiRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    loadDemoFrames()
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load simulation");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onFrame = useEffectEvent((now: number): boolean => {
    if (!data) return false;

    const last = lastStampRef.current ?? now;
    const delta = Math.min(0.08, (now - last) / 1000);
    lastStampRef.current = now;

    const next = tRef.current + delta;
    const end = data.meta.duration;

    if (next >= end) {
      setPlaying(false);
      setMode("calm");
      tRef.current = IDLE_T;
      setT(IDLE_T);
      return false;
    }

    tRef.current = next;
    if (now - lastUiRef.current >= 80) {
      lastUiRef.current = now;
      setT(next);
    }
    return true;
  });

  useEffect(() => {
    if (!playing) {
      lastStampRef.current = null;
      return;
    }

    let raf = 0;
    const loop = (now: number) => {
      if (onFrame(now)) {
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const handlePlay = () => {
    if (!data) return;
    if (mode === "calm") {
      tRef.current = 0;
      setT(0);
      setMode("replay");
    }
    setPlaying(true);
  };

  const handlePause = () => {
    setPlaying(false);
  };

  const handleRestart = () => {
    tRef.current = 0;
    setT(0);
    setMode("replay");
    setPlaying(true);
  };

  const jumpToScene = (start: number) => {
    if (!data) return;
    const target = start;
    tRef.current = target;
    setT(target);
    setMode("replay");
  };

  if (error) {
    return (
      <section className="dashboard-shell">
        <p className="dashboard-lead">Could not load the care story. {error}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="dashboard-shell dashboard-loading">
        <p className="dashboard-lead">Loading simulated care feed…</p>
      </section>
    );
  }

  const viewT = mode === "calm" ? IDLE_T : t;
  const frame = frameAt(data.frames, viewT);
  const presence = mapPresence(
    {
      room: frame.room,
      x: frame.x,
      y: frame.y,
      posture: frame.posture,
    },
    homeSetup.rooms,
    data.meta.rooms,
  );
  const logs = logsUpTo(data.meta.bendoLog, mode === "calm" ? data.meta.duration : viewT);
  const motionPct = Math.round(Math.max(0, Math.min(1, frame.motionLevel)) * 100);
  const stillSeconds = Math.max(0, Math.round(frame.stillDuration));
  const statusReason = translateStatusReason(frame.statusReason);
  const stage = demoCareStageAt(viewT, data.meta.careTimeline);
  const presentation = demoCarePresentation(stage);
  const status = presentation.tone;
  const displayedActivity = stage === "resident_responding"
    ? "Responding to the courier"
    : stage === "check_in_complete"
      ? "Check-in confirmed"
      : activityLabel(frame.activity);
  const mapSource = homeSetup.floorPlanDataUrl === DEMO_FLOOR_PLAN_URL
    ? "Sample floor plan"
    : "Your uploaded floor plan";
  const stageIndex = data.meta.careTimeline.findIndex((item) => item.stage === stage);
  const activeJourneyStage = demoCareJourneyStage(stage);
  const journeyProgress = demoCareJourneyProgress(
    viewT,
    data.meta.careTimeline,
    CARE_JOURNEY_STAGES,
  );
  const latestNote = latestCheckInNote(logs, data.meta.careTimeline);

  return (
    <section className={`dashboard-shell family-board mode-${mode} status-${status}`}>
      <div className="dashboard-status">
        <StatusHero
          stage={stage}
          currentRoom={roomLabel(presence.room)}
          currentActivity={displayedActivity}
          playing={playing}
          mode={mode}
          onPlay={handlePlay}
          onPause={handlePause}
          onRestart={handleRestart}
        />

      </div>

      <aside className="dashboard-map">
        <div className={`monitor-plan status-${status}`}>
          <div className="monitor-plan-toolbar">
            <p className="monitor-plan-kicker">{mapSource.toUpperCase()}</p>
          </div>
          <HomeFloorModel
            imageUrl={homeSetup.floorPlanDataUrl}
            wifi={homeSetup.wifi}
            rooms={homeSetup.rooms}
            presence={presence}
            status={status}
            compactWifi
            label={mapSource}
          />
          <div className="dashboard-latest-note">
            <div className="latest-note-label">
              <strong>Latest check-in note</strong>
              <span>{latestNote ? formatReplayTime(latestNote.t) : "0:00"} replay time</span>
            </div>
            <p role="status" aria-live="polite" aria-atomic="true">
              {latestNote ? translateLogText(latestNote.text) : presentation.lead}
            </p>
            <button type="button" className="reset-floor-btn" onClick={onResetSetup}>
              <IconUpload size={15} stroke={1.9} />
              Change floor plan
            </button>
          </div>
        </div>
      </aside>

      <aside className="dashboard-journey" aria-labelledby="care-journey-heading">
        <p className="dashboard-panel-kicker">TODAY</p>
        <h2 id="care-journey-heading">Care journey</h2>
        <div className="journey-intro-row">
          <p className="journey-intro">A simple story, in replay time.</p>
          <span className="journey-clock" aria-hidden="true">Replay {formatReplayTime(viewT)}</span>
        </div>
        <div className="care-journey-list" role="group" aria-label="Sofa-nap check-in care journey">
          <span className="journey-progress-line" style={{ height: `${journeyProgress * 0.75}%` }} aria-hidden="true" />
          {CARE_JOURNEY.map((item) => {
            const timelineItem = data.meta.careTimeline.find((entry) => entry.stage === item.stage);
            const itemIndex = data.meta.careTimeline.findIndex((entry) => entry.stage === item.stage);
            const active = activeJourneyStage === item.stage;
            const complete = stageIndex > itemIndex;
            return (
              <button
                key={item.stage}
                type="button"
                aria-pressed={active}
                className={`care-journey-item ${active ? "active" : ""} ${complete && !active ? "complete" : ""}`}
                onClick={() => jumpToScene(timelineItem?.start ?? 0)}
              >
                <span className="journey-node" aria-hidden="true" />
                <span className="journey-copy">
                  <span className="journey-time">{formatReplayTime(timelineItem?.start ?? 0)}</span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <details
        className="technical-details"
        open={technicalOpen}
        onToggle={(event) => setTechnicalOpen(event.currentTarget.open)}
      >
        <summary>
          <IconChevronRight size={20} stroke={1.7} aria-hidden="true" />
          <span>Technical demo details</span>
          <small>{technicalOpen ? "Hide details" : "Show details"}</small>
        </summary>
        <div className="technical-details-body">
          <div className="sensing-meters" aria-label="Movement sensing">
            <div className="meter">
              <div className="meter-head"><span>Motion</span><strong>{motionPct}%</strong></div>
              <div className="meter-track"><div className="meter-fill motion" style={{ width: `${motionPct}%` }} /></div>
            </div>
            <div className="meter">
              <div className="meter-head"><span>Stillness</span><strong>{stillSeconds}s</strong></div>
              <div className="meter-track">
                <div className="meter-fill still" style={{ width: `${Math.min(100, (stillSeconds / 510) * 100)}%` }} />
              </div>
            </div>
            {statusReason ? <p className="sensing-reason">{statusReason}</p> : null}
          </div>

          {technicalOpen ? (
            <CsiSignalField
              motionLevel={frame.motionLevel}
              stillDuration={frame.stillDuration}
              anomalyScore={frame.anomalyScore}
              status={status}
              t={viewT}
              presenceX={presence.x}
              presenceY={presence.y}
              wifiX={homeSetup.wifi.x}
              wifiY={homeSetup.wifi.y}
            />
          ) : null}
          <ServiceStatusPanel />
        </div>
      </details>

      <footer className="dashboard-footer">
        <div>
          <strong>AGENT BENTO</strong>
          <span>Privacy-first care for independent living.</span>
        </div>
        <p>
          <IconShieldCheck size={22} stroke={1.7} aria-hidden="true" />
          <span>No cameras. No microphones. No recordings.<br />This is a simulated demo.</span>
        </p>
      </footer>
    </section>
  );
}
