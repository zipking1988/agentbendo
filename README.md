# Agent Bento

Agent Bento is a privacy-first home safety system for older adults who live independently. It uses ambient Wi-Fi movement signals to notice an unusual period of silence, arranges a friendly human check-in through a bento delivery, and alerts family only when the situation remains unresolved.

The goal is not constant surveillance. The goal is a calm, explainable escalation path that preserves dignity while making it harder for a fall or medical problem to go unnoticed.

## How the product works

1. A Wi-Fi sensing device observes changes in radio reflections caused by movement. It does not capture images or conversations.
2. A deterministic risk engine compares the current pattern with the resident's normal routine.
3. Sustained, unusual silence starts a low-pressure check-in instead of immediately raising an emergency alarm.
4. A nearby courier brings a bento and knocks at the door.
5. A successful response closes the incident. No response escalates the incident to the resident's chosen family or care contact.
6. Every decision and action is recorded in an auditable incident timeline.

```text
Wi-Fi CSI sensor or simulator
            ↓
Event ingestion and normalization
            ↓
Deterministic risk and escalation policy
            ↓
Qwen-assisted explanation and action planning
            ↓
Bento check-in → courier response → family escalation
            ↓
Consent-aware audit log
```

The model is a support layer, not the safety authority. Thresholds, escalation rules, consent, retries, and emergency boundaries must remain deterministic and testable.

## Current status

### Working now

- Responsive React experience that explains the product on the first screen.
- Interactive 3D cutaway home rendered in real time.
- Three selectable states: normal activity, unusual silence, and human check-in.
- Visible fallen resident, Wi-Fi signal path, bento courier, and status callouts.
- Automatic story playback plus direct timeline controls.
- Camera-free privacy messaging and reduced-motion support.
- Production build and server-render tests.

### Simulated in the current demo

- Wi-Fi movement and inactivity events.
- Eight-hour inactivity threshold.
- Bento dispatch and courier arrival.
- Family notification outcome.

### Required for a functioning pilot

- ESP32-S3 CSI capture and calibration.
- Signed sensor event ingestion over WebSocket or HTTPS.
- Resident profile, consent, contacts, and quiet-hour settings.
- Persistent incidents and an auditable state machine.
- Bento ordering or dispatch integration with retries and idempotency.
- Courier webhook for answered and unanswered door checks.
- Family notification delivery and acknowledgement.
- Qwen service adapter with structured output, timeouts, and a deterministic fallback.
- Operational monitoring, security review, and field testing with care professionals.

## Product state machine

```text
NORMAL
  └─ unusual sustained silence → WATCH
       ├─ movement resumes → RESOLVED
       └─ policy threshold met → CHECK_IN_REQUESTED
            ├─ dispatch fails → RETRY_OR_ESCALATE
            └─ courier accepts → CHECK_IN_EN_ROUTE
                 ├─ resident answers → RESOLVED
                 └─ no answer → FAMILY_ALERTED
                      ├─ contact acknowledges → HANDOFF_COMPLETE
                      └─ no acknowledgement → ESCALATE_BY_POLICY
```

## Technology

### Current web experience

- Next.js 16 and React 19
- TypeScript
- Vinext and Vite 8
- Three.js with React Three Fiber and Drei
- Post-processing bloom and vignette effects
- Tabler icons
- Custom responsive CSS with Tailwind CSS available in the build
- Node's built-in test runner
- Cloudflare-compatible build tooling

### Planned service layer

- ESP32-S3 firmware for CSI sampling
- WebSocket or HTTPS event bridge
- TypeScript service for incident orchestration
- Qwen API adapter for structured explanations and action suggestions
- Drizzle ORM with a SQL store for residents, incidents, actions, and acknowledgements
- Provider adapters for delivery ordering and family notifications

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Then open the local URL printed by the development server.

Other commands:

```bash
npm run build   # create a production build
npm test        # build and verify the rendered experience
npm run lint    # run static checks
```

## Demo flow

The web demo is intentionally short and visual:

1. Start at **Unusual silence detected** to communicate the problem immediately.
2. Select **Home is moving normally** to show the privacy-preserving baseline.
3. Select **A human checks in** to show the bento courier and escalation path.
4. Drag the house to demonstrate that it is a live 3D scene.
5. Scroll to the safety-net section to explain sensing, checking, and protecting.

The demo tells the story; it does not pretend that simulated integrations are live.

## Safety and privacy principles

- No cameras or audio recordings.
- Explicit resident consent and configurable contacts.
- Collect the minimum signal data required for movement analysis.
- Prefer reversible, low-pressure actions before escalation.
- Keep the resident and family informed about why an action occurred.
- Never allow a generated recommendation to bypass deterministic safety policy.
- Provide manual cancellation, acknowledgement, and incident review.
- Treat this as an assistive safety system, not a medical diagnosis device.

## Repository map

```text
app/page.tsx             Story controls and product explanation
app/HomeScene.tsx        Interactive 3D home and incident states
app/globals.css          Visual system and responsive layout
app/layout.tsx           Metadata and root layout
db/                      Database scaffold for the future service layer
tests/                    Build and server-render verification
design/                   Selected visual direction
design-qa.md              Visual and interaction QA record
AGENT.md                  Product, engineering, and worklog guide
```

## Near-term roadmap

1. Define incident types and implement the deterministic state machine.
2. Add a local event simulator that drives the same API as future hardware.
3. Persist incidents, actions, and acknowledgements.
4. Connect ESP32-S3 CSI input and calibrate per-home baselines.
5. Add delivery and notification adapters behind testable interfaces.
6. Integrate Qwen for structured explanations with strict schema validation.
7. Build resident, family, courier, and operator views.
8. Run failure-mode, privacy, accessibility, and field tests before any pilot.
