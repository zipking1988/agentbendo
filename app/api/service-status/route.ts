import { getAllServiceStatus } from "@/lib/ai-router";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    services: getAllServiceStatus(),
    timestamp: new Date().toISOString(),
  });
}
