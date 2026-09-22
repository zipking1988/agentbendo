export const STORY_BEAT_MS = 1800;
export const STORY_CHAPTER_MS = STORY_BEAT_MS * 3;
export const MAX_STORY_FRAME_DELTA_MS = 100;

export function advanceStoryTime(
  currentTime: number,
  elapsedMs: number,
  totalTime: number,
): number {
  const safeElapsed = Number.isFinite(elapsedMs)
    ? Math.max(0, Math.min(MAX_STORY_FRAME_DELTA_MS, elapsedMs))
    : 0;
  return Math.min(Math.max(0, totalTime - 1), Math.max(0, currentTime) + safeElapsed);
}

export function storyPositionAt(
  storyTime: number,
  chapterCount: number,
): { step: number; phase: number } {
  const safeTime = Number.isFinite(storyTime) ? Math.max(0, storyTime) : 0;
  const lastStep = Math.max(0, chapterCount - 1);
  return {
    step: Math.min(lastStep, Math.floor(safeTime / STORY_CHAPTER_MS)),
    phase: Math.min(2, Math.floor((safeTime % STORY_CHAPTER_MS) / STORY_BEAT_MS)),
  };
}
