/**
 * Qwen Cloud — Agent 分级决策推理 + 日文配送指令生成
 *
 * 用途：
 * 1. 根据 CSI 活动状态做分级决策 (NORMAL→WATCH→CHECK_IN→ESCALATE)
 * 2. 生成日文配送指令（便当类型、敬语备注）
 *
 * API: 阿里云 DashScope
 * 模型: qwen3.7-max / qwen3.7-plus
 */

import {
  extractJsonObject,
  FLOOR_PLAN_SYSTEM_PROMPT,
  parseFloorPlanRoomsJson,
  type FloorPlanAnalyzeResult,
} from "@/lib/floor-plan-rooms";

function getQwenConfig() {
  return {
    apiKey: process.env.QWEN_API_KEY?.trim() ?? "",
    baseUrl: (process.env.QWEN_BASE_URL?.trim() || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1").replace(/\/$/, ""),
    model: process.env.QWEN_MODEL?.trim() || "qwen3.7-max",
    visionModel: process.env.QWEN_VISION_MODEL?.trim() || "qwen3.7-plus",
  };
}

export function isQwenConfigured(): boolean { return Boolean(getQwenConfig().apiKey); }

type QwenContent = string | Array<
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } }
>;

type QwenResponse = { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };

async function callQwen(
  systemPrompt: string,
  userMessage: QwenContent,
  temp = 0.3,
  maxTokens = 2048,
  modelOverride?: string,
): Promise<string> {
  const { apiKey, baseUrl, model } = getQwenConfig();
  if (!apiKey) throw new Error("QWEN_API_KEY not configured.");
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelOverride ?? model,
      temperature: temp,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
    }),
  });
  const raw = await res.text();
  let p: QwenResponse;
  try { p = JSON.parse(raw) as QwenResponse; } catch { throw new Error(`Qwen non-JSON (${res.status}).`); }
  if (!res.ok) throw new Error(p.error?.message || `Qwen error ${res.status}`);
  return p.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function analyzeFloorPlanWithQwen(imageDataUrl: string): Promise<FloorPlanAnalyzeResult> {
  const { visionModel } = getQwenConfig();
  if (!imageDataUrl.startsWith("data:image/")) {
    throw new Error("Expected a data:image URL for floor-plan analysis.");
  }
  const jsonText = await callQwen(
    FLOOR_PLAN_SYSTEM_PROMPT,
    [
      {
        type: "text",
        text: "Locate living, kitchen, bedroom, and bathroom. Return the required JSON only.",
      },
      { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
    ],
    0.1,
    4096,
    visionModel,
  );
  const parsed = extractJsonObject(jsonText);
  const rooms = parseFloorPlanRoomsJson(parsed);
  const notes = parsed && typeof parsed === "object" && typeof (parsed as { notes?: unknown }).notes === "string"
    ? (parsed as { notes: string }).notes
    : undefined;
  return { rooms, model: visionModel, notes };
}

/* ─── 分级决策推理 ─── */

export type DecisionTier = "NORMAL" | "WATCH" | "CHECK_IN" | "ESCALATE";

export type AgentDecision = {
  tier: DecisionTier;
  confidence: number;
  reasoning: string;
  nextAction: string;
  urgencyLevel: "low" | "medium" | "high" | "critical";
};

const DECISION_PROMPT = `You are the Agent Bento care decision engine for elderly monitoring in Japan.
Given CSI sensor readings (motion level, stillness duration, anomaly score, posture, vitals),
classify the situation into one tier and recommend the next action.

Tier definitions:
- NORMAL: Resident is moving normally. Continue routine monitoring.
- WATCH: Unusual stillness or anomaly. Increase observation frequency.
- CHECK_IN: Sustained anomaly + stillness threshold. Dispatch bento courier.
- ESCALATE: Fall detected or no response to check-in. Alert family/emergency.

Return ONLY JSON:
{
  "tier": "NORMAL|WATCH|CHECK_IN|ESCALATE",
  "confidence": 0.0-1.0,
  "reasoning": "brief Japanese-context explanation in English",
  "nextAction": "specific next step",
  "urgencyLevel": "low|medium|high|critical"
}`;

export async function makeCareDecision(sensorData: {
  motionLevel: number;
  stillDuration: number;
  anomalyScore: number;
  posture: string;
  breathingBpm?: number;
  heartBpm?: number;
  fallAlert: boolean;
}): Promise<AgentDecision> {
  const context = [
    `Motion: ${Math.min(100, Math.max(0, sensorData.motionLevel)).toFixed(0)}%`,
    `Still: ${sensorData.stillDuration}s`,
    `Anomaly: ${(sensorData.anomalyScore * 100).toFixed(0)}%`,
    `Posture: ${sensorData.posture}`,
    sensorData.breathingBpm ? `Breathing: ${sensorData.breathingBpm} BPM` : "",
    sensorData.heartBpm ? `Heart: ${sensorData.heartBpm} BPM` : "",
    `FallAlert: ${sensorData.fallAlert}`,
  ].filter(Boolean).join(", ");

  try {
    const jsonText = await callQwen(DECISION_PROMPT, context, 0.2);
    const parsed = JSON.parse(jsonText) as AgentDecision;
    return {
      tier: ["NORMAL","WATCH","CHECK_IN","ESCALATE"].includes(parsed.tier) ? parsed.tier : "WATCH",
      confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.7)),
      reasoning: parsed.reasoning ?? "Standard protocol applied.",
      nextAction: parsed.nextAction ?? "Continue monitoring.",
      urgencyLevel: ["low","medium","high","critical"].includes(parsed.urgencyLevel) ? parsed.urgencyLevel : "medium",
    };
  } catch {
    // Deterministic fallback
    if (sensorData.fallAlert) return { tier: "ESCALATE", confidence: 1.0, reasoning: "Fall alert triggered.", nextAction: "Emergency protocol.", urgencyLevel: "critical" };
    if (sensorData.stillDuration > 480) return { tier: "CHECK_IN", confidence: 0.85, reasoning: "Stillness > 8min threshold.", nextAction: "Dispatch bento courier.", urgencyLevel: "high" };
    if (sensorData.anomalyScore > 0.5) return { tier: "WATCH", confidence: 0.7, reasoning: "Anomaly elevated.", nextAction: "Increase monitoring.", urgencyLevel: "medium" };
    return { tier: "NORMAL", confidence: 0.9, reasoning: "Routine activity.", nextAction: "Continue monitoring.", urgencyLevel: "low" };
  }
}

/* ─── 日文配送指令生成 ─── */

export type DeliveryInstruction = {
  bentoType: string;
  shopNote: string;
  courierMessage: string;
  residentGreeting: string;
};

const DELIVERY_PROMPT = `あなたは日本の高齢者見守りサービス「Agent Bento」の配送指示アシスタントです。
状況に応じて、最適な弁当タイプ、店舗への備考、配達員へのメッセージ、住民への挨拶を生成してください。

Return ONLY JSON:
{
  "bentoType": "specific bento name in Japanese",
  "shopNote": "note for convenience store staff in Japanese",
  "courierMessage": "message for courier in Japanese",
  "residentGreeting": "keigo greeting for resident in Japanese"
}`;

export async function generateDeliveryInstruction(
  situation: string,
  timeOfDay: string,
): Promise<DeliveryInstruction> {
  const msg = `Situation: ${situation}\nTime: ${timeOfDay}\nGenerate a culturally appropriate bento delivery instruction.`;

  try {
    const jsonText = await callQwen(DELIVERY_PROMPT, msg, 0.4, 1024);
    const parsed = JSON.parse(jsonText) as DeliveryInstruction;
    return {
      bentoType: parsed.bentoType ?? "季節の幕の内弁当",
      shopNote: parsed.shopNote ?? "高齢者宅への配達です。インターホンを押して直接手渡しをお願いします。",
      courierMessage: parsed.courierMessage ?? "お世話になります。お届け先は高齢の方がお一人でお住まいです。",
      residentGreeting: parsed.residentGreeting ?? "ごめんください、お弁当のお届けに参りました。ご家族様からのご依頼です。",
    };
  } catch {
    return {
      bentoType: "季節の幕の内弁当",
      shopNote: "高齢者宅への配達。直接手渡し希望。",
      courierMessage: "お届け先は高齢者宅です。チャイムを鳴らして対面でお渡しください。",
      residentGreeting: "ごめんください、お弁当をお届けに参りました。",
    };
  }
}
