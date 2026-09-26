import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  demoCarePresentation,
  demoCareJourneyProgress,
  demoCareJourneyStage,
  demoCareStageAt,
  frameAt,
  latestCheckInNote,
  logsUpTo,
  type DemoFrame,
  type DemoFramesData,
} from "../lib/demo-frames.ts";
import {
  advanceStoryTime,
  STORY_CHAPTER_MS,
  storyPositionAt,
} from "../lib/landing-story.ts";

const fixture = JSON.parse(
  await readFile(new URL("../public/data/demo_frames.json", import.meta.url), "utf8"),
) as DemoFramesData;
const timeline = fixture.meta.careTimeline;

test("demo stages change at the agreed replay boundaries", () => {
  assert.equal(demoCareStageAt(0, timeline), "routine");
  assert.equal(demoCareStageAt(29.9, timeline), "routine");
  assert.equal(demoCareStageAt(30, timeline), "checking_stillness");
  assert.equal(demoCareStageAt(49.9, timeline), "checking_stillness");
  assert.equal(demoCareStageAt(50, timeline), "arranging_check_in");
  assert.equal(demoCareStageAt(62, timeline), "courier_en_route");
  assert.equal(demoCareStageAt(80, timeline), "courier_at_door");
  assert.equal(demoCareStageAt(86, timeline), "resident_responding");
  assert.equal(demoCareStageAt(100, timeline), "check_in_complete");
  assert.equal(demoCareStageAt(120, timeline), "back_to_routine");
  assert.equal(demoCareStageAt(-1, timeline), "routine");
  assert.equal(demoCareStageAt(Number.NaN, timeline), "routine");
  assert.equal(demoCareStageAt(Number.POSITIVE_INFINITY, timeline), "back_to_routine");
});

test("frame lookup never reads ahead of replay time", () => {
  const frames = [0, 0.1, 0.2].map((t, frame) => ({ t, frame })) as DemoFrame[];

  assert.equal(frameAt(frames, 0.19).t, 0.1);
  assert.equal(frameAt(frames, -1).t, 0);
  assert.equal(frameAt(frames, Number.NaN).t, 0);
  assert.equal(frameAt(frames, Number.POSITIVE_INFINITY).t, 0.2);
});

test("presentation copy follows demo progress instead of sensor severity", () => {
  assert.equal(demoCarePresentation(demoCareStageAt(30, timeline)).title, "Checking unusual stillness");
  assert.equal(demoCarePresentation(demoCareStageAt(80, timeline)).title, "Courier at the door");
  assert.equal(demoCarePresentation(demoCareStageAt(86, timeline)).chip, "SIMULATED · CONFIRMATION PENDING");
  assert.equal(demoCarePresentation(demoCareStageAt(100, timeline)).title, "Check-in complete — Grandpa answered");
});

test("care journey exposes every user-facing care stage", () => {
  assert.equal(demoCareJourneyStage("routine"), "routine");
  assert.equal(demoCareJourneyStage("checking_stillness"), "checking_stillness");
  assert.equal(demoCareJourneyStage("arranging_check_in"), "arranging_check_in");
  assert.equal(demoCareJourneyStage("courier_en_route"), "courier_en_route");
  assert.equal(demoCareJourneyStage("courier_at_door"), "courier_at_door");
  assert.equal(demoCareJourneyStage("resident_responding"), "resident_responding");
  assert.equal(demoCareJourneyStage("check_in_complete"), "check_in_complete");
  assert.equal(demoCareJourneyStage("back_to_routine"), "back_to_routine");
});

test("care journey progress follows the shared replay clock", () => {
  const stages = [
    "routine",
    "checking_stillness",
    "arranging_check_in",
    "courier_en_route",
    "courier_at_door",
    "resident_responding",
    "check_in_complete",
    "back_to_routine",
  ] as const;

  assert.equal(demoCareJourneyProgress(0, timeline, stages), 0);
  assert.equal(Math.round(demoCareJourneyProgress(28, timeline, stages)), 13);
  assert.equal(Math.round(demoCareJourneyProgress(30, timeline, stages)), 14);
  assert.equal(Math.round(demoCareJourneyProgress(40, timeline, stages)), 21);
  assert.equal(Math.round(demoCareJourneyProgress(68, timeline, stages)), 48);
  assert.equal(Math.round(demoCareJourneyProgress(93, timeline, stages)), 79);
  assert.equal(Math.round(demoCareJourneyProgress(100, timeline, stages)), 86);
  assert.equal(demoCareJourneyProgress(120, timeline, stages), 100);
  assert.equal(demoCareJourneyProgress(149.9, timeline, stages), 100);
});

test("latest check-in note follows replay progress and stops at confirmation", () => {
  const notes = fixture.meta.bendoLog;

  assert.equal(latestCheckInNote(notes.filter((entry) => entry.t <= 48), timeline)?.t, 48);
  assert.equal(latestCheckInNote(notes.filter((entry) => entry.t <= 92), timeline)?.t, 92);
  assert.equal(latestCheckInNote(notes, timeline)?.t, 100);
  assert.equal(latestCheckInNote([], timeline), undefined);
});

test("care notes never appear before their replay timestamp", () => {
  const notes = fixture.meta.bendoLog;

  assert.equal(logsUpTo(notes, 49.99).some((entry) => entry.t === 50), false);
  assert.equal(logsUpTo(notes, 50).some((entry) => entry.t === 50), true);
});

test("care notes match the watch, response, and confirmation stages", async () => {
  const data = fixture;
  const notes = data.meta.bendoLog;

  assert.equal(notes.find((note) => note.text.includes("静止超过2分钟"))?.t, 35);
  assert.match(notes.find((note) => note.t === 92)?.text ?? "", /等待骑手确认/);
  assert.match(notes.find((note) => note.t === 100)?.text ?? "", /骑手确认/);

  const earlyWatchFrame = data.frames.find((frame) => frame.t === 30);
  assert.equal(earlyWatchFrame?.status, "normal");
  assert.equal(demoCarePresentation(demoCareStageAt(30, timeline)).tone, "warning");

  const confirmedFrame = data.frames.find((frame) => frame.t === 100) as
    | { statusReason?: string; stillDuration?: number }
    | undefined;
  assert.match(confirmedFrame?.statusReason ?? "", /确认安全/);
  assert.equal(confirmedFrame?.stillDuration, 0);

  for (const replayTime of [50, 58]) {
    const frame = data.frames.find((item) => item.t === replayTime);
    assert.equal(frame?.statusReason, "等待骑手接单");
    assert.equal(demoCareStageAt(replayTime, timeline), "arranging_check_in");
  }
  assert.match(data.frames.find((frame) => frame.t === 62)?.statusReason ?? "", /骑手已接单/);
  for (const replayTime of [86, 92]) {
    const frame = data.frames.find((item) => item.t === replayTime);
    assert.equal(frame?.statusReason, "响应中");
    assert.equal(frame?.stillDuration, 0);
    assert.equal(demoCareStageAt(replayTime, timeline), "resident_responding");
  }
});

test("landing story uses one bounded playback clock", () => {
  assert.equal(advanceStoryTime(1000, 50, STORY_CHAPTER_MS * 3), 1050);
  assert.equal(advanceStoryTime(1000, 60_000, STORY_CHAPTER_MS * 3), 1100);
  assert.deepEqual(storyPositionAt(STORY_CHAPTER_MS - 1, 3), { step: 0, phase: 2 });
  assert.deepEqual(storyPositionAt(STORY_CHAPTER_MS, 3), { step: 1, phase: 0 });
  assert.deepEqual(storyPositionAt(STORY_CHAPTER_MS * 2, 3), { step: 2, phase: 0 });
});
