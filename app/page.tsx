"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import IconBowlChopsticks from "@tabler/icons-react/dist/esm/icons/IconBowlChopsticks.mjs";
import IconChevronDown from "@tabler/icons-react/dist/esm/icons/IconChevronDown.mjs";
import IconHeartHandshake from "@tabler/icons-react/dist/esm/icons/IconHeartHandshake.mjs";
import IconPlayerPauseFilled from "@tabler/icons-react/dist/esm/icons/IconPlayerPauseFilled.mjs";
import IconPlayerPlayFilled from "@tabler/icons-react/dist/esm/icons/IconPlayerPlayFilled.mjs";
import IconShieldCheck from "@tabler/icons-react/dist/esm/icons/IconShieldCheck.mjs";
import IconUsers from "@tabler/icons-react/dist/esm/icons/IconUsers.mjs";
import IconWifi from "@tabler/icons-react/dist/esm/icons/IconWifi.mjs";
import {
  advanceStoryTime,
  STORY_CHAPTER_MS,
  storyPositionAt,
} from "@/lib/landing-story";
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
    detail: "2D Family View shows room-to-room movement analytics across the single-story Japanese home.",
  },
  {
    number: "02",
    title: "Unusual silence detected",
    detail: "In this bathroom check-in example, sustained silence prompts a nearby courier request.",
  },
  {
    number: "03",
    title: "A human checks in",
    detail: "Bento courier with delivery bag knocks on door. Resident answers. Family receives All Clear update.",
  },
];

export default function Home() {
  const [playing, setPlaying] = useState(false);
  const [storyFinished, setStoryFinished] = useState(false);
  const [storyPosition, setStoryPosition] = useState(() => storyPositionAt(0, STORY.length));
  const storyTimeRef = useRef(0);
  const storyPositionRef = useRef(storyPosition);
  const totalStoryTime = STORY.length * STORY_CHAPTER_MS;
  const { step, phase } = storyPosition;

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = advanceStoryTime(storyTimeRef.current, now - last, totalStoryTime);
      last = now;
      storyTimeRef.current = next;
      const nextPosition = storyPositionAt(next, STORY.length);
      if (
        nextPosition.step !== storyPositionRef.current.step
        || nextPosition.phase !== storyPositionRef.current.phase
      ) {
        storyPositionRef.current = nextPosition;
        setStoryPosition(nextPosition);
      }
      if (next >= totalStoryTime - 1) {
        setStoryFinished(true);
        setPlaying(false);
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, totalStoryTime]);

  const playStory = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (storyFinished) {
      storyTimeRef.current = 0;
      const start = storyPositionAt(0, STORY.length);
      storyPositionRef.current = start;
      setStoryPosition(start);
      setStoryFinished(false);
    }
    setPlaying(true);
  };

  const selectStep = (nextStep: number) => {
    setPlaying(false);
    const nextTime = nextStep * STORY_CHAPTER_MS;
    const nextPosition = storyPositionAt(nextTime, STORY.length);
    storyTimeRef.current = nextTime;
    storyPositionRef.current = nextPosition;
    setStoryPosition(nextPosition);
    setStoryFinished(false);
  };

  return (
    <main className={`experience scene-${step}`}>
      <header className="site-header">
        <a className="wordmark" href="#story" aria-label="Agent Bento home">
          <Image className="wordmark-mark" src="/agent-bento-mark.png" alt="" width={52} height={52} priority />
          <span>AGENT BENTO</span>
        </a>
        <div className="trust-notes">
          <div className="privacy-note">
            <IconShieldCheck size={17} />
            <span>No cameras. No recordings.</span>
          </div>
          <p className="demo-notice">Interactive demo — sensing, delivery and notifications are simulated.</p>
        </div>
      </header>

      <section className="hero" id="story" aria-labelledby="hero-title">
        <div className="scene-wrap" aria-label="Interactive 3D cutaway home">
          <HomeScene step={step} phase={phase} />
          <div className="scene-vignette" />
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

          <div className="hero-actions">
            <a className="play-button hero-dashboard-cta" href="/dashboard">
              <IconUsers size={18} />
              Open family demo
            </a>
            <button className="story-play-secondary" type="button" onClick={playStory}>
              {playing ? <IconPlayerPauseFilled size={18} /> : <IconPlayerPlayFilled size={18} />}
              {playing ? "Pause the story" : storyFinished ? "Replay the story" : "Play the story"}
            </button>
          </div>

          <div className="story-heading">BATHROOM CHECK-IN EXAMPLE · HOW AGENT BENTO HELPS</div>
          <div className="story-steps" role="group" aria-label="Bathroom check-in story scenes">
            {STORY.map((item, index) => (
              <button
                key={item.number}
                className={`story-step ${index === step ? "active" : ""} ${index < step ? "complete" : ""}`}
                onClick={() => selectStep(index)}
                aria-pressed={index === step}
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

          <p className="scene-description" id="scene-description" aria-live="polite">{STORY[step].detail}</p>
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

        <div className="resident-portrait">
          <figure className="resident-portrait-media">
            <Image
              className="resident-portrait-image"
              src="/grandma-sample.png"
              alt="Illustrated portrait of Grandma in a soft green kimono"
              width={1024}
              height={1536}
              loading="eager"
              sizes="(max-width: 800px) 320px, 420px"
            />
            <figcaption>Sample resident portrait</figcaption>
          </figure>
          <div className="resident-portrait-copy">
            <p className="eyebrow"><span /> INSPIRED BY</p>
            <h3>My Grandma.</h3>
            <ul>
              <li>Stubborn</li>
              <li>Doesn&apos;t like to bother anyone</li>
              <li>Doesn&apos;t like being monitored</li>
              <li>Falls down a lot</li>
              <li>Food lover</li>
            </ul>
            <p>
              So Agent Bento never watches with cameras. It only notices unusual silence — then sends care that feels like a meal, not surveillance.
            </p>
          </div>
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
            <h3>Care arrives as a meal</h3>
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
        <div className="closing-cta">
          <a className="dashboard-cta" href="/dashboard">
            <IconUsers size={18} />
            Open family dashboard
          </a>
        </div>
      </section>
    </main>
  );
}
