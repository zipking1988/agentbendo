export type CareStatus = "normal" | "warning" | "critical";

export type DemoCareStage =
  | "routine"
  | "checking_stillness"
  | "arranging_check_in"
  | "courier_en_route"
  | "courier_at_door"
  | "resident_responding"
  | "check_in_complete"
  | "back_to_routine";

export type DemoCarePresentation = {
  title: string;
  lead: string;
  chip: string;
  tone: CareStatus;
};

export type DemoCareTimelineItem = {
  stage: DemoCareStage;
  start: number;
  end: number;
};

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
  careTimeline: DemoCareTimelineItem[];
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

const LOG_TRANSLATIONS: Record<string, string> = {
  "Bendo 启动 — 开始今日监测": "Agent Bento online — starting today’s watch",
  "⚠️ 检测到异常：老人静止超过2分钟": "Unusual quiet: no movement for over 2 minutes",
  "生命体征正常但持续无动作": "Motion still absent — keeping a careful watch",
  "心率偏低 (58 bpm) + 呼吸偏浅": "Stillness deepening — quiet signal rising",
  "🔴 8分钟无变化 — 无法排除昏迷可能": "The quiet pattern continued — time for a human check-in",
  "启动 Bendo 保守检查协议…": "Starting the gentle check-in protocol…",
  "📍 定位附近商家: 711 (距离 230m)": "Nearby shop found: 7-Eleven (230m away)",
  "📦 创建订单: 三明治 ×1": "Placing order: sandwich ×1",
  "📝 备注: 「老人可能不适，请上门确认」": "Note: “Please confirm the resident is okay.”",
  "🛒 订单已发出 — 等待骑手接单…": "Order sent — waiting for a rider…",
  "🛵 骑手 张伟 已接单 — 预计3分钟到达": "Rider Wei Zhang accepted — on the way",
  "📍 骑手距离 50m…": "Rider is 50m away…",
  "🚪 骑手到达 — 正在敲门": "Rider arrived — knocking at the door",
  "👋 检测到动作！老人正在响应": "Movement detected — resident is responding",
  "✅ 老人正在响应 — 等待骑手确认": "Resident is responding — awaiting courier confirmation",
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

export function translateLogText(text: string): string {
  return LOG_TRANSLATIONS[text] ?? text;
}

export function translateStatusReason(reason: string): string {
  if (!reason) return "";

  const exact: Record<string, string> = {
    "8分钟无变化，疑似昏迷": "Quiet pattern continued — check-in needed",
    "✅ 确认安全 — 老人只是睡着了": "All clear — just a nap",
    "启动保守检查流程": "Starting gentle check-in",
    "等待骑手接单": "Check-in requested — awaiting courier",
    "响应中": "Responding",
    "✅ 老人正在响应 — 等待骑手确认": "Resident is responding — awaiting courier confirmation",
    "心率偏低+长时间静止": "Long stillness — watching closely",
    "静止超过2分钟": "Still for over 2 minutes",
    "骑手已到达，正在确认": "Rider arrived — confirming",
  };

  if (exact[reason]) return exact[reason];

  const eta = reason.match(/骑手已接单，预计(\d+)秒到达/);
  if (eta) return "Rider en route";

  return reason;
}

export function demoCareStageAt(
  t: number,
  timeline: ReadonlyArray<DemoCareTimelineItem>,
): DemoCareStage {
  const replayTime = Number.isNaN(t) ? 0 : Math.max(0, t);
  return timeline.find((item) => replayTime >= item.start && replayTime < item.end)?.stage
    ?? "back_to_routine";
}

const DEMO_CARE_PRESENTATION: Record<DemoCareStage, DemoCarePresentation> = {
  routine: {
    title: "Movement looks normal",
    lead: "Grandpa is moving through his usual morning routine.",
    chip: "SIMULATED · ROUTINE NORMAL",
    tone: "normal",
  },
  checking_stillness: {
    title: "Checking unusual stillness",
    lead: "The home has gone quieter than expected, so Agent Bento is watching for a change.",
    chip: "SIMULATED · CHECKING QUIET",
    tone: "warning",
  },
  arranging_check_in: {
    title: "Arranging a check-in",
    lead: "The quiet has continued. Agent Bento is requesting a friendly human visit.",
    chip: "SIMULATED · CHECK-IN REQUESTED",
    tone: "critical",
  },
  courier_en_route: {
    title: "Courier on the way",
    lead: "A nearby courier accepted the request and is heading to Grandpa’s home.",
    chip: "SIMULATED · COURIER EN ROUTE",
    tone: "critical",
  },
  courier_at_door: {
    title: "Courier at the door",
    lead: "The courier has arrived and is knocking for a friendly check-in.",
    chip: "SIMULATED · AWAITING RESPONSE",
    tone: "critical",
  },
  resident_responding: {
    title: "Resident responding — confirmation pending",
    lead: "Movement has returned. Agent Bento is waiting for the courier to confirm the check-in.",
    chip: "SIMULATED · CONFIRMATION PENDING",
    tone: "warning",
  },
  check_in_complete: {
    title: "Check-in complete — Grandpa answered",
    lead: "The courier confirmed Grandpa answered and is safe at home.",
    chip: "SIMULATED · ALL CLEAR",
    tone: "normal",
  },
  back_to_routine: {
    title: "Back to routine",
    lead: "The check-in is complete and ordinary movement has resumed.",
    chip: "SIMULATED · ROUTINE RESUMED",
    tone: "normal",
  },
};

export function demoCarePresentation(stage: DemoCareStage): DemoCarePresentation {
  return DEMO_CARE_PRESENTATION[stage];
}

export function frameAt(frames: DemoFrame[], t: number): DemoFrame {
  if (frames.length === 0) {
    throw new Error("No demo frames loaded");
  }

  const replayTime = Number.isNaN(t) ? 0 : t;
  let low = 0;
  let high = frames.length - 1;
  let latest = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (frames[middle].t <= replayTime) {
      latest = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return frames[latest];
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
