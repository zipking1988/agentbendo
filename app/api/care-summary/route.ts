import { runCareFlow } from "@/lib/ai-router";

export const runtime = "nodejs";

type SummaryBody = {
  logEntries?: string[];
  roomId?: string;
  /** 可选：提供 CSI 帧数据 */
  mockCsiFrames?: Array<{
    timestamp: number;
    rawAmplitude: number[];
    rawPhase: number[];
    rssi?: number;
  }>;
};

/** 生成模拟 CSI 数据 */
function generateMockCsiFrames(count = 20) {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: Date.now() - (count - i) * 100,
    rawAmplitude: Array.from({ length: 30 }, () => Math.random() * 5 + 10),
    rawPhase: Array.from({ length: 30 }, () => (Math.random() - 0.5) * Math.PI),
    rssi: -40 - Math.random() * 20,
    deviceId: "esp32-mock-001",
  }));
}

export async function POST(request: Request) {
  let body: SummaryBody;
  try {
    body = (await request.json()) as SummaryBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const roomId = body.roomId ?? "living-room";

  try {
    // 使用关怀流水线生成摘要
    const mockFrames = body.mockCsiFrames ?? generateMockCsiFrames();
    const flow = await runCareFlow(mockFrames, roomId);

    return Response.json({
      headline: `Care Status: ${flow.decision.tier}`,
      highlights: [
        `Motion level: ${flow.edge.screening.motionLevel}%`,
        `Still duration: ${flow.edge.screening.stillDurationSec}s`,
        `Edge alert: ${flow.edge.screening.edgeAlert}`,
        ...(flow.activity ? [`Activity: ${flow.activity.activity} (${Math.round(flow.activity.confidence * 100)}% confidence)`] : []),
        ...(body.logEntries ?? []).map((e, i) => `Log ${i + 1}: ${e}`),
      ],
      concernLevel: mapTierToConcern(flow.decision.tier),
      suggestion: flow.decision.nextAction,
      decision: flow.decision,
      pipeline: flow.pipeline,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Care summary failed.";
    return Response.json({ error: message }, { status: 503 });
  }
}

function mapTierToConcern(tier: string): string {
  switch (tier) {
    case "ESCALATE": return "high";
    case "CHECK_IN": return "medium";
    case "WATCH": return "low";
    default: return "none";
  }
}
