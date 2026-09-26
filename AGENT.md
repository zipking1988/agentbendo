# Agent Bento Project Guide

## Product purpose

Agent Bento is a privacy-first home-care concept for older adults who live independently. The product story notices unusual silence, arranges a friendly bento delivery as a human check-in, and keeps family informed as the situation changes.

The promise is:

> Notice unusual silence, send human care, and escalate only when needed.

This repository contains an interactive product prototype. Treat it as a truthful demonstration of the care experience, not proof that sensing hardware, delivery ordering, or family notifications are live.

## Truthfulness labels

- **Implemented**: runs in this repository and has a meaningful check.
- **Simulated**: behaves realistically through local scripted data.
- **Planned**: future product or service work.

Never describe simulated sensing, ordering, courier arrival, resident response, or family alerts as live integrations.

## Current implementation

### Implemented

- Next.js 16 and React 19 product landing.
- Editorial landing with realistic Japanese-home photography and a clear family-demo path.
- Landing CTAs open `/dashboard?start=1`, preserve an existing saved setup, and otherwise start the bundled sample home at replay `0:00`.
- Family dashboard setup using the bundled Japanese sample floor plan.
- Movable, keyboard-accessible router pin.
- Browser-local setup using `agent-bento.home-setup.v4`.
- Synchronized care replay with presentation state derived from one playback clock.
- Floor-plan resident marker and plain-language care journey.
- Collapsed technical details with a compact simulated Wi-Fi movement trace.
- Optional experimental RuView bridge route, currently separate from the public dashboard.
- Responsive layouts, reduced-motion behavior, focus states, and rendered-page checks.

### Simulated

- Wi-Fi movement signal and activity history.
- Unusual-stillness detection.
- Bento check-in request, courier progress, and arrival.
- Resident response and courier confirmation.
- Family-facing care notes and resolution.

### Planned

- Resident onboarding and consent.
- Calibrated sensing hardware and device health.
- Persistent incidents, actions, acknowledgements, and audit history.
- Reliable delivery ordering and courier callbacks.
- Family notification delivery and acknowledgement.
- Quiet hours, contact preferences, and manual resolution.
- Privacy, accessibility, failure-mode, and field testing.

## Product boundaries

- The public prototype does not call cloud model providers.
- The dashboard uses the bundled sample plan; custom floor-plan analysis is not part of the current product.
- Technical values must remain labeled as simulated and must not resemble clinical vital signs.
- Agent Bento is an assistive care concept, not a medical or diagnostic product.
- The old landing dollhouse and dense technical visualization must not return.

## Current technology

| Area | Technology | Purpose |
| --- | --- | --- |
| Application | Next.js 16.3, React 19.2, TypeScript 5.9 | Product UI and server rendering |
| Hosting | Vercel | Web deployment |
| Dashboard diagnostics | SVG and CSS | Compact simulated movement trace |
| Icons | Tabler Icons | Product and interface symbols |
| Styling | Custom CSS with Tailwind build support | Responsive interface |
| Testing | Node test runner, Next.js production build | Logic and render checks |
| Experimental bridge | RuView-compatible HTTP adapter | Future hardware exploration |

Only the optional bridge uses environment variables:

```bash
RUVIEW_API_URL=http://localhost:3000
RUVIEW_TIMEOUT=5000
```

The bridge is not wired into the public family demo.

## Engineering rules

- Preserve the truth boundary between implemented, simulated, and planned behavior.
- Keep replay state on one clock so pausing freezes every visible stage.
- Keep care headlines, badges, notes, and journey selection consistent.
- Avoid medical claims and clinical-style readouts.
- Keep the public demo functional without network services or credentials.
- Preserve keyboard access, readable contrast, reduced motion, and mobile layouts.
- Keep the bundled floor-plan coordinates accurate and map labels within bounds.
- Preserve the `home-setup.v4` storage format so existing saved setups continue to load.
- Do not place personal data, addresses, contacts, or secrets in client bundles or logs.

## Local development

```bash
npm ci
npm run dev
npm run lint
npm run build
npm test
```

Node.js 22.13 or newer is required.

## Important files

- `app/page.tsx`: product landing and dashboard conversion path
- `app/landing.module.css`: landing design
- `app/dashboard/DashboardApp.tsx`: setup and monitoring gate
- `app/dashboard/HomeSetupWizard.tsx`: sample-home and router setup
- `app/dashboard/HomeFloorModel.tsx`: floor-plan, router, and resident markers
- `app/dashboard/FamilyBoard.tsx`: replay controls, map, care journey, and technical trace
- `lib/demo-frames.ts`: care-stage and presentation model
- `lib/home-setup.ts`: sample setup and browser persistence
- `lib/floor-plan-rooms.ts`: room geometry and presence mapping
- `lib/adapters/ruview-bridge.ts`: optional experimental bridge client
- `public/data/demo_frames.json`: simulated care story
- `public/fixtures/test-floor-plan.png`: bundled sample plan
- `tests/`: unit and rendered-page checks

## Definition of done

A prototype change is done when:

- the user-facing state and failure behavior are clear
- important logic does not depend on animation timing
- the user can understand what happened and what is simulated
- keyboard and mobile use still work
- tests cover the changed logic where meaningful
- lint, build, and rendered-page checks pass
- documentation matches the shipped interface

## Worklog

### 2026-09-26 — Direct demo entry and journey review

- Started first-time landing visitors directly in the bundled sample home while preserving existing browser-saved setups.
- Added distinct courier en-route and arrival milestones to the synchronized care journey.
- Prevented care notes from showing future events and kept the journey progress line aligned with every replay stage.
- Restored native keyboard and screen-reader controls for router placement and corrected skip-link destinations.
- Updated demo instructions and rechecked desktop, mobile, lint, unit, build, and rendered-page behavior.

### 2026-09-26 — Retired cloud inference and custom analysis

- Removed the retired cloud-inference endpoints and their supporting code.
- Removed associated adapters, feature-processing code, environment variables, scripts, and model-response tests.
- Removed custom floor-plan upload because its room mapping depended on the retired analysis service.
- Simplified onboarding to the bundled sample home with adjustable router placement.
- Preserved `home-setup.v4` loading for existing browser-saved setups.
- Updated product metadata, README, presentation source, FAQ, and project guide to describe the local simulated prototype accurately.

### 2026-09-26 — Post-launch resilience

- Synchronized care-journey progress with replay time.
- Kept the resolved dashboard on the final replay frame.
- Added graceful browser-storage handling.
- Verified desktop and mobile layouts, setup recovery, and final replay transitions.

### 2026-09-26 — Product landing redesign

- Replaced the toy-like interactive landing with a restrained editorial product page.
- Added realistic imagery, privacy proof, care steps, and direct family-demo entry.

### 2026-09-26 — Technical details refinement

- Replaced the dense 3D field with a compact 2D simulated movement trace.
- Removed provider-status panels and synthetic clinical vital-sign readouts.

## Next work

1. Validate the care narrative with older residents, family members, and care professionals.
2. Add family acknowledgement and quiet-hour controls to the prototype.
3. Define persistent incident and audit data before connecting hardware.
4. Connect calibrated sensing through the optional bridge only after privacy and failure behavior are specified.
5. Add reliable delivery and notification integrations with idempotent retries.
6. Conduct accessibility, privacy, failure-mode, and field testing.
