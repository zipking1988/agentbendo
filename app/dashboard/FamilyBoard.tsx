"use client";

import { HomeFloorModel } from "@/app/dashboard/HomeFloorModel";
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
import IconAdjustments from "@tabler/icons-react/dist/esm/icons/IconAdjustments.mjs";
import { useEffect, useEffectEvent, useRef, useState } from "react";

type Mode = "calm" | "replay";

const IDLE_T = 149.9;

const CARE_JOURNEY: ReadonlyArray<{
  stage: DemoCareJourneyStage;
  label: string;
  description: string;
}> = [
  {
    stage: "routine",
    label: "Normal activity",
    description: "Movement follows Grandpa’s usual morning routine.",
  },
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
    description: "The courier confirmed Grandpa answered safely.",
  },
  {
    stage: "back_to_routine",
    label: "Back to routine",
    description: "Ordinary movement resumed after the confirmed check-in.",
  },
];

const CARE_JOURNEY_STAGES = CARE_JOURNEY.map((item) => item.stage);

function formatReplayTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return minutes > 0 ? `${minutes}m ${String(remaining).padStart(2, "0")}s` : `${remaining}s`;
}

function buildSignalPoints(t: number, motion: number, change: number): string {
  return Array.from({ length: 64 }, (_, index) => {
    const progress = index / 63;
    const x = progress * 720;
    const amplitude = 4 + motion * 34 + change * 10;
    const envelope = 0.45 + Math.abs(Math.sin(index * 0.18)) * 0.55;
    const wave = Math.sin(index * 0.72 + t * 0.18) * amplitude * envelope;
    const detail = Math.sin(index * 1.83 + t * 0.31) * (2 + motion * 4);
    const y = Math.max(18, Math.min(142, 80 + wave + detail));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

type FamilyBoardProps = {
  homeSetup: HomeSetup;
  autoStart?: boolean;
  onResetSetup: () => void;
};

export function FamilyBoard({ homeSetup, autoStart = false, onResetSetup }: FamilyBoardProps) {
  const [data, setData] = useState<DemoFramesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(autoStart ? "replay" : "calm");
  const [playing, setPlaying] = useState(false);
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [t, setT] = useState(autoStart ? 0 : IDLE_T);

  const tRef = useRef(autoStart ? 0 : IDLE_T);
  const lastStampRef = useRef<number | null>(null);
  const lastUiRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    loadDemoFrames()
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        if (autoStart) setPlaying(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load simulation");
      });
    return () => {
      cancelled = true;
    };
  }, [autoStart]);

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
  const changePct = Math.round(Math.max(0, Math.min(1, frame.anomalyScore)) * 100);
  const signalPoints = buildSignalPoints(viewT, frame.motionLevel, frame.anomalyScore);
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
              <IconAdjustments size={15} stroke={1.9} aria-hidden="true" />
              Adjust demo home
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
          <span className="journey-progress-track" aria-hidden="true">
            <span className="journey-progress-line" style={{ height: `${journeyProgress}%` }} />
          </span>
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
          <section className="signal-overview" aria-labelledby="signal-overview-title">
            <header className="signal-overview-head">
              <div>
                <p>WI-FI MOVEMENT SIGNAL</p>
                <h3 id="signal-overview-title">Room activity pattern</h3>
              </div>
              <span>Simulated</span>
            </header>

            <div className="signal-metric-grid" aria-label="Current sensing values">
              <div className="signal-metric">
                <span>Movement</span>
                <strong>{motionPct}<small>%</small></strong>
              </div>
              <div className="signal-metric">
                <span>Quiet history</span>
                <strong>{formatDuration(stillSeconds)}</strong>
              </div>
              <div className="signal-metric">
                <span>Change from baseline</span>
                <strong>{changePct}<small>%</small></strong>
              </div>
            </div>

            <div className="signal-trace" aria-hidden="true">
              <svg viewBox="0 0 720 160" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="signal-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="40" x2="720" y2="40" />
                <line x1="0" y1="80" x2="720" y2="80" />
                <line x1="0" y1="120" x2="720" y2="120" />
                <polygon points={`0,160 ${signalPoints} 720,160`} fill="url(#signal-fill)" />
                <polyline className="signal-trace-line" points={signalPoints} />
              </svg>
              <span>Replay {formatReplayTime(viewT)}</span>
            </div>

            <div className="signal-reading">
              <span>Current reading</span>
              <p>{statusReason || "Movement is within the expected range."}</p>
            </div>

            <p className="signal-disclaimer">
              These simulated inputs include sensing history that can begin before the replay clock. They represent movement patterns only, not clinical vital signs.
            </p>
          </section>
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
