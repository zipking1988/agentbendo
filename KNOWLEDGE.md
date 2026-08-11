# Agent Bento code knowledge

## Cloud architecture

Agent Bento runs as a native Next.js application on Vercel and uses two cloud AI services only:

1. **GMI Cloud** — serverless CSI activity inference from privacy-safe feature summaries.
2. **Qwen Cloud** — floor-plan vision, care-decision explanations, and Japanese delivery instructions.

Deterministic local logic remains available when either service is unavailable.
Vercel hosts the UI and server-side API routes; GMI and Qwen credentials must remain in Vercel environment variables.

## Module index

### `lib/ai-router.ts`

Orchestrates the complete care flow:

```text
ESP32 CSI
  → local feature extraction
  → Vercel API route
  → GMI Cloud activity inference
  → Qwen Cloud care decision
  → Qwen Cloud delivery instruction
  → deterministic fallback at every boundary
```

### `lib/csi-edge.ts`

Processes raw CSI locally. Only derived amplitudes, phase features, motion statistics, and signal quality are passed to GMI Cloud.

### `lib/adapters/gmi.ts`

GMI Cloud Inference Engine adapter for activity classification.

- Endpoint default: `https://api.gmi-serving.com/v1`
- Environment: `GMI_API_KEY`, `GMI_BASE_URL`, `GMI_CSI_MODEL`
- Selected model: `Qwen/Qwen3.8-Max` (flagship reasoning, vision, and text model verified in the account catalog on 2026-08-11).

### `lib/adapters/qwen.ts`

Qwen Cloud adapter for structured care decisions, Japanese delivery messages, and multimodal floor-plan analysis.

- Environment: `QWEN_API_KEY`, `QWEN_BASE_URL`, `QWEN_MODEL`, `QWEN_VISION_MODEL`
- Selected models: `qwen3.7-max` for reasoning and `qwen3.7-plus` for floor-plan vision.

## API routes

| Route | Purpose |
| --- | --- |
| `/api/floor-plan/analyze` | Qwen Cloud floor-plan vision |
| `/api/service-status` | GMI Cloud and Qwen Cloud readiness |
| `/api/incident/check-in` | Local features → GMI inference → Qwen decision |

## Safety rules

- Cloud model output never bypasses deterministic escalation policy.
- API keys remain server-side.
- Raw CSI is processed locally; use minimum necessary derived features.
- Every cloud failure must return to a safe, testable local path.
