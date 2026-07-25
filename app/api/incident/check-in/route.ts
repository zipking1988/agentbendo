import {
  runCareFlow,
  runDeliveryInstruction,
} from "@/lib/ai-router";

export const runtime = "nodejs";

type CheckInBody = {
  incidentId?: string;
  residentAddress?: string;
  situation?: string;
  timeOfDay?: string;
  residentInfo?: string;
  careHistory?: string;
  roomId?: string;
  /** 模拟 CSI 帧（黑客松 demo 用） */
  mockCsiFrames?: Array<{
    timestamp: number;
    rawAmplitude: number[];
    rawPhase: number[];
    rssi?: number;
  }>;
};

/** 生成模拟 CSI 数据（demo 用） */
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
  let body: CheckInBody;
  try {
    body = (await request.json()) as CheckInBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const incidentId = body.incidentId ?? `inc-${Date.now()}`;
  const roomId = body.roomId ?? "living-room";
  const timeOfDay = body.timeOfDay ?? getTimeOfDay();
  const situation = body.situation ?? "Unusual silence detected";

  try {
    // 使用完整关怀流水线
    const mockFrames = body.mockCsiFrames ?? generateMockCsiFrames();
    const careFlow = await runCareFlow(mockFrames, roomId, {
      timeOfDay,
      residentInfo: body.residentInfo,
    });

    // 如果需要配送指令，额外生成
    let delivery = careFlow.delivery;
    if (careFlow.decision.tier === "CHECK_IN" && !delivery) {
      delivery = await runDeliveryInstruction(situation, timeOfDay);
    }

    return Response.json({
      incidentId,
      careFlow: {
        edge: {
          motionLevel: careFlow.edge.screening.motionLevel,
          stillDurationSec: careFlow.edge.screening.stillDurationSec,
          edgeAlert: careFlow.edge.screening.edgeAlert,
          breathingRate: careFlow.edge.cloudPayload.breathingRate,
          heartRate: careFlow.edge.cloudPayload.heartRate,
          localOnly: careFlow.edge.localOnly,
        },
        activity: careFlow.activity,
        decision: careFlow.decision,
        delivery,
        pipeline: careFlow.pipeline,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Check-in failed.";
    return Response.json({ error: message }, { status: 503 });
  }
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
