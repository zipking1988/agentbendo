# Agent Bento design QA

## Evidence and comparison setup

- Source visual truth: `design/agent-bento-selected-reference.png` (1487 × 1058 px).
- Rendered implementation: `http://127.0.0.1:3010/` and `http://127.0.0.1:3010/dashboard`.
- Existing implementation captures used as the pre-pass baseline: `design-qa-evidence/landing-desktop-1280.png`, `design-qa-evidence/dashboard-desktop-1280.png`, `design-qa-evidence/landing-mobile-390.png`, `design-qa-evidence/setup-mobile-390.png`, and `design-qa-evidence/dashboard-mobile-390.png`.
- Existing combined comparison: `design-qa-evidence/source-vs-revised-landing-2026-09-23.png` and `design-qa-evidence/reference-vs-implementation-2026-09-23.png`.
- Fresh post-fix comparison: source and implementation were rendered together in the Codex in-app browser on 2026-09-26. The source and live landing were normalized into equal 640 px columns, followed by a focused header comparison. The temporary comparison route was removed after review.
- Full-view implementation checks: CSS viewports 1280 × 900 and 390 × 844, device scale factor 1.
- Text-scaling check: 640 × 450 CSS viewport, equivalent to a 1280 px viewport at 200% zoom.
- Compared state: normal activity for the initial landing, then the unusual-silence chapter to match the source story state. The dashboard was checked at normal, watch, courier-arrival, pending-confirmation, and resolved replay points.

## Final findings

- No actionable P0, P1, or P2 findings remain.
- [P3, accepted] The source uses a photographic home while the implementation uses the existing interactive 3D home. Preserving that 3D home is an explicit product constraint, and its composition, lighting, controls, and status treatment now follow the source's visual language.

## Required fidelity surfaces

- **Typography:** Geist and Geist Mono preserve the source's geometric display type and technical labels. The headline hierarchy and line breaks remain clear on desktop, mobile, and at the zoom-equivalent width. Essential labels are at least 12 px and supporting instructions are at least 14 px.
- **Spacing and layout:** The opening explanation leads directly to `Open family demo` and `Play the story`. Scene choices follow the actions. The mobile header no longer wraps or hides its privacy statement, and 3D labels no longer collide with camera or status controls. The dashboard keeps family status and care notes before history and diagnostics.
- **Colors and tokens:** Near-black, paper, lime, amber, and coral remain consistent with the source. The main 3D status panel uses a dark translucent scrim so white and status-colored text stay readable over the scene.
- **Image quality and assets:** The wordmark now uses a source-faithful four-quadrant bento mark at all routes and as the favicon. The resident section uses the existing high-resolution illustrated portrait instead of a rough code-built placeholder. The original 3D home and bundled floor-plan image remain intact and sharp.
- **Copy and content:** Both scenarios are named. The simulation disclosure is visible on both routes. Care copy follows the typed eight-stage timeline, including pending confirmation before the all-clear. Replay timestamps are labeled as replay time.
- **Responsiveness:** The revised header, actions, status panel, map labels, and setup controls remain readable without horizontal clipping at 390 px, 1280 px, and the 200% zoom equivalent.
- **Interactions:** Story playback, pause, restart, direct chapter selection, setup recovery, keyboard router placement, and the lazy technical-details disclosure were exercised. The 3D diagnostics load only after expansion.
- **Accessibility:** Scene selectors are labeled native-button groups with `aria-pressed`. Focus indicators are visible, targets are practical for touch, router placement supports arrow keys, meaningful images have useful alt text, decorative icons are hidden from assistive technology, and reduced-motion styling preserves story timing.
- **Icons:** Emoji controls and floating glyphs were replaced with the existing Tabler icon family. Icon stroke, scale, and alignment now match across camera presets, resident/courier labels, and navigation.

## Interaction and state checks

- Landing starts at routine activity and uses one playback clock for chapter and internal-beat progression.
- Pausing freezes the complete story state; restarting returns the scene and copy to normal activity.
- The dashboard's headline, badge, selected scene, care notes, map activity, and replay time agree at each stage.
- At 86 seconds the UI reads `Resident responding — confirmation pending`; the all-clear appears only after courier confirmation.
- `Use demo home` restores the bundled plan, rooms, router position, filename context, and errors. Request-version and abort guards prevent late analysis from replacing the restored sample.
- Router placement is keyboard reachable; Arrow Right moved the pin from 58% to 60%, and Arrow Left restored it.
- Technical details are collapsed initially; the CSI canvas is absent until the disclosure is expanded.
- A fresh in-app-browser session reported no console warnings or errors after the final fixes.

## Iteration history

1. The fresh comparison found source-logo drift, emoji camera controls, a low-fidelity resident illustration, cramped mobile header copy, repeated 3D care callouts, overlapping mobile scene labels, and weak status contrast.
2. The implementation adopted the source-faithful bento mark, the existing high-resolution resident portrait, Tabler icons, a compact responsive header, one main care-status panel, fewer mobile overlays, and a contrast scrim. Obsolete overlay code and styles were removed.
3. A combined full-view comparison and focused header comparison confirmed the updated asset fidelity and hierarchy. Desktop, mobile, matched unusual-silence state, dashboard ordering, keyboard behavior, lazy diagnostics, and zoom reflow were rechecked.
4. The last browser pass found an LCP warning for the resident image. Eager loading removed it; a clean tab then reported zero warnings and errors.

## Validation

- `npm run lint` — passed.
- `npx tsc --noEmit --incremental false` — passed.
- Focused Node suite — 19 tests passed.
- Rendered HTML suite — 2 tests passed.
- `npm run build -- --webpack` — passed.
- Browser widths — 390 × 844, 1280 × 900, and 640 × 450 zoom equivalent passed.

## Open questions

- None.

final result: passed
