# Agent Bento Project Guide

## 1. Project purpose

Agent Bento is a privacy-first home safety system for older adults who live alone or spend long periods independently. Ambient Wi-Fi sensing looks for meaningful changes in movement without using cameras or microphones. When an unusual period of silence persists, the system follows a staged care path: verify the signal, arrange a bento delivery as a friendly human check-in, and notify trusted contacts only if the resident does not respond.

The product promise is:

> Notice unusual silence, send human care, and escalate only when needed.

This repository currently contains the interactive web experience and the foundation for a future service layer. Treat the experience as a truthful product prototype, not as proof that hardware, ordering, or alert integrations are already live.

## 2. Product before demo

Always prioritize a functioning and safe care workflow before improving presentation.

Engineering priority order:

1. Correct incident state and reliable transitions.
2. Resident consent, privacy, and control.
3. Deterministic risk and escalation policy.
4. Reliable dispatch, acknowledgement, retries, and audit history.
5. Clear interfaces for residents, family, couriers, and operators.
6. Model-assisted explanations and suggestions.
7. Demo pacing, animation, and visual polish.

The demo must use the same domain states and API contracts as the functioning product. Do not build a separate fake architecture that cannot later accept real sensor and service events.

## 3. Truthfulness labels

Use these labels in planning and documentation:

- **Implemented**: runs in this repository and is covered by a meaningful check.
- **Simulated**: behaves realistically but uses local or scripted data.
- **Planned**: architecture or intent only; it is not available yet.

Never describe simulated sensing, ordering, courier arrival, family alerts, or model decisions as live integrations.

## 4. Core care workflow

The production state machine should be explicit and persisted:

```text
NORMAL
WATCH
CHECK_IN_REQUESTED
CHECK_IN_EN_ROUTE
RESIDENT_RESPONDED
FAMILY_ALERTED
HANDOFF_COMPLETE
ESCALATED
RESOLVED
```

Every transition must record:

- incident ID and resident ID
- previous and next state
- source event and timestamp
- deterministic rule that allowed the transition
- confidence and relevant sensor features
- action requested and provider response
- actor, acknowledgement, and resolution reason

Repeated events and webhooks must be idempotent. A retry must not create duplicate orders or duplicate incidents.

## 5. Decision boundaries

### Deterministic policy owns

- inactivity thresholds and quiet-hour behavior
- minimum evidence for opening an incident
- escalation timing and retry limits
- contact order and notification channels
- emergency boundaries
- consent checks and disabled actions
- final permission to dispatch or escalate

### Qwen may assist with

- summarizing recent sensor and incident context
- producing a plain-language explanation for family or operators
- ranking allowed next actions
- translating a structured incident into localized messages
- identifying missing information for a human reviewer

Model output must use a versioned structured schema, be validated before use, have a timeout, and have a deterministic fallback. It must never directly bypass policy or initiate an emergency action by itself.

## 6. Current implementation

### Implemented

- Next.js / React product landing experience.
- Landing 3D cutaway home (React Three Fiber): Japanese home art direction, three story states, Wi‑Fi signal paths, camera presets, status rail, reduced motion.
- Landing “Inspired by My Grandma” stylized 3D portrait and why-it-works section.
- CTA into the family dashboard (`/dashboard`).
- Family dashboard home setup (localStorage `agent-bento.home-setup.v4`):
  1. Upload a floor-plan photo/sketch
  2. StepFun vision detects living / kitchen / bedroom / bathroom boxes on that upload
  3. Confirm rooms → pin Wi‑Fi → unlock monitoring
- **Monitoring map = the user’s uploaded image** only (no colored room overlays, no room-name chips, no fake grid, no AI redraw, no dashboard 3D).
- Room regions stay as invisible data for presence: simulated story beats map Grandpa into those boxes via `mapPresence()`.
- Monitoring shows a high-contrast Grandpa marker (lime + dark outline + label) and the Wi‑Fi pin on the upload; **Re-upload floor plan** clears setup.
- Family monitoring hybrid: calm “is Grandpa OK?” view plus simulated story replay from `demo_frames.json`.
- Dashboard **CSI field** (Three.js): Matrix-style wire skeletons + cyan wave spheres + lime heatmap grid + particle fog + HUD — synthetic RF from demo motion (**Simulated**; not live CSI / not clinical vitals).
- Privacy copy on first screen; production build and rendered HTML tests.
- Floor-plan room / parse / CSI-sim unit tests.

### Simulated

- Landing story: normal movement, long silence, bento dispatch, family all-clear
- Dashboard care story replay from local `demo_frames.json`
- StepFun vision floor-plan → room boxes (`/api/floor-plan/analyze`; needs `STEPFUN_API_KEY`)
- Browser-only floor-plan upload, room model, and Wi‑Fi pin (not device calibration)
- CSI visual field from synthetic multipath / Doppler-style rules + demo `motionLevel` / stillness / anomaly (not ESP32 CSI)

### Planned

- Better auto room accuracy (adjust / re-prompt without full manual labeling)
- Family acknowledgement and quiet-hour controls
- Shared incident types and deterministic transition engine behind the dashboard
- ESP32-S3 CSI firmware and event bridge
- Resident onboarding and consent
- Baseline calibration and confidence scoring
- Incident API and persistent state machine
- Qwen service adapter
- Delivery ordering adapter
- Courier response webhook
- Family notification and acknowledgement
- Operator review tools and system monitoring

### Explicitly out of scope (for now)

- Dashboard photoreal / dollhouse 3D of the floor plan (tried and reverted)
- Visible colored room overlays or room-name labels on the map (rooms stay invisible data only)
- HouseMind (separate experiment folder; not wired into AgentBento)
- StepFun image-edit redraw of the floor plan as a second map image (removed; upload stays the visual)

## 7. Current technology

| Area | Technology | Purpose |
| --- | --- | --- |
| Application | Next.js 16, React 19, TypeScript | Product UI and server rendering |
| Build/runtime | Vinext, Vite 8 | Fast development and Cloudflare-compatible output |
| Landing 3D | Three.js, React Three Fiber, Drei | Cutaway home on `/` only |
| Effects | React Three Postprocessing | Bloom / vignette on landing |
| Floor-plan vision | StepFun Step Plan API (`step-3.7-flash`) | Auto room boxes from upload |
| Icons | Tabler Icons | Bento and interface symbols |
| Styling | Custom CSS, Tailwind CSS build support | Responsive cinematic interface |
| Data scaffold | Drizzle ORM | Future typed persistence layer |
| Testing | Node test runner and production build | Render and regression checks |
| Hardware plan | ESP32-S3 with Wi-Fi CSI | Camera-free movement sensing |
| Reasoning plan | Qwen with structured output | Explanation and constrained action support |

### Floor-plan env (server only)

```bash
STEPFUN_API_KEY=...
STEPFUN_BASE_URL=https://api.stepfun.com/step_plan/v1
STEPFUN_VISION_MODEL=step-3.7-flash
```

Keep keys in `.env.local` / `.dev.vars` — never in client bundles.

## 8. Target service boundaries

Keep external systems behind small interfaces:

```text
SensorAdapter
  ingest(sample | activity_event)

RiskPolicy
  evaluate(resident_context, recent_events) → decision

ReasoningAdapter
  explain(decision_context) → structured_explanation

CheckInProvider
  request_check_in(incident) → dispatch_reference
  get_status(dispatch_reference) → status

NotificationProvider
  notify(contact, incident_summary) → delivery_reference

IncidentRepository
  create, transition, append_action, acknowledge, resolve
```

The local simulator and real integrations must implement the same interfaces.

## 9. Suggested first data model

- `residents`: identity, timezone, consent state, home settings
- `contacts`: ordered trusted contacts and notification preferences
- `sensor_devices`: device identity, calibration, health, last seen
- `activity_events`: normalized movement features and timestamps
- `incidents`: current state, severity, confidence, opened and resolved times
- `incident_transitions`: append-only transition audit
- `actions`: dispatch, notification, retry, cancellation, and result
- `acknowledgements`: resident, courier, family, or operator responses

Raw CSI storage should be short-lived and optional. Prefer derived movement features when they are sufficient.

## 10. Engineering rules

- Keep safety decisions deterministic and covered by transition tests.
- Validate every external request and response at the boundary.
- Use idempotency keys for dispatch and notification actions.
- Store timestamps in UTC and render them in the resident's timezone.
- Never place personal data, addresses, contacts, or credentials in client bundles or logs.
- Avoid medical claims. Describe observed activity and care actions, not diagnoses.
- Keep the core flow usable when landing 3D, StepFun, or an external provider is unavailable.
- Preserve keyboard access, readable contrast, reduced motion, and mobile layouts.
- Do not let visual demo state become the source of truth for a real incident.
- On the dashboard, the user’s uploaded floor plan is the map. Room boxes are invisible presence data only — do not draw colored overlays or room-name chips on the photo. Keep Grandpa high-contrast so he is easy to find.

## 11. Local development

```bash
npm install
npm run dev          # http://localhost:3000/
npm run build
npm test
npm run lint
npm run test:stepfun     # vision smoke (needs key)
npm run test:floor-plan  # analyze regression vs fixture (needs dev server)
```

Node.js 22.13 or newer is required.

Important files:

- `app/page.tsx`: landing story state, why section, and dashboard CTA
- `app/HomeScene.tsx`: landing 3D scene and story mapping
- `app/GrandmaPortrait.tsx`: landing grandma sample
- `app/dashboard/page.tsx`: family dashboard shell
- `app/dashboard/DashboardApp.tsx`: setup vs monitoring gate; localStorage setup
- `app/dashboard/HomeSetupWizard.tsx`: upload → StepFun rooms → Wi‑Fi pin
- `app/dashboard/HomeFloorModel.tsx`: upload as map; room / Wi‑Fi / Grandpa overlays
- `app/dashboard/FamilyBoard.tsx`: calm home + simulated story replay
- `app/dashboard/CsiSignalField.tsx`: simulated CSI → visual dimensions canvas
- `lib/csi-sim.ts`: synthetic CSI sample generator (RF-inspired, deterministic)
- `app/api/floor-plan/analyze/route.ts`: StepFun vision analyze endpoint
- `lib/home-setup.ts`: `HomeSetup` + localStorage v4 helpers
- `lib/floor-plan-rooms.ts`: room regions, `mapPresence`, model JSON parsing
- `lib/stepfun.ts`: StepFun vision client
- `lib/demo-frames.ts`: demo frame types and English copy
- `public/data/demo_frames.json`: simulated care story frames
- `public/fixtures/test-floor-plan.png`: floor-plan analyze fixture
- `app/globals.css`: layout and design tokens
- `db/schema.ts`: future persistent domain model
- `tests/floor-plan-rooms.test.ts`, `tests/parse-floor-plan-rooms.test.ts`, `tests/csi-sim.test.ts`
- `tests/rendered-html.test.mjs`: build and server-render checks

## 12. Definition of done

A product feature is done when:

- its domain state and failure behavior are defined
- important logic is not dependent on animation timing
- input and output schemas are validated
- retries are safe and idempotent
- the user can understand what happened and why
- cancellation or manual recovery is available where appropriate
- privacy and security implications are documented
- tests cover the successful path and meaningful failures
- the demo uses the same implementation or adapter contract

## 13. Worklog

### 2026-07-23 — Landing experience

- Product landing with Japanese-home 3D cutaway, three story states, My Grandma block, CTA to `/dashboard`.

### 2026-07-24 — Family dashboard + floor-plan model

- Hybrid calm home + simulated `demo_frames.json` replay.
- Setup: upload floor plan → room model → Wi‑Fi pin (browser localStorage).
- Evolved from fake grid → manual room labels → StepFun auto rooms.
- Rejected: AI image-edit redraw, empty SVG schematic-only map, dashboard 3D dollhouse / tipped views, visible colored room overlays / room-name chips.
- **Current:** upload photo is the monitoring map; StepFun rooms are invisible data for `mapPresence()` only (`home-setup.v4`). Grandpa marker is lime + dark outline so he reads on pale plans.

### 2026-07-24 — Revert dashboard 3D

- Removed 3D / tipped dashboard views.

### 2026-07-24 — Hide room overlays

- No colored room boxes or “ROOM MODEL ON” on the map. Rooms stay invisible for presence mapping.

### 2026-07-24 — Grandpa marker contrast

- Replaced pale white Grandpa stick figure with lime body, dark outline, ground halo, and stronger label so he is easy to find on light floor-plan photos.

### 2026-07-24 — Simulated CSI visual field (reference match)

- Dashboard CSI panel restyled to reference Matrix look: lime wire skeletons (red joints), cyan concentric wave spheres from AP box, lime occupancy grid, particle fog, bloom, dual HUD (vital-sign *sim* + Wi‑Fi metrics / PRESENT).
- Still driven by `lib/csi-sim.ts` from demo frames. Labeled **Simulated**; HUD BPM/RPM are synthetic micro-motion readouts, not clinical vitals.

## 14. Next work, in order

1. Improve auto room accuracy (re-prompt / adjust on bad boxes without full manual labeling).
2. Add acknowledgement and quiet-hour controls on the family dashboard.
3. Wire dashboard views to shared incident types instead of simulated frame playback alone.
4. Implement shared incident types and the deterministic transition engine.
5. Add transition tests for normal recovery, dispatch failure, duplicate webhook, family acknowledgement, and timeout escalation.
6. Build a local event simulator that drives the transition engine through an API.
7. Persist residents, devices, incidents, actions, and audit transitions.
8. Connect landing 3D and dashboard monitoring to live incident state.
9. Add ESP32-S3 event ingestion and device health monitoring.
10. Add delivery and notification provider adapters with idempotent retries.
11. Add the Qwen structured-output adapter and deterministic fallback.
12. Build consent, contact, and manual-resolution interfaces.
13. Conduct privacy, accessibility, failure-mode, and field testing.
