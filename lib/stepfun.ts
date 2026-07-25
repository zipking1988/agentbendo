import {
  extractJsonObject,
  FLOOR_PLAN_SYSTEM_PROMPT,
  parseFloorPlanRoomsJson,
  type FloorPlanAnalyzeResult,
} from "@/lib/floor-plan-rooms";

function getConfig() {
  const apiKey = process.env.STEPFUN_API_KEY?.trim();
  // Step Plan keys use /step_plan/v1 — plain /v1 hits a different quota pool.
  const baseUrl = (
    process.env.STEPFUN_BASE_URL?.trim() || "https://api.stepfun.com/step_plan/v1"
  ).replace(/\/$/, "");
  const visionModel = process.env.STEPFUN_VISION_MODEL?.trim() || "step-3.7-flash";
  return { apiKey, baseUrl, visionModel };
}

export function isStepFunConfigured(): boolean {
  return Boolean(getConfig().apiKey);
}

type StepFunMessage = {
  content?: string | null;
  reasoning_content?: string | null;
};

type StepFunPayload = {
  choices?: Array<{
    finish_reason?: string;
    message?: StepFunMessage;
  }>;
  error?: { message?: string };
};

function pickJsonText(message: StepFunMessage | undefined): string {
  const content = message?.content?.trim() ?? "";
  if (content) return content;

  const reasoning = message?.reasoning_content?.trim() ?? "";
  if (!reasoning) return "";

  const fenced = reasoning.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);
  if (fenced?.[1]) return fenced[1].trim();

  const start = reasoning.indexOf('{"rooms"');
  const alt = start < 0 ? reasoning.indexOf('{ "rooms"') : start;
  if (alt >= 0) {
    const end = reasoning.lastIndexOf("}");
    if (end > alt) return reasoning.slice(alt, end + 1);
  }
  return "";
}

/**
 * Build a 2D room model from the user's floor-plan image.
 * Returns room regions only — does not redraw or duplicate the picture.
 */
export async function analyzeFloorPlanWithStepFun(
  imageDataUrl: string,
): Promise<FloorPlanAnalyzeResult> {
  const { apiKey, baseUrl, visionModel } = getConfig();
  if (!apiKey) {
    throw new Error("STEPFUN_API_KEY is not configured on the server.");
  }
  if (!imageDataUrl.startsWith("data:image/")) {
    throw new Error("Expected a data:image URL for floor-plan analysis.");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: visionModel,
      temperature: 0.1,
      max_tokens: 8192,
      reasoning_effort: "low",
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: FLOOR_PLAN_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Build a 2D room model from this floor plan. Locate living, kitchen, bedroom, and bathroom. Map i-ma to living, mater/master bedroom to bedroom, toilet/wet/powder room to bathroom. Return JSON only.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
    }),
  });

  const rawText = await response.text();
  let payload: StepFunPayload;
  try {
    payload = JSON.parse(rawText) as StepFunPayload;
  } catch {
    throw new Error(`StepFun returned non-JSON (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(payload.error?.message || `StepFun request failed (${response.status}).`);
  }

  const choice = payload.choices?.[0];
  const jsonText = pickJsonText(choice?.message);
  if (!jsonText) {
    throw new Error(
      `StepFun returned empty JSON content (finish_reason=${choice?.finish_reason ?? "unknown"}).`,
    );
  }

  const parsed = extractJsonObject(jsonText);
  const rooms = parseFloorPlanRoomsJson(parsed);
  const notes =
    parsed && typeof parsed === "object" && typeof (parsed as { notes?: unknown }).notes === "string"
      ? (parsed as { notes: string }).notes
      : undefined;

  return { rooms, model: visionModel, notes };
}
