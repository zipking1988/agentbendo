import { checkRuViewHealth, fetchLatestSensing, mapRuViewToDemoFrame, buildCareNote } from "@/lib/adapters/ruview-bridge";

export const runtime = "nodejs";

export async function GET() {
  const [health, snapshot] = await Promise.all([
    checkRuViewHealth(),
    fetchLatestSensing(),
  ]);

  if (!health.connected) {
    return Response.json({
      connected: false,
      error: health.error,
      health: null,
      sensing: null,
    }, { status: 503 });
  }

  const frame = snapshot ? mapRuViewToDemoFrame(snapshot) : null;
  const note = snapshot ? buildCareNote(snapshot) : null;

  return Response.json({
    connected: true,
    health: health.health,
    sensing: snapshot,
    mapped: frame,
    careNote: note,
  });
}
