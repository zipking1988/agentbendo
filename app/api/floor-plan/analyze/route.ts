import { analyzeFloorPlanWithQwen, isQwenConfigured } from "@/lib/adapters/qwen";

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
    if (isQwenConfigured()) {
      const result = await analyzeFloorPlanWithQwen(imageDataUrl);
      return Response.json({
        rooms: result.rooms,
        model: result.model,
        notes: result.notes ?? null,
        simulated: false,
        provider: "qwen-cloud",
      });
    }

    return Response.json(
      { error: "Qwen Cloud floor-plan vision is not configured. Set QWEN_API_KEY." },
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
