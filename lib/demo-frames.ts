export type CareStatus = "normal" | "warning" | "critical";

export type DemoFrame = {
  room: string;
  zone: string;
  x: number;
  y: number;
  activity: string;
  posture: string;
  motionLevel: number;
  stillDuration: number;
  status: CareStatus;
  statusReason: string;
  anomalyScore: number;
  t: number;
  frame: number;
  scene: string;
};

export type DemoScene = {
  id: string;
  label: string;
  start: number;
  end: number;
  desc: string;
};

export type DemoLogEntry = {
  t: number;
  level: "info" | "warn" | "error" | string;
  text: string;
};

export type DemoRoom = {
  label: string;
  x: number;
  y: number;
};

export type DemoMeta = {
  title: string;
  subtitle: string;
  fps: number;
  totalFrames: number;
  duration: number;
  rooms: Record<string, DemoRoom>;
  scenes: DemoScene[];
  bendoLog: DemoLogEntry[];
};

export type DemoFramesData = {
  meta: DemoMeta;
  frames: DemoFrame[];
};

export type ActivityTrailItem = {
  timeLabel: string;
  room: string;
  note: string;
  t: number;
};

const ROOM_LABELS: Record<string, string> = {
  living: "Living room",
  kitchen: "Kitchen",
  bedroom: "Bedroom",
  bathroom: "Bathroom",
};

const ZONE_LABELS: Record<string, string> = {
  bed: "bed",
  sink: "sink",
  sofa: "sofa",
  stove: "stove",
  table: "table",
  tv: "TV",
};

const ACTIVITY_LABELS: Record<string, string> = {
  cooking: "Cooking near the counter",
  drinking_tea: "Having tea at the table",
  relieved: "Settling after the check-in",
  resting: "Resting on the sofa",
  still: "Unusually still",
  waking: "Waking up",
  waking_up: "Waking and responding",
  walking: "Moving through the home",
  washing: "At the sink",
  watching_tv: "Watching TV",
};

const SCENE_COPY: Record<string, { label: string; desc: string }> = {
  S1: { label: "Morning rhythm", desc: "Wakes up, cooks, settles into the living room." },
  S2: { label: "Sofa quiet", desc: "Lies down on the sofa and gradually stops moving." },
  S3: { label: "Unusual silence", desc: "Agent Bento notices the quiet and opens a watch." },
  S4: { label: "Courier en route", desc: "A nearby shop rider is sent for a friendly check-in." },
  S5: { label: "At the door", desc: "The courier knocks; movement returns." },
  S6: { label: "All clear", desc: "Confirmed safe — just a nap on the sofa." },
  S7: { label: "Back to routine", desc: "Ordinary life resumes; sensing stays on." },
};

const LOG_TRANSLATIONS: Record<string, string> = {
  "Bendo 启动 — 开始今日监测": "Agent Bento online — starting today’s watch",
  "⚠️ 检测到异常：老人静止超过2分钟": "Unusual quiet: no movement for over 2 minutes",
  "生命体征正常但持续无动作": "Motion still absent — keeping a careful watch",
  "心率偏低 (58 bpm) + 呼吸偏浅": "Stillness deepening — quiet signal rising",
  "🔴 8分钟无变化 — 无法排除昏迷可能": "Eight minutes unchanged — time for a human check-in",
  "启动 Bendo 保守检查协议…": "Starting the gentle check-in protocol…",
  "📍 定位附近商家: 711 (距离 230m)": "Nearby shop found: 7-Eleven (230m away)",
  "📦 创建订单: 三明治 ×1": "Placing order: sandwich ×1",
  "📝 备注: 「老人可能不适，请上门确认」": "Note: “Please confirm the resident is okay.”",
  "🛒 订单已发出 — 等待骑手接单…": "Order sent — waiting for a rider…",
  "🛵 骑手 张伟 已接单 — 预计3分钟到达": "Rider Wei Zhang accepted — about 3 minutes away",
  "📍 骑手距离 50m…": "Rider is 50m away…",
  "🚪 骑手到达 — 正在敲门": "Rider arrived — knocking at the door",
  "👋 检测到动作！老人正在响应": "Movement detected — resident is responding",
  "✅ 确认安全 — 老人只是睡着了": "All clear — just a nap on the sofa",
  "📋 骑手确认: 「老人在沙发上打盹，一切正常」": "Rider confirmed: “Napping on the sofa — all normal.”",
  "💚 Bendo 记录：一次正确的谨慎": "Logged: a careful check that mattered",
  "📊 今日报告: 1次检查 | 4次监测 | 0次漏报": "Today: 1 check-in · 4 watches · 0 misses",
};

export function roomLabel(room: string): string {
  return ROOM_LABELS[room] ?? room;
}

export function zoneLabel(zone: string): string {
  return ZONE_LABELS[zone] ?? zone;
}

export function activityLabel(activity: string): string {
  return ACTIVITY_LABELS[activity] ?? activity.replaceAll("_", " ");
}

export function sceneCopy(scene: DemoScene): { label: string; desc: string } {
  return SCENE_COPY[scene.id] ?? { label: scene.label, desc: scene.desc };
}

export function translateLogText(text: string): string {
  return LOG_TRANSLATIONS[text] ?? text;
}

export function translateStatusReason(reason: string): string {
  if (!reason) return "";

  const exact: Record<string, string> = {
    "8分钟无变化，疑似昏迷": "Eight minutes unchanged — check-in needed",
    "✅ 确认安全 — 老人只是睡着了": "All clear — just a nap",
    "启动保守检查流程": "Starting gentle check-in",
    "响应中": "Responding",
    "心率偏低+长时间静止": "Long stillness — watching closely",
    "静止超过2分钟": "Still for over 2 minutes",
    "骑手已到达，正在确认": "Rider arrived — confirming",
  };

  if (exact[reason]) return exact[reason];

  const eta = reason.match(/骑手已接单，预计(\d+)秒到达/);
  if (eta) return `Rider en route — about ${eta[1]}s away`;

  return reason;
}

export function statusChip(status: CareStatus): string {
  switch (status) {
    case "warning":
      return "SIMULATED · WATCHING QUIET";
    case "critical":
      return "SIMULATED · CHECK-IN UNDERWAY";
    default:
      return "SIMULATED · ROUTINE NORMAL";
  }
}

export function statusHeadline(status: CareStatus, sceneId: string): { title: string; lead: string } {
  if (sceneId === "S6" || sceneId === "S7") {
    return {
      title: "Grandpa is safe.",
      lead: "The quiet check-in cleared. Agent Bento stays with the home.",
    };
  }

  switch (status) {
    case "warning":
      return {
        title: "Watching the quiet.",
        lead: "Unusual stillness lasted longer than his usual nap. Care is paying attention.",
      };
    case "critical":
      return {
        title: "Check-in on the way.",
        lead: "A nearby courier is heading over for a friendly human look-in.",
      };
    default:
      return {
        title: "Grandpa is safe.",
        lead: "Agent Bento is reading the quiet signals of home — and only escalating when care is needed.",
      };
  }
}

export function frameAt(frames: DemoFrame[], t: number): DemoFrame {
  if (frames.length === 0) {
    throw new Error("No demo frames loaded");
  }

  const clamped = Math.max(0, Math.min(t, frames[frames.length - 1].t));
  const index = Math.min(frames.length - 1, Math.max(0, Math.round(clamped * 10)));
  return frames[index] ?? frames[frames.length - 1];
}

export function sceneFor(scenes: DemoScene[], t: number): DemoScene {
  const match = scenes.find((scene) => t >= scene.start && t < scene.end);
  return match ?? scenes[scenes.length - 1];
}

export function logsUpTo(log: DemoLogEntry[], t: number): DemoLogEntry[] {
  return log.filter((entry) => entry.t <= t + 0.05);
}

export function buildActivityTrail(frames: DemoFrame[], limit = 5): ActivityTrailItem[] {
  const trail: ActivityTrailItem[] = [];
  let lastKey = "";

  for (const frame of frames) {
    const key = `${frame.room}|${frame.activity}|${frame.zone}`;
    if (key === lastKey) continue;
    lastKey = key;

    const hours = 8 + Math.floor(frame.t / 60);
    const minutes = Math.floor(frame.t % 60);
    trail.push({
      t: frame.t,
      timeLabel: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
      room: roomLabel(frame.room),
      note: `${activityLabel(frame.activity)} · ${zoneLabel(frame.zone)}`,
    });
  }

  return trail.slice(-limit).reverse();
}

export async function loadDemoFrames(): Promise<DemoFramesData> {
  const response = await fetch("/data/demo_frames.json");
  if (!response.ok) {
    throw new Error(`Failed to load demo frames (${response.status})`);
  }
  return response.json() as Promise<DemoFramesData>;
}
