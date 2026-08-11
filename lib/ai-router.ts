/**
 * Agent Bento inference router.
 *
 * Runtime path:
 * ESP32 CSI → local privacy-safe feature extraction → GMI Cloud activity inference
 * → Qwen Cloud care decision → Qwen Cloud Japanese delivery instruction.
 *
 * Every cloud step has a deterministic local fallback so the safety flow and
 * hackathon demo remain functional when credentials or network access are absent.
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
  processOnDevice,
  type RawCsiFrame,
  type EdgeResult,
} from "@/lib/csi-edge";

export type ServiceStatus = {
  name: string;
  configured: boolean;
  role: string;
};

export function getAllServiceStatus(): ServiceStatus[] {
  return [
    { name: "GMI Cloud", configured: isGmiConfigured(), role: "CSI activity inference" },
    { name: "Qwen Cloud", configured: isQwenConfigured(), role: "Care decisions, floor plans, delivery" },
  ];
}

export type CareFlowResult = {
  edge: EdgeResult;
  activity?: ActivityInference;
  decision: AgentDecision;
  delivery?: DeliveryInstruction;
  pipeline: string[];
};

export async function runCareFlow(
  rawFrames: RawCsiFrame[],
  roomId: string,
  options?: { timeOfDay?: string; residentInfo?: string },
): Promise<CareFlowResult> {
  const pipeline: string[] = [];
  const timeOfDay = options?.timeOfDay ?? getTimeOfDay();

  const edge = await processOnDevice(rawFrames);
  pipeline.push("device:private-features");

  let activity: ActivityInference | undefined;
  if (isGmiConfigured() && edge.processedFrames.length > 0) {
    try {
      activity = await inferActivity({
        frames: edge.processedFrames,
        durationSec: edge.processedFrames.length / 100,
        sampleRate: 100,
        roomId,
      });
      pipeline.push("gmi:activity-inference");
    } catch {
      pipeline.push("gmi:deterministic-fallback");
    }
  } else {
    pipeline.push("gmi:unavailable");
  }

  const sensorData = {
    motionLevel: edge.screening.motionLevel,
    stillDuration: edge.screening.stillDurationSec,
    anomalyScore: activity ? 1 - activity.confidence : 0.5,
    posture: activity?.activity ?? "unknown",
    breathingBpm: edge.cloudPayload.breathingRate,
    heartBpm: edge.cloudPayload.heartRate,
    fallAlert: activity?.activity === "fall",
  };

  let decision: AgentDecision;
  if (isQwenConfigured()) {
    try {
      decision = await makeCareDecision(sensorData);
      pipeline.push("qwen:care-decision");
    } catch {
      decision = fallbackDecision(sensorData);
      pipeline.push("qwen:deterministic-fallback");
    }
  } else {
    decision = fallbackDecision(sensorData);
    pipeline.push("qwen:unavailable");
  }

  let delivery: DeliveryInstruction | undefined;
  if (decision.tier === "CHECK_IN") {
    delivery = await runDeliveryInstruction(decision.reasoning, timeOfDay);
    pipeline.push(isQwenConfigured() ? "qwen:delivery-instruction" : "delivery:local-fallback");
  }

  return { edge, activity, decision, delivery, pipeline };
}

export async function runEdgeInference(frames: RawCsiFrame[]): Promise<EdgeResult> {
  return processOnDevice(frames);
}

export async function runActivityInference(window: CsiWindow): Promise<ActivityInference> {
  if (!isGmiConfigured()) {
    return {
      activity: "unknown",
      confidence: 0.3,
      inferenceMs: 0,
      modelVersion: "deterministic-fallback",
      probabilities: {},
    };
  }
  return inferActivity(window);
}

export async function runActivityStream(windows: CsiWindow[]): Promise<ActivityTimeline> {
  if (!isGmiConfigured()) {
    return {
      roomId: windows[0]?.roomId ?? "unknown",
      entries: [],
      stillDurationSec: 0,
      motionIndex: 0,
      anomalyScore: 0,
    };
  }
  return inferActivityStream(windows);
}

export async function runCareDecision(sensorData: {
  motionLevel: number;
  stillDuration: number;
  anomalyScore: number;
  posture: string;
  breathingBpm?: number;
  heartBpm?: number;
  fallAlert: boolean;
}): Promise<AgentDecision> {
  if (isQwenConfigured()) {
    try {
      return await makeCareDecision(sensorData);
    } catch {
      // Continue to deterministic policy.
    }
  }
  return fallbackDecision(sensorData);
}

export async function runDeliveryInstruction(
  situation: string,
  timeOfDay: string,
): Promise<DeliveryInstruction> {
  if (isQwenConfigured()) {
    try {
      return await generateDeliveryInstruction(situation, timeOfDay);
    } catch {
      // Continue to the safe local message.
    }
  }
  return {
    bentoType: "幕の内弁当",
    shopNote: "高齢者宅への配達です。直接手渡しをお願いします。",
    courierMessage: "お届け先は高齢者宅です。応答がなければ指示に従ってください。",
    residentGreeting: "ごめんください、お弁当をお届けに参りました。",
  };
}

function fallbackDecision(sensorData: {
  motionLevel: number;
  stillDuration: number;
  anomalyScore: number;
  fallAlert: boolean;
}): AgentDecision {
  if (sensorData.fallAlert) {
    return {
      tier: "ESCALATE",
      confidence: 0.9,
      reasoning: "Fall signal detected by deterministic safety policy.",
      nextAction: "Notify the configured care contact.",
      urgencyLevel: "critical",
    };
  }
  if (sensorData.stillDuration > 120) {
    return {
      tier: "CHECK_IN",
      confidence: 0.75,
      reasoning: `Prolonged stillness (${Math.round(sensorData.stillDuration)}s).`,
      nextAction: "Send a bento delivery for a human check-in.",
      urgencyLevel: "medium",
    };
  }
  if (sensorData.stillDuration > 60 || sensorData.anomalyScore > 0.5) {
    return {
      tier: "WATCH",
      confidence: 0.65,
      reasoning: "Activity differs from the resident's recent baseline.",
      nextAction: "Continue monitoring at a higher frequency.",
      urgencyLevel: "low",
    };
  }
  return {
    tier: "NORMAL",
    confidence: 0.85,
    reasoning: "Activity remains within the expected range.",
    nextAction: "Continue routine monitoring.",
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
