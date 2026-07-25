/**
 * ai& 日本国内 GPU 推理适配器
 * 用途：数据不出境推理、日本文化语境、隐私安全评估
 */

function getAiAndConfig() {
  return {
    apiKey: process.env.AIAND_API_KEY?.trim() ?? "",
    baseUrl: (process.env.AIAND_BASE_URL?.trim() || "https://api.ai-and.com/v1").replace(/\/$/, ""),
    model: process.env.AIAND_MODEL?.trim() || "aiand-japanese-v1",
  };
}
export function isAiAndConfigured(): boolean { return Boolean(getAiAndConfig().apiKey); }

type AiAndResponse = { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };

async function callAiAnd(systemPrompt: string, userMessage: string, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
  const { apiKey, baseUrl, model } = getAiAndConfig();
  if (!apiKey) throw new Error("AIAND_API_KEY not configured.");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, temperature: options?.temperature ?? 0.4, max_tokens: options?.maxTokens ?? 2048, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }] }),
  });
  const rawText = await response.text();
  let payload: AiAndResponse;
  try { payload = JSON.parse(rawText) as AiAndResponse; } catch { throw new Error(`ai& non-JSON (${response.status}).`); }
  if (!response.ok) throw new Error(payload.error?.message || `ai& failed (${response.status}).`);
  return payload.choices?.[0]?.message?.content?.trim() ?? "";
}

/* ─── 日本文化语境 ─── */
export type CulturalContext = { bentoSuggestion: string; politeGreeting: string; culturalNotes: string[]; timeAppropriate: boolean };

export async function getCulturalContext(situation: string, timeOfDay: string, residentInfo: string): Promise<CulturalContext> {
  try {
    const jsonText = await callAiAnd(
      "あなたは日本の高齢者ケアアシスタントです。状況に応じて適切な文化的配慮をJSONで提供してください: { \"bentoSuggestion\":\"...\", \"politeGreeting\":\"...\", \"culturalNotes\":[\"...\"], \"timeAppropriate\":true/false }",
      `Situation: ${situation}\nTime: ${timeOfDay}\nResident: ${residentInfo}`, { temperature: 0.3 });
    const parsed = JSON.parse(jsonText) as CulturalContext;
    return {
      bentoSuggestion: parsed.bentoSuggestion ?? "幕の内弁当",
      politeGreeting: parsed.politeGreeting ?? "ごめんください、お弁当をお届けに参りました。",
      culturalNotes: Array.isArray(parsed.culturalNotes) ? parsed.culturalNotes : ["靴を脱ぐ習慣に注意","静かな声で対応"],
      timeAppropriate: parsed.timeAppropriate ?? true,
    };
  } catch {
    return { bentoSuggestion: "季節のお弁当", politeGreeting: "ごめんください、お弁当をお届けに参りました。", culturalNotes: ["日本の高齢者宅マナーを遵守"], timeAppropriate: true };
  }
}

/* ─── 隐私安全推理 ─── */
export type PrivacyAssessment = { needsHumanReview: boolean; riskLevel: "low" | "medium" | "high"; recommendedAction: string; avoidActions: string[] };

export async function assessPrivacyRisk(incidentSummary: string, careHistory: string): Promise<PrivacyAssessment> {
  try {
    const jsonText = await callAiAnd(
      "You assess privacy risk for Japanese elderly care. Return JSON: { \"needsHumanReview\":true/false, \"riskLevel\":\"low|medium|high\", \"recommendedAction\":\"...\", \"avoidActions\":[\"...\"] }",
      `Incident: ${incidentSummary}\nHistory: ${careHistory}`, { temperature: 0.2 });
    const parsed = JSON.parse(jsonText) as PrivacyAssessment;
    return {
      needsHumanReview: parsed.needsHumanReview ?? true,
      riskLevel: ["low","medium","high"].includes(parsed.riskLevel) ? parsed.riskLevel : "medium",
      recommendedAction: parsed.recommendedAction ?? "Dispatch bento check-in.",
      avoidActions: Array.isArray(parsed.avoidActions) ? parsed.avoidActions : ["Do not share resident data outside Japan."],
    };
  } catch {
    return { needsHumanReview: true, riskLevel: "medium", recommendedAction: "Follow standard bento check-in protocol.", avoidActions: ["Do not share resident data outside Japan."] };
  }
}
