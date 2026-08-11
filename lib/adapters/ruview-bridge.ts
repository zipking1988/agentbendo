/**
 * RuView Bridge — Real WiFi CSI Sensing Adapter
 *
 * 将已运行的 RuView Docker 容器 (ESP32-S3 真实硬件) 连接到 AgentBento。
 * 替代 demo_frames.json 模拟数据。
 *
 * RuView API 端点 (Docker: localhost:3000):
 *   GET  /health                    → 服务器状态
 *   GET  /api/v1/sensing/latest     → 最新传感快照
 *   GET  /api/v1/sensing/stream     → SSE 实时流
 *
 * 环境变量:
 *   RUVIEW_API_URL=http://localhost:3000
 */

/* ─── 类型定义 ─── */

export type RuViewHealth = {
  status: string;
  version?: string;
  uptime?: number;
  hardware_connected?: boolean;
};

export type RuViewVitalSigns = {
  breathing_rate_bpm?: number;
  heart_rate_bpm?: number;
  breathing_confidence?: number;
  heart_rate_confidence?: number;
};

export type RuViewPresence = {
  detected: boolean;
  count?: number;
  confidence?: number;
  room?: string;
  motion_level?: number;
};

export type RuViewPosture = {
  detected: boolean;
  standing?: boolean;
  sitting?: boolean;
  lying?: boolean;
  fall_alert?: boolean;
};

export type RuViewSensingSnapshot = {
  timestamp: string;
  presence: RuViewPresence;
  vitals: RuViewVitalSigns;
  posture: RuViewPosture;
  /** 0–1 normalized motion energy */
  motion_energy?: number;
  /** seconds since last clear motion */
  still_duration?: number;
  /** 0–1 anomaly score */
  anomaly_score?: number;
  /** raw CSI amplitude mean (dB) */
  rssi?: number;
  /** subcarrier count */
  subcarriers?: number;
};

export type RuViewBridgeStatus = {
  connected: boolean;
  health: RuViewHealth | null;
  error: string | null;
};

/* ─── 配置 ─── */

function getRuViewConfig() {
  return {
    apiUrl: (process.env.RUVIEW_API_URL?.trim() || "http://localhost:3000").replace(/\/$/, ""),
    timeout: parseInt(process.env.RUVIEW_TIMEOUT?.trim() || "5000", 10),
  };
}

/* ─── API 调用 ─── */

async function ruviewFetch<T>(path: string): Promise<T> {
  const { apiUrl, timeout } = getRuViewConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${apiUrl}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`RuView ${res.status}: ${res.statusText}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/* ─── 公开 API ─── */

/** 检查 RuView 服务器健康状态 */
export async function checkRuViewHealth(): Promise<RuViewBridgeStatus> {
  try {
    const health = await ruviewFetch<RuViewHealth>("/health");
    return {
      connected: true,
      health: { ...health, hardware_connected: health.hardware_connected ?? false },
      error: null,
    };
  } catch (err) {
    return {
      connected: false,
      health: null,
      error: err instanceof Error ? err.message : "RuView unreachable",
    };
  }
}

/** 获取最新传感快照 */
export async function fetchLatestSensing(): Promise<RuViewSensingSnapshot | null> {
  try {
    return await ruviewFetch<RuViewSensingSnapshot>("/api/v1/sensing/latest");
  } catch {
    return null;
  }
}

/**
 * 将 RuView 传感数据映射为 AgentBento DemoFrame 兼容格式。
 * 这样 FamilyBoard 无需改动即可消费真实数据。
 */
export function mapRuViewToDemoFrame(
  snapshot: RuViewSensingSnapshot,
  room: string = "living",
): {
  room: string;
  x: number;
  y: number;
  activity: string;
  posture: string;
  motionLevel: number;
  stillDuration: number;
  status: "normal" | "warning" | "critical";
  statusReason: string;
  anomalyScore: number;
} {
  const presence = snapshot.presence;
  const posture = snapshot.posture;

  // 根据运动能量判断活动
  const motion = snapshot.motion_energy ?? presence.motion_level ?? 0.5;
  const still = snapshot.still_duration ?? 0;
  const anomaly = snapshot.anomaly_score ?? 0;

  let activity = "resting";
  if (motion > 0.6) activity = "walking";
  else if (motion > 0.3) activity = "waking";
  else if (still > 300) activity = "still";

  let postureLabel = "standing";
  if (posture?.lying) postureLabel = "lying";
  else if (posture?.sitting) postureLabel = "sitting";

  let status: "normal" | "warning" | "critical" = "normal";
  let statusReason = "";
  if (posture?.fall_alert) {
    status = "critical";
    statusReason = "Fall detected by RuView CSI";
  } else if (still > 480) {
    status = "warning";
    statusReason = "Unusual stillness > 8min";
  } else if (anomaly > 0.5) {
    status = "warning";
    statusReason = "RuView anomaly score elevated";
  }

  return {
    room,
    x: 50 + (motion - 0.5) * 20,
    y: 50 + (motion - 0.5) * 15,
    activity,
    posture: postureLabel,
    motionLevel: Math.min(1, Math.max(0, motion)),
    stillDuration: still,
    status,
    statusReason,
    anomalyScore: Math.min(1, Math.max(0, anomaly)),
  };
}

/**
 * 生成护理日志条目（基于真实传感数据）
 */
export function buildCareNote(snapshot: RuViewSensingSnapshot): string {
  const p = snapshot.presence;
  const v = snapshot.vitals;
  const pos = snapshot.posture;

  const parts: string[] = [];
  if (p.detected) {
    parts.push(`Presence: ${p.count ?? 1} person in ${p.room ?? "home"}`);
  } else {
    parts.push("No presence detected");
  }

  if (v.breathing_rate_bpm) {
    parts.push(`Breathing: ${v.breathing_rate_bpm.toFixed(0)} BPM`);
  }
  if (v.heart_rate_bpm) {
    parts.push(`Heart rate: ${v.heart_rate_bpm.toFixed(0)} BPM`);
  }

  if (pos?.fall_alert) parts.push("⚠️ FALL ALERT");
  if (pos?.lying) parts.push("Lying down");

  return parts.join(" · ");
}
