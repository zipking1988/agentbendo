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

- Next.js and React single-page experience.
- Real-time Three.js cutaway home through React Three Fiber.
- Responsive desktop and mobile layouts.
- Three story states controlled by an accessible tab list.
- Automatic story playback with pause and replay controls.
- Fallen resident, ambient signal rings, signal path, router, courier, and bento bag.
- Privacy and product explanation visible on the first screen.
- Reduced-motion behavior.
- Production build and rendered HTML tests.

### Simulated

- normal movement state
- eight hours without movement
- Wi-Fi anomaly detection
- bento courier dispatch and arrival
- family escalation outcome

### Planned

- ESP32-S3 CSI firmware and event bridge
- resident onboarding and consent
- baseline calibration and confidence scoring
- incident API and persistent state machine
- Qwen service adapter
- delivery ordering adapter
- courier response webhook
- family notification and acknowledgement
- operator review tools and system monitoring

## 7. Current technology

| Area | Technology | Purpose |
| --- | --- | --- |
| Application | Next.js 16, React 19, TypeScript | Product UI and server rendering |
| Build/runtime | Vinext, Vite 8 | Fast development and Cloudflare-compatible output |
| 3D | Three.js, React Three Fiber, Drei | Interactive cutaway home |
| Effects | React Three Postprocessing | Bloom and vignette treatment |
| Icons | Tabler Icons | Bento and interface symbols |
| Styling | Custom CSS, Tailwind CSS build support | Responsive cinematic interface |
| Data scaffold | Drizzle ORM | Future typed persistence layer |
| Testing | Node test runner and production build | Render and regression checks |
| Hardware plan | ESP32-S3 with Wi-Fi CSI | Camera-free movement sensing |
| Reasoning plan | Qwen with structured output | Explanation and constrained action support |

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
- Keep the core flow usable when 3D rendering, the model service, or an external provider is unavailable.
- Preserve keyboard access, readable contrast, reduced motion, and mobile layouts.
- Do not let visual demo state become the source of truth for a real incident.

## 11. Local development

```bash
npm install
npm run dev
npm run build
npm test
npm run lint
```

Node.js 22.13 or newer is required.

Important files:

- `app/page.tsx`: story state and page content
- `app/HomeScene.tsx`: 3D scene and visual state mapping
- `app/globals.css`: layout, responsive behavior, and design tokens
- `app/layout.tsx`: page metadata
- `db/schema.ts`: future persistent domain model
- `tests/rendered-html.test.mjs`: build and server-render checks
- `design-qa.md`: current visual QA results

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

### 2026-07-23 — Initial experience

- Built the first Agent Bento web experience.
- Added server rendering and deferred the 3D renderer until hydration for stable page loading.

### 2026-07-23 — Story-first redesign

- Replaced the dashboard-style interface with a first-visit product explanation.
- Added the two-floor interactive 3D cutaway home.
- Added normal, unusual-silence, and human-check-in story states.
- Added the fallen older resident, Wi-Fi visualization, bento courier, and care callouts.
- Added direct timeline controls and automatic playback.
- Added a responsive mobile composition and a plain-language safety-net section.
- Removed an incompatible soft-shadow shader that could hide the house after a state change.
- Verified the three story states, mobile layout, browser console, production build, and rendered output.

### 2026-07-23 — Product documentation

- Reframed the repository around the functioning care workflow rather than the presentation alone.
- Documented what is implemented, simulated, and planned.
- Defined the target state machine, service boundaries, model limits, safety principles, and implementation order.

## 14. Next work, in order

1. Implement shared incident types and the deterministic transition engine.
2. Add transition tests for normal recovery, dispatch failure, duplicate webhook, family acknowledgement, and timeout escalation.
3. Build a local event simulator that drives the transition engine through an API.
4. Persist residents, devices, incidents, actions, and audit transitions.
5. Connect the current 3D experience to live incident state instead of local component state.
6. Add ESP32-S3 event ingestion and device health monitoring.
7. Add delivery and notification provider adapters with idempotent retries.
8. Add the Qwen structured-output adapter and deterministic fallback.
9. Build consent, contact, incident history, and manual-resolution interfaces.
10. Conduct privacy, accessibility, failure-mode, and field testing before a pilot.

