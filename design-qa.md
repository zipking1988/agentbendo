# Agent Bento product experience design QA

## Evidence

- Selected visual target: `design/agent-bento-family-dashboard-selected.png` (1487 × 1058 px).
- Setup desktop capture: `design/agent-bento-setup-desktop.png` (1280 × 900 px).
- Setup mobile capture: `design/agent-bento-setup-mobile.png` (390 × 844 px).
- Setup zoom-equivalent capture: `design/agent-bento-setup-zoom-200.png` (720 × 512 px).
- Technical movement summary capture: `design/agent-bento-technical-mobile.png` (390 × 526 px).
- Rendered implementation: `http://127.0.0.1:3010/dashboard`.
- Desktop review: 1280 × 900 CSS viewport.
- Mobile review: 390 × 844 CSS viewport.
- Tablet edge review: 976 × 900 CSS viewport.
- Zoom-equivalent review: 720 × 512 CSS viewport, equivalent to viewing a 1440 px composition at 200%.
- A temporary split-screen route rendered the selected visual and live dashboard together in the in-app browser. It was removed after comparison.

## Final findings

- No actionable P0, P1, P2, or P3 findings remain.
- The final code review found and fixed inaccurate pending-response copy, setup-style leakage, a nameless mobile return link, a narrow-tablet overflow, drifting map markers under height constraints, stale check-in-note selection, missing live announcements, duplicated stage ordering, and dead dashboard code.
- The setup review also fixed the prototype-like four-step hierarchy, competing upload actions, vague router confirmation, inaccurate plan-privacy wording, and a start action that previously opened the completed replay state.

## Fidelity review

- **Hierarchy:** Current care state and room lead on the left, the real floor plan anchors the center, and the four-step care journey sits on the right at desktop widths.
- **Typography:** Large sentence-case care headlines, compact mono labels, restrained supporting copy, and the existing Geist family match the selected direction.
- **Layout and spacing:** The essential family view stays above the first desktop fold. The latest check-in note sits directly below the map, technical details collapse into one quiet row, and the privacy footer closes the surface.
- **Color and surfaces:** Deep ink, ivory, lime, hairline separators, and the paper floor plan preserve the established Agent Bento product system without the previous card-heavy dashboard treatment.
- **Floor plan:** The original uploaded or bundled image remains the source of truth. Router and resident markers keep their stored coordinates and remain aligned because the map establishes its own aspect ratio.
- **Care clarity:** The journey begins with “Normal activity” at replay 0:00, says “Resident responding” while courier confirmation is pending, and reserves “All clear” for confirmation. The latest check-in note stops at the confirmed outcome rather than later administrative reporting.
- **Responsiveness:** The layout reflows to two columns by 1040 px and one column by 720 px. Checks at 976, 720, and 390 px reported no horizontal overflow.
- **Accessibility:** Controls are native buttons with `aria-pressed`; the return link keeps an accessible name when its visible text is hidden; the latest note is a polite atomic live region; focus states, touch targets, disclosure semantics, and reduced-motion rules are present.
- **Simulation disclosure:** The full simulated-demo statement remains visible on desktop and mobile, with the privacy promise repeated in the footer.
- **Setup hierarchy:** Home setup now has three clear steps: add the home, confirm rooms, and place the router. The sample path is immediately usable, while custom upload remains recoverable from upload, analysis, review, and router placement.
- **Setup trust:** The screen distinguishes camera-free sensing, browser-saved setup data, and provider-based room analysis. It no longer implies that an uploaded image never leaves the browser during analysis.
- **Setup responsiveness:** True device-metrics captures reported `scrollWidth` equal to viewport width at 390 px and at the 720 px / 200%-zoom equivalent.

## Interaction checks

- Replay, pause, restart, and all four care-journey jump buttons were exercised in the in-app browser.
- The care-journey clock and progress line use the same replay time as the map and status; both freeze on pause and resume together.
- A timed Playwright run verified the previously broken 0:28 state: normal activity stayed selected, the line advanced toward 0:30, the resident moved from Bedroom to Living room, and the clock read 0:28.
- Each selected journey step produced the matching stage headline and `aria-pressed` state.
- The technical disclosure presents one compact Wi-Fi movement trace with movement, stillness, and change values. It excludes medical-style vital signs and unused provider status.
- A fresh 390 px Chrome run expanded the disclosure, started replay, and confirmed the journey and signal clocks both read `Replay 0:01`; the document and viewport widths both measured 390 px.
- The final desktop, mobile, tablet-edge, and zoom-equivalent views had no horizontal clipping.
- A fresh browser tab reported zero console warnings or errors.
- Keyboard router placement was exercised in the browser: focusing the map and pressing Right moved the stored position from 50% to 52%.
- `Start demo` was exercised after setup and now opens normal activity at replay 0:00, begins playback, and keeps the first care-journey stage selected.
- Setup recovery was exercised before upload; the existing request guard tests cover cancellation and rejection of aborted or late analysis results.

## Validation

- `npm run lint` — passed.
- `npx tsc --noEmit --incremental false` — passed.
- Focused Node suite — 18 tests passed.
- Rendered HTML suite — 2 tests passed, including `/dashboard`.
- `npm run build -- --webpack` — passed.
- `git diff --check` — passed.

## Open questions

- None.

final result: passed
