# Agent Bento product experience design QA

## Current result

The public landing and family dashboard use the current editorial product direction. The demo is self-contained, clearly labeled as simulated, and no longer includes custom floor-plan analysis or cloud-service status.

## Current checks

- The primary family-demo action is visible on the landing.
- Status, map, latest care note, and care journey share one replay clock.
- Pausing freezes the visible story state.
- “Resident responding” remains pending until confirmation.
- The bundled sample plan keeps the resident and router markers readable.
- Router placement supports pointer and keyboard input.
- Technical details contain only a compact simulated movement trace.
- Mobile reading order keeps care status and controls ahead of technical detail.
- Focus styles, disclosure semantics, touch targets, and reduced-motion rules are present.
- The setup screen uses the bundled home and contains no upload or provider-processing path.

## Required validation

- `npm run lint`
- `npm run build`
- `npm test`
- Desktop review at 1280 px
- Mobile review at 390 px
- Keyboard router placement
- Replay, pause, restart, and journey-stage selection

The screenshots under `audit/product-design-review-2026-09-26/` are historical captures and may include interfaces removed after review.
