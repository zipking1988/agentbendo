# Agent Bento family dashboard design QA

## Evidence

- Selected visual target: `design/agent-bento-family-dashboard-selected.png` (1487 × 1058 px).
- Rendered implementation: `http://127.0.0.1:3010/dashboard`.
- Desktop review: 1280 × 900 CSS viewport.
- Mobile review: 390 × 844 CSS viewport.
- Tablet edge review: 976 × 900 CSS viewport.
- Zoom-equivalent review: 720 × 512 CSS viewport, equivalent to viewing a 1440 px composition at 200%.
- A temporary split-screen route rendered the selected visual and live dashboard together in the in-app browser. It was removed after comparison.

## Final findings

- No actionable P0, P1, P2, or P3 findings remain.
- The final code review found and fixed inaccurate pending-response copy, setup-style leakage, a nameless mobile return link, a narrow-tablet overflow, drifting map markers under height constraints, stale check-in-note selection, missing live announcements, duplicated stage ordering, and dead dashboard code.

## Fidelity review

- **Hierarchy:** Current care state and room lead on the left, the real floor plan anchors the center, and the four-step care journey sits on the right at desktop widths.
- **Typography:** Large sentence-case care headlines, compact mono labels, restrained supporting copy, and the existing Geist family match the selected direction.
- **Layout and spacing:** The essential family view stays above the first desktop fold. The latest check-in note sits directly below the map, technical details collapse into one quiet row, and the privacy footer closes the surface.
- **Color and surfaces:** Deep ink, ivory, lime, hairline separators, and the paper floor plan preserve the established Agent Bento product system without the previous card-heavy dashboard treatment.
- **Floor plan:** The original uploaded or bundled image remains the source of truth. Router and resident markers keep their stored coordinates and remain aligned because the map establishes its own aspect ratio.
- **Care clarity:** The journey says “Resident responding” while courier confirmation is pending. “All clear” appears only at confirmation, and the latest check-in note stops at the confirmed outcome rather than later administrative reporting.
- **Responsiveness:** The layout reflows to two columns by 1040 px and one column by 720 px. Checks at 976, 720, and 390 px reported no horizontal overflow.
- **Accessibility:** Controls are native buttons with `aria-pressed`; the return link keeps an accessible name when its visible text is hidden; the latest note is a polite atomic live region; focus states, touch targets, disclosure semantics, and reduced-motion rules are present.
- **Simulation disclosure:** The full simulated-demo statement remains visible on desktop and mobile, with the privacy promise repeated in the footer.

## Interaction checks

- Replay, pause, restart, and all four care-journey jump buttons were exercised in the in-app browser.
- Each selected journey step produced the matching stage headline and `aria-pressed` state.
- The technical disclosure lazily loaded one CSI canvas and the service-status panel.
- The final desktop, mobile, tablet-edge, and zoom-equivalent views had no horizontal clipping.
- A fresh browser tab reported zero console warnings or errors.

## Validation

- `npm run lint` — passed.
- `npx tsc --noEmit --incremental false` — passed.
- Focused Node suite — 21 tests passed.
- Rendered HTML suite — 2 tests passed, including `/dashboard`.
- `npm run build -- --webpack` — passed.
- `git diff --check` — passed.

## Open questions

- None.

final result: passed
