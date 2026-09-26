# Agent Bento

Agent Bento is a privacy-first home-care concept for older adults who live independently. The interactive demo shows how unusual silence could lead to a friendly human check-in through a bento delivery, with family informed as the situation changes.

This repository contains a product prototype. Its sensing, courier dispatch, resident response, and notifications are simulated with a local scripted replay. It has no cloud-model dependency.

## What works

- Responsive product landing with a direct path into the family demo.
- Synchronized care replay covering normal activity, unusual stillness, a requested check-in, resident response, confirmation, and return to routine.
- Bundled Japanese sample floor plan with movable Wi-Fi router and resident markers.
- Collapsed technical details with a clearly labeled simulated Wi-Fi movement trace.
- Browser-local setup stored under `agent-bento.home-setup.v4`.
- Optional experimental RuView bridge route for future hardware exploration.
- Unit, production-build, and server-render checks.

The production monitoring service, calibrated hardware, persistent incidents, courier ordering, and real notifications remain outside this prototype.

## Local development

Requirements: Node.js 22.13 or newer and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Using the demo

1. Open `/` and select **Open family demo**.
2. Confirm or reposition the router on the bundled sample plan.
3. Select **Start demo**.
4. Play the sofa-nap check-in story or jump between stages in the care journey.
5. Expand **Technical demo details** to see the simulated movement trace.
6. Select **Adjust demo home** to revisit router placement.

Landing links use `/dashboard?start=1`, which starts a saved demo at replay `0:00`. Setup stays in the current browser using the existing `home-setup.v4` storage format.

## Optional RuView bridge

The experimental `GET /api/ruview` route can read a RuView-compatible sensing service during local development. It is not connected to the family dashboard and is not part of the public demo.

```bash
RUVIEW_API_URL=http://localhost:3000
RUVIEW_TIMEOUT=5000
```

Do not point a Vercel deployment at `localhost` or a private LAN hostname. A remote deployment would require a secure, publicly reachable bridge.

## Validation

```bash
npm run lint
npm run build
npm test
```

## Deployment

The application is a standard Next.js project. Import the repository into Vercel and keep the detected framework settings. No cloud-model credentials are required.

Only configure `RUVIEW_API_URL` and `RUVIEW_TIMEOUT` when intentionally testing the experimental hardware bridge.

## Safety and privacy

- The public prototype uses no camera or microphone recordings.
- The care journey and movement trace are visibly labeled as simulated.
- Agent Bento is an assistive care concept, not a medical device or diagnostic tool.
- A real deployment would require resident consent, calibration, secure device identity, audited incident handling, and field testing.

## Repository map

```text
app/                         Product landing and family dashboard
app/api/ruview/              Optional experimental hardware bridge route
lib/demo-frames.ts           Care-stage and replay presentation model
lib/home-setup.ts            Browser-local sample-home setup
lib/floor-plan-rooms.ts      Room mapping for the bundled plan
lib/adapters/ruview-bridge.ts Experimental RuView client
public/data/                 Simulated monitoring story
public/fixtures/             Bundled sample floor plan
tests/                       Unit and rendered-page checks
docs/                        Presentation and FAQ source material
AGENT.md                     Product truth and engineering worklog
```

## Production roadmap

1. Validate the care workflow with residents, families, and care professionals.
2. Connect calibrated hardware through an authenticated event bridge.
3. Add persistent residents, consent records, incidents, actions, and acknowledgements.
4. Add reliable human check-in and family-notification integrations.
5. Complete privacy, accessibility, failure-mode, and field testing.
