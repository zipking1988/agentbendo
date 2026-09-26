# Agent Bento

Agent Bento is a privacy-first home safety demo for older adults who live independently. It uses ambient Wi-Fi movement signals to notice unusual silence, asks for a friendly human check-in through a bento delivery, and alerts family only when the situation remains unresolved.

The hackathon experience combines an interactive 3D Japanese home, a visible fall scenario, a family dashboard, privacy-safe CSI feature processing, and a deterministic escalation policy.

## Architecture

```text
ESP32 / RuView bridge / demo CSI frames
                  ↓
Local privacy-safe feature extraction
                  ↓
Vercel Next.js server and API routes
        ├─ GMI Cloud: activity inference
        └─ Qwen Cloud: floor-plan vision, care decisions, Japanese delivery copy
                  ↓
Deterministic safety policy and fallbacks
                  ↓
3D story, family dashboard, bento check-in, family escalation
```

### Service responsibilities

| Service | Responsibility |
| --- | --- |
| Vercel | Hosts the Next.js application and server-side API routes. Secrets stay in Vercel environment variables. |
| GMI Cloud | Runs server-side inference over privacy-safe CSI feature summaries and returns activity classification and confidence. |
| Qwen Cloud | Detects rooms from floor-plan images, produces structured care decisions, and generates Japanese delivery instructions. |

Raw API keys are never sent to the browser. The safety policy remains deterministic: generated output can explain or enrich a decision, but it cannot bypass the escalation rules.

## What works

- Responsive landing experience that explains the product immediately.
- Interactive 3D cutaway Japanese house with normal, fall, and courier states.
- Visible resident, Wi-Fi signal paths, bento courier check-in, and family all-clear story.
- Floor-plan upload and room detection through Qwen Cloud.
- Privacy-safe local CSI preprocessing before GMI Cloud inference.
- GMI Cloud activity classification with deterministic fallback behavior.
- Qwen Cloud care decisions and Japanese delivery instructions.
- Vercel-compatible Next.js route handlers.
- Browser-only dashboard setup stored in `localStorage`.
- Unit, production-build, and server-render tests.

The CSI sensor stream, courier dispatch, and family notification are simulated for the hackathon. A real pilot still requires calibrated hardware, persistent incident storage, delivery/notification integrations, consent workflows, and field testing.

## Prerequisites

- Node.js 22.13 or newer
- npm
- A GMI Cloud account and API key for live activity inference
- A Qwen Cloud API key for floor-plan vision and live care reasoning
- A Vercel account for deployment

The landing page and deterministic care fallback work without cloud credentials. Qwen credentials are required to analyze a newly uploaded floor plan. The selected GMI model has a default, so GMI is considered configured when `GMI_API_KEY` is present.

## Local setup

1. Clone the repository and enter the project directory.

   ```bash
   git clone <your-repository-url>
   cd AgentBento
   ```

2. Install the exact dependency versions from the lockfile.

   ```bash
   npm ci
   ```

3. Create a local environment file.

   ```bash
   cp .env.example .env.local
   ```

4. Add your server-side credentials to `.env.local`.

   ```bash
   GMI_API_KEY=your_gmi_key
   GMI_BASE_URL=https://api.gmi-serving.com/v1
   GMI_CSI_MODEL=Qwen/Qwen3.8-Max

   QWEN_API_KEY=your_qwen_key
   QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
   QWEN_MODEL=qwen3.7-max
   QWEN_VISION_MODEL=qwen3.7-plus
   ```

   Never prefix these keys with `NEXT_PUBLIC_`; that would expose them to the browser. Do not commit `.env.local`.

5. Find a GMI model ID available to your account.

   ```bash
   curl "$GMI_BASE_URL/models" \
     -H "Authorization: Bearer $GMI_API_KEY"
   ```

   `Qwen/Qwen3.8-Max` was selected from the live GMI catalog as the flagship reasoning, vision, and text model. Agent Bento currently sends privacy-safe CSI feature summaries to it and validates the returned activity JSON. You can replace it with another returned model `id` when optimizing cost or latency.

6. Start the development server.

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000).

## How to use the demo

### Product landing

1. Open `/`.
2. Review the privacy-first promise and the normal-home status in the hero.
3. Follow the three care steps: notice a change, send a human check-in, and keep family informed.
4. Select **See the family experience** to open the interactive dashboard demo.

### Family dashboard

1. Open `/dashboard` or select **Open family demo**.
2. Review the preloaded sample floor plan and router position, then select **Start demo**.
3. Replay the sofa-nap check-in and watch the resident marker move through the mapped rooms.
4. Open **Technical demo details** to inspect the simulated Wi-Fi movement trace, stillness, and change score.
5. To use another layout, choose **Change floor plan**, then **Use my own plan** and upload a PNG, JPG, or WebP image.
6. Qwen Cloud identifies the living room, kitchen, bedroom, and bathroom before router placement.

Dashboard setup is stored only in the current browser under `agent-bento.home-setup.v4`. Clear that `localStorage` entry to repeat onboarding from the beginning.

## Server API usage

All routes run on the Vercel-hosted Next.js server.

### Check cloud configuration

```bash
curl http://localhost:3000/api/service-status
```

The response lists exactly GMI Cloud and Qwen Cloud and reports whether each service has the required environment variables.

### Run the care pipeline

```bash
curl -X POST http://localhost:3000/api/care-summary \
  -H "Content-Type: application/json" \
  -d '{"roomId":"bathroom","logEntries":["Unusual silence detected"]}'
```

If no `mockCsiFrames` are supplied, the route creates demo frames. The response includes local edge screening, optional GMI inference, the Qwen or deterministic decision, and a `pipeline` array showing which path ran.

### Create a check-in decision

```bash
curl -X POST http://localhost:3000/api/incident/check-in \
  -H "Content-Type: application/json" \
  -d '{"incidentId":"demo-001","roomId":"bathroom","situation":"Unusual silence detected","timeOfDay":"lunch"}'
```

### Analyze a floor plan

`POST /api/floor-plan/analyze` expects JSON containing an `imageDataUrl` such as `data:image/png;base64,...`. This route requires `QWEN_API_KEY`; the dashboard prepares the data URL automatically.

### Optional hardware bridge

`GET /api/ruview` checks the optional `RUVIEW_API_URL`. For local development it can point to a LAN bridge. On Vercel it must be a publicly reachable HTTPS endpoint—`localhost` and `.local` addresses refer to the serverless environment and will not reach your home device.

## Testing and quality checks

```bash
npm run lint             # ESLint
npm run build            # Native Next.js production build
npm test                 # Unit tests, production build, and rendered-page test
npm run test:floor-plan  # Live Qwen regression; requires npm run dev and QWEN_API_KEY
```

To test the floor-plan route on a non-default local URL:

```bash
AGENT_BENTO_BASE_URL=http://localhost:3001 npm run test:floor-plan
```

## Deploy to Vercel

### Option A: Vercel dashboard

1. Push the repository to your Git provider.
2. In Vercel, select **Add New → Project** and import the repository.
3. Keep the detected framework as **Next.js**.
4. Add these environment variables in **Project Settings → Environment Variables**:
   - `GMI_API_KEY`
   - `GMI_BASE_URL`
   - `GMI_CSI_MODEL`
   - `QWEN_API_KEY`
   - `QWEN_BASE_URL`
   - `QWEN_MODEL`
   - `QWEN_VISION_MODEL`
   - `RUVIEW_API_URL` and `RUVIEW_TIMEOUT` only when using a public hardware bridge
5. Add the variables to Production, Preview, and Development as appropriate. Do not give preview deployments production-only credentials unless necessary.
6. Select **Deploy**.

Future pushes to the production branch create production deployments; other branches and pull requests create preview deployments.

### Option B: Vercel CLI

```bash
npm install --global vercel
vercel login
vercel link
vercel env add GMI_API_KEY
vercel env add GMI_CSI_MODEL
vercel env add QWEN_API_KEY
vercel env pull .env.local
vercel deploy
```

After verifying the preview deployment:

```bash
vercel --prod
```

The non-secret base URLs and model names can also be added through the Vercel dashboard. Re-run `vercel env pull .env.local --yes` after changing project environment variables.

## Troubleshooting

### GMI Cloud shows “not configured”

- Confirm `GMI_API_KEY` is set and the account has enough GMI inference credit.
- Verify the model ID using `GET https://api.gmi-serving.com/v1/models`.
- Restart `npm run dev` after editing `.env.local`.
- On Vercel, redeploy after adding or changing environment variables.

### Floor-plan analysis returns HTTP 503

- Set `QWEN_API_KEY` on the server.
- Confirm `QWEN_VISION_MODEL` is available to the account.
- Check that the uploaded file is a supported image and small enough for a serverless request.

### The demo runs but uses fallbacks

This is expected when cloud keys are absent or a provider request fails. Inspect the `pipeline` field returned by `/api/care-summary` or `/api/incident/check-in` to see whether GMI, Qwen, or deterministic fallback logic handled each step.

### Vercel deployment cannot reach the hardware bridge

Vercel cannot connect to a laptop-only `localhost` or LAN `.local` address. Expose the bridge through an authenticated HTTPS endpoint, or leave `RUVIEW_API_URL` empty and use demo CSI frames.

## Safety and privacy

- No cameras or audio recordings are required.
- Raw CSI is processed locally; cloud services receive derived feature summaries.
- API credentials remain server-side.
- Resident consent and configurable contacts are required for a real deployment.
- Generated recommendations never override deterministic safety rules.
- Agent Bento is an assistive safety concept, not a medical diagnosis device.

## Repository map

```text
app/                         Next.js product landing, dashboard, and API routes
app/api/                     Vercel-hosted server endpoints
lib/csi-edge.ts              Local privacy-safe CSI feature extraction
lib/ai-router.ts             GMI → Qwen → deterministic fallback orchestration
lib/adapters/gmi.ts          GMI Cloud inference client
lib/adapters/qwen.ts         Qwen Cloud vision and reasoning client
public/data/                 Simulated monitoring story
public/fixtures/             Floor-plan regression fixture
scripts/                     Live integration regression scripts
tests/                       Unit and production-render tests
docs/                        Presentation and FAQ source material
AGENT.md                     Product, architecture, and engineering worklog
vercel.json                  Vercel framework configuration
```

## Production roadmap

1. Connect calibrated ESP32-S3 CSI input through an authenticated public event bridge.
2. Deploy and validate a CSI-specific activity model through a dedicated GMI endpoint.
3. Add persistent residents, consent, incidents, actions, and acknowledgements.
4. Add idempotent delivery ordering and courier-response webhooks.
5. Add family notification delivery, acknowledgement, retries, and audit logs.
6. Complete privacy, accessibility, failure-mode, and care-professional field testing.
