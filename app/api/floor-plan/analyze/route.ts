import { isStepFunConfigured, analyzeFloorPlanWithStepFun } from "@/lib/stepfun";
import { isQwenConfigured } from "@/lib/adapters/qwen";

export const runtime = "nodejs";

type AnalyzeBody = { imageDataUrl?: string };

export async function POST(request: Request) {
  let body: AnalyzeBody;
  try {
    body = (await request.json()) as AnalyzeBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const imageDataUrl = body.imageDataUrl;
  if (!imageDataUrl || typeof imageDataUrl !== "string") {
    return Response.json({ error: "imageDataUrl is required." }, { status: 400 });
  }
  if (imageDataUrl.length > 7_000_000) {
    return Response.json({ error: "Image is too large for analysis." }, { status: 413 });
  }

  try {
    // 优先使用 StepFun 做户型图识别
    if (isStepFunConfigured()) {
      const result = await analyzeFloorPlanWithStepFun(imageDataUrl);
      return Response.json({
        rooms: result.rooms,
        model: result.model,
        notes: result.notes ?? null,
        simulated: false,
        provider: "stepfun",
      });
    }

    // Qwen 也可用于视觉分析（如果配置了的话）
    if (isQwenConfigured()) {
      return Response.json({
        rooms: [],
        model: "qwen-vl",
        notes: "Qwen configured but floor plan vision not yet implemented for v2. Configure STEPFUN_API_KEY for floor plan analysis.",
        simulated: false,
        provider: "qwen",
      });
    }

    return Response.json(
      { error: "No floor plan vision service configured. Set STEPFUN_API_KEY or QWEN_API_KEY." },
      { status: 503 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Floor-plan analysis failed.";
    const quota = /quota|billing|balance|credit|insufficient/i.test(message);
    const noConfig = /not configured|no .* service/i.test(message);
    return Response.json(
      { error: message },
      { status: quota ? 402 : noConfig ? 503 : 502 },
    );
  }
}
