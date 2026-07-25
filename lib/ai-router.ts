/**
 * AI Router — 统一 AI 服务路由器 (v2)
 *
 * 新路由规则（6 服务）：
 * ┌─────────────────────────────────────────────────────────┐
 * │ ESP32 → Nosana(边缘去噪/FFT/初筛) → GMI(活动置信度推理) │
 * │       → Qwen(Agent 分级决策 + 日文配送指令)             │
 * │       → ai&(日本国内 GPU, 隐私推理, 数据不出境)          │
 * │       → Daytona(全栈线上部署)                           │
 * │       → Qoder(代码质量扫描)                             │
 * └─────────────────────────────────────────────────────────┘
 *
 * 降级链：每步都有 fallback，确保 demo 在任何配置下都能运行。
 */

import {
  isQwenConfigured,
  makeCareDecision,
  generateDeliveryInstruction,
  type AgentDecision,
  type DeliveryInstruction,
} from "@/lib/adapters/qwen";
import {
  isGmiConfigured,
  inferActivity,
  inferActivityStream,
  type CsiWindow,
  type ActivityInference,
  type ActivityTimeline,
} from "@/lib/adapters/gmi";
import {
  isDaytonaConfigured,
  getDeployStatus,
  checkDeployHealth,
  deployHackathonDemo,
  type DeployInfo,
  type DeployHealth,
} from "@/lib/adapters/daytona";
import {
  isNosanaConfigured,
  processOnEdge,
  remoteEdgeInference,
  type RawCsiFrame,
  type EdgeResult,
} from "@/lib/adapters/nosana";
import {
  isAiAndConfigured,
  getCulturalContext,
  assessPrivacyRisk,
  type CulturalContext,
  type PrivacyAssessment,
} from "@/lib/adapters/aiand";
import { checkRuViewHealth } from "@/lib/adapters/ruview-bridge";

/* ─── 服务健康检查 ─── */

export type ServiceStatus = {
  name: string;
  configured: boolean;
  role: string;
};

let _ruviewConnected = false;
checkRuViewHealth()
  .then((h) => { _ruviewConnected = h.connected; })
  .catch(() => {});

export function getAllServiceStatus(): ServiceStatus[] {
  return [
    { name: "Qwen Cloud", configured: isQwenConfigured(), role: "Agent 分级决策 + 配送指令" },
    { name: "GMI Cloud", configured: isGmiConfigured(), role: "CSI 活动置信度推理" },
    { name: "Daytona", configured: isDaytonaConfigured(), role: "全栈线上部署" },
    { name: "Nosana", configured: isNosanaConfigured(), role: "ESP32 边缘推理" },
    { name: "ai&", configured: isAiAndConfigured(), role: "日本国内 GPU 推理" },
    { name: "RuView CSI", configured: _ruviewConnected, role: "WiFi 硬件传感" },
  ];
}

/* ─── 完整关怀流水线 ─── */

/**
 * 端到端关怀流水线：
 * 1. Nosana 边缘处理 CSI 原始数据
 * 2. GMI Cloud 活动状态推理
 * 3. Qwen Agent 分级决策
 * 4. (如需要) ai& 文化语境 + 隐私评估
 * 5. Qwen 生成日文配送指令
 */
export type CareFlowResult = {
  edge: EdgeResult;
  activity?: ActivityInference;
  decision: AgentDecision;
  cultural?: CulturalContext;
  privacy?: PrivacyAssessment;
  delivery?: DeliveryInstruction;
  pipeline: string[];
};

export async function runCareFlow(
  rawFrames: RawCsiFrame[],
  roomId: string,
  options?: { timeOfDay?: string; residentInfo?: string }
): Promise<CareFlowResult> {
  const pipeline: string[] = [];
  const timeOfDay = options?.timeOfDay ?? getTimeOfDay();

  // Step 1: Nosana 边缘处理
  let edge: EdgeResult;
  if (isNosanaConfigured()) {
    try {
      edge = await remoteEdgeInference(rawFrames);
      pipeline.push("nosana:edge");
    } catch {
      edge = await processOnEdge(rawFrames);
      pipeline.push("nosana:local-fallback");
    }
  } else {
    edge = await processOnEdge(rawFrames);
    pipeline.push("nosana:software-only");
  }

  // Step 2: GMI Cloud 活动推理
  let activity: ActivityInference | undefined;
  if (isGmiConfigured() && edge.processedFrames.length > 0) {
    try {
      const window: CsiWindow = {
        frames: edge.processedFrames,
        durationSec: edge.processedFrames.length / 100,
        sampleRate: 100,
        roomId,
      };
      activity = await inferActivity(window);
      pipeline.push("gmi:inference");
    } catch {
      pipeline.push("gmi:failed");
    }
  }

  // Step 3: Qwen Agent 分级决策
  const sensorData = {
    motionLevel: edge.screening.motionLevel,
    stillDuration: edge.screening.stillDurationSec,
    anomalyScore: activity ? (1 - activity.confidence) : 0.5,
    posture: activity?.activity ?? "unknown",
    breathingBpm: edge.cloudPayload.breathingRate,
    heartBpm: edge.cloudPayload.heartRate,
    fallAlert: activity?.activity === "fall",
  };

  let decision: AgentDecision;
  if (isQwenConfigured()) {
    try {
      decision = await makeCareDecision(sensorData);
      pipeline.push("qwen:decision");
    } catch {
      decision = fallbackDecision(sensorData);
      pipeline.push("qwen:local-fallback");
    }
  } else {
    decision = fallbackDecision(sensorData);
    pipeline.push("qwen:unavailable");
  }

  // Step 4: ai& 文化语境（仅在 CHECK_IN 或更高级别触发）
  let cultural: CulturalContext | undefined;
  let privacy: PrivacyAssessment | undefined;
  if (
    (decision.tier === "CHECK_IN" || decision.tier === "ESCALATE") &&
    isAiAndConfigured()
  ) {
    try {
      cultural = await getCulturalContext(
        decision.reasoning,
        timeOfDay,
        options?.residentInfo ?? "elderly resident"
      );
      pipeline.push("aiand:cultural");
    } catch {
      pipeline.push("aiand:failed");
    }

    try {
      privacy = await assessPrivacyRisk(
        `Decision: ${decision.tier}, Activity: ${activity?.activity ?? "unknown"}`,
        "recent care log entries"
      );
      pipeline.push("aiand:privacy");
    } catch {
      pipeline.push("aiand:privacy-failed");
    }
  }

  // Step 5: Qwen 生成日文配送指令（仅在 CHECK_IN 时）
  let delivery: DeliveryInstruction | undefined;
  if (decision.tier === "CHECK_IN" && isQwenConfigured()) {
    try {
      delivery = await generateDeliveryInstruction(
        decision.reasoning,
        timeOfDay
      );
      pipeline.push("qwen:delivery");
    } catch {
      pipeline.push("qwen:delivery-failed");
    }
  }

  return { edge, activity, decision, cultural, privacy, delivery, pipeline };
}

/* ─── 单独路由函数（供各 API 路由调用） ─── */

// --- Nosana 边缘推理 ---
export async function runEdgeInference(frames: RawCsiFrame[]): Promise<EdgeResult> {
  if (isNosanaConfigured()) {
    try { return await remoteEdgeInference(frames); }
    catch { /* fallback */ }
  }
  return processOnEdge(frames);
}

// --- GMI 活动推理 ---
export async function runActivityInference(window: CsiWindow): Promise<ActivityInference> {
  if (!isGmiConfigured()) {
    return {
      activity: "unknown", confidence: 0.3,
      inferenceMs: 0, modelVersion: "unavailable", probabilities: {},
    };
  }
  return inferActivity(window);
}

export async function runActivityStream(windows: CsiWindow[]): Promise<ActivityTimeline> {
  if (!isGmiConfigured()) {
    return {
      roomId: windows[0]?.roomId ?? "unknown",
      entries: [], stillDurationSec: 0, motionIndex: 0, anomalyScore: 0,
    };
  }
  return inferActivityStream(windows);
}

// --- Qwen 决策 ---
export async function runCareDecision(sensorData: {
  motionLevel: number; stillDuration: number; anomalyScore: number;
  posture: string; breathingBpm?: number; heartBpm?: number; fallAlert: boolean;
}): Promise<AgentDecision> {
  if (isQwenConfigured()) {
    try { return await makeCareDecision(sensorData); }
    catch { /* fallback */ }
  }
  return fallbackDecision(sensorData);
}

// --- Qwen 配送指令 ---
export async function runDeliveryInstruction(
  situation: string, timeOfDay: string
): Promise<DeliveryInstruction> {
  if (!isQwenConfigured()) {
    return {
      bentoType: "幕の内弁当",
      shopNote: "Qwen 未配置 — 默认便当",
      courierMessage: "お届け物です。ご在宅でしょうか。",
      residentGreeting: "こんにちは、お弁当をお持ちしました。",
    };
  }
  return generateDeliveryInstruction(situation, timeOfDay);
}

// --- ai& 文化 + 隐私 ---
export async function getCareCulturalContext(
  situation: string, timeOfDay: string, residentInfo: string
): Promise<CulturalContext> {
  if (!isAiAndConfigured()) {
    return {
      bentoSuggestion: "幕の内弁当",
      politeGreeting: "ごめんください、お弁当をお届けに参りました。",
      culturalNotes: ["ai& not configured — default context"],
      timeAppropriate: true,
    };
  }
  return getCulturalContext(situation, timeOfDay, residentInfo);
}

export async function evaluatePrivacy(
  incidentSummary: string, careHistory: string
): Promise<PrivacyAssessment> {
  if (!isAiAndConfigured()) {
    return {
      needsHumanReview: true, riskLevel: "medium",
      recommendedAction: "Always request human review.",
      avoidActions: ["Do not share resident data outside Japan."],
    };
  }
  return assessPrivacyRisk(incidentSummary, careHistory);
}

// --- Daytona 部署 ---
export async function deployDemo(): Promise<{
  deploy: DeployInfo; dashboardUrl: string; apiEndpoint: string;
}> {
  if (!isDaytonaConfigured()) {
    throw new Error("Daytona not configured. Set DAYTONA_API_KEY.");
  }
  return deployHackathonDemo();
}

export async function getDeploymentStatus(id: string): Promise<DeployInfo> {
  if (!isDaytonaConfigured()) throw new Error("Daytona not configured.");
  return getDeployStatus(id);
}

export async function checkDeploymentHealth(url: string): Promise<DeployHealth> {
  return checkDeployHealth(url);
}

/* ─── 本地降级 ─── */

function fallbackDecision(sensorData: {
  motionLevel: number; stillDuration: number; anomalyScore: number;
  fallAlert: boolean;
}): AgentDecision {
  if (sensorData.fallAlert) {
    return {
      tier: "ESCALATE", confidence: 0.6,
      reasoning: "Fall detected — local heuristic (Qwen unavailable)",
      nextAction: "Notify family immediately",
      urgencyLevel: "critical",
    };
  }
  if (sensorData.stillDuration > 120) {
    return {
      tier: "CHECK_IN", confidence: 0.5,
      reasoning: `Prolonged stillness (${Math.round(sensorData.stillDuration)}s) — local heuristic`,
      nextAction: "Send bento delivery for check-in",
      urgencyLevel: "medium",
    };
  }
  if (sensorData.stillDuration > 60) {
    return {
      tier: "WATCH", confidence: 0.4,
      reasoning: `Extended stillness (${Math.round(sensorData.stillDuration)}s)`,
      nextAction: "Continue monitoring",
      urgencyLevel: "low",
    };
  }
  return {
    tier: "NORMAL", confidence: 0.5,
    reasoning: "Activity within normal range",
    nextAction: "No action needed",
    urgencyLevel: "low",
  };
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "early_morning";
  if (hour < 11) return "morning";
  if (hour < 14) return "lunch";
  if (hour < 17) return "afternoon";
  if (hour < 20) return "evening";
  return "night";
}
