"use client";

import dynamic from "next/dynamic";
import IconBowlChopsticks from "@tabler/icons-react/dist/esm/icons/IconBowlChopsticks.mjs";
import IconChevronDown from "@tabler/icons-react/dist/esm/icons/IconChevronDown.mjs";
import IconHeartHandshake from "@tabler/icons-react/dist/esm/icons/IconHeartHandshake.mjs";
import IconPlayerPauseFilled from "@tabler/icons-react/dist/esm/icons/IconPlayerPauseFilled.mjs";
import IconPlayerPlayFilled from "@tabler/icons-react/dist/esm/icons/IconPlayerPlayFilled.mjs";
import IconShieldCheck from "@tabler/icons-react/dist/esm/icons/IconShieldCheck.mjs";
import IconUsers from "@tabler/icons-react/dist/esm/icons/IconUsers.mjs";
import IconWifi from "@tabler/icons-react/dist/esm/icons/IconWifi.mjs";
import { useEffect, useRef, useState } from "react";

const HomeScene = dynamic(
  () => import("./HomeScene").then((module) => module.HomeScene),
  {
    ssr: false,
    loading: () => (
      <div className="scene-loading" role="status">
        <IconBowlChopsticks size={22} />
        <span>Bringing the home to life…</span>
      </div>
    ),
  },
);

const STORY = [
  {
    number: "01",
    title: "Home is moving normally",
    detail: "Wi‑Fi quietly sees room-to-room movement.",
    sceneLabel: "ROUTINE LOOKS NORMAL",
  },
  {
    number: "02",
    title: "Unusual silence detected",
    detail: "No movement for eight hours. The camera-free check begins.",
    sceneLabel: "8 HOURS · NO MOVEMENT",
  },
  {
    number: "03",
    title: "A human checks in",
    detail: "A bento courier knocks. Family is alerted only if needed.",
    sceneLabel: "BENTO CHECK-IN · ON THE WAY",
  },
];

export default function Home() {
  const [step, setStep] = useState(1);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;

    timerRef.current = window.setInterval(() => {
      setStep((current) => {
        if (current >= STORY.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 5200);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [playing]);

  const playStory = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (step === STORY.length - 1) setStep(0);
    setPlaying(true);
  };

  const selectStep = (nextStep: number) => {
    setPlaying(false);
    setStep(nextStep);
  };

  return (
    <main className={`experience scene-${step}`}>
      <header className="site-header">
        <a className="wordmark" href="#story" aria-label="Agent Bento home">
          <span className="wordmark-icon" aria-hidden="true">
            <IconBowlChopsticks size={25} stroke={1.7} />
          </span>
          <span>AGENT BENTO</span>
        </a>
        <div className="privacy-note">
          <IconShieldCheck size={17} />
          <span>No cameras. No recordings.</span>
        </div>
      </header>

      <section className="hero" id="story" aria-labelledby="hero-title">
        <div className="scene-wrap" aria-label="Interactive 3D cutaway home">
          <HomeScene step={step} />
          <div className="scene-vignette" />
          <div className="scene-status" aria-live="polite">
            <span className="status-pulse" />
            {STORY[step].sceneLabel}
          </div>
          <div className="orbit-hint">DRAG TO LOOK AROUND</div>
        </div>

        <div className="hero-copy">
          <p className="eyebrow"><span /> PRIVACY-FIRST CARE</p>
          <h1 id="hero-title">A home can<br />ask for help.</h1>
          <p className="explainer">
            Wi‑Fi notices unusual silence.<br />
            A warm meal checks in.<br />
            Family steps in only when needed.
          </p>

          <div className="story-heading">HOW AGENT BENTO HELPS</div>
          <div className="story-steps" role="tablist" aria-label="How Agent Bento works">
            {STORY.map((item, index) => (
              <button
                key={item.number}
                className={`story-step ${index === step ? "active" : ""} ${index < step ? "complete" : ""}`}
                onClick={() => selectStep(index)}
                role="tab"
                aria-selected={index === step}
                aria-controls="scene-description"
              >
                <span className="step-dot" />
                <span className="step-number">{item.number}</span>
                <span className="step-text">
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
              </button>
            ))}
          </div>

          <div className="primary-actions">
            <button className="play-button" onClick={playStory}>
              {playing ? <IconPlayerPauseFilled size={18} /> : <IconPlayerPlayFilled size={18} />}
              {playing ? "Pause the story" : step === 2 ? "Replay the story" : "Play the 30-second story"}
            </button>
            <p id="scene-description" aria-live="polite">{STORY[step].detail}</p>
          </div>
        </div>

        <a className="scroll-cue" href="#why">
          <span>See why it works</span>
          <IconChevronDown size={18} />
        </a>
      </section>

      <section className="why-section" id="why" aria-labelledby="why-title">
        <div className="why-intro">
          <p className="eyebrow"><span /> THE SAFETY NET</p>
          <h2 id="why-title">Technology stays quiet.<br />Human care shows up.</h2>
          <p>Agent Bento turns ambient Wi‑Fi into a respectful sequence of care—starting with the least intrusive action.</p>
        </div>
        <div className="why-grid">
          <article>
            <span className="why-icon"><IconWifi size={25} /></span>
            <p>01 · SENSE</p>
            <h3>No camera required</h3>
            <span>It reads changes in Wi‑Fi reflections, not faces, voices, or private moments.</span>
          </article>
          <article>
            <span className="why-icon coral"><IconBowlChopsticks size={25} /></span>
            <p>02 · CHECK</p>
            <h3>Care arrives as dinner</h3>
            <span>A hand-delivered bento creates a natural, friendly reason for a person to knock.</span>
          </article>
          <article>
            <span className="why-icon warm"><IconUsers size={25} /></span>
            <p>03 · PROTECT</p>
            <h3>The right people know</h3>
            <span>If nobody answers, family receives the context they need to act—without panic.</span>
          </article>
        </div>
        <div className="closing-line">
          <IconHeartHandshake size={24} />
          <span>Designed for independence. Built for peace of mind.</span>
        </div>
      </section>
    </main>
  );
}
