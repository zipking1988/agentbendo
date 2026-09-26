# Agent Bento code knowledge

## Runtime architecture

Agent Bento is a native Next.js application hosted on Vercel. The public experience is self-contained and uses a local scripted care replay.

```text
Bundled floor plan + local story frames
                  ↓
Shared replay clock and care-stage presentation
                  ↓
Family status, resident marker, journey, and simulated signal trace
                  ↓
Browser-local home setup
```

The public prototype has no cloud-model dependency and requires no model credentials.

## Main modules

### `lib/demo-frames.ts`

Defines the replay stages and derives the headline, badge, explanation, tone, journey selection, and progress from the same timestamp.

### `lib/home-setup.ts`

Defines the bundled plan, story-room regions, router position, and `home-setup.v4` browser persistence. Legacy saved data URLs remain loadable, but the current setup screen uses only the bundled sample plan.

### `lib/floor-plan-rooms.ts`

Maps scripted story positions into the four predefined sample-plan regions.

### `app/dashboard/FamilyBoard.tsx`

Owns playback, pausing, restart, stage jumps, family-facing status, and the compact simulated movement trace.

### `lib/adapters/ruview-bridge.ts`

Experimental client for a future sensing bridge. It is exposed through `/api/ruview` but is not connected to the public dashboard.

## Product truth

- Sensing, courier dispatch, resident response, and notifications are simulated.
- The technical trace is simulated and is not a clinical measurement.
- The sample floor plan and room regions are bundled with the repository.
- Real monitoring requires consent, calibration, persistent incidents, audited actions, and field validation.
