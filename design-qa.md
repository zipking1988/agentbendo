# Agent Bento care-clarity implementation QA

## Comparison target and evidence

- Source visual truth: `design/agent-bento-selected-reference.png` (1487 × 1058 px) plus the pre-change captures in `/private/tmp/agent-bento-design-review-2026-09-22/`.
- Browser-rendered implementation: `http://127.0.0.1:3010`.
- Source-to-final landing comparison: `design-qa-evidence/source-vs-revised-landing-2026-09-23.png` (1280 × 450 px).
- Previous-to-final journey comparison: `design-qa-evidence/reference-vs-implementation-2026-09-23.png` (1280 × 1350 px).
- Final desktop captures: `design-qa-evidence/landing-desktop-1280.png` and `design-qa-evidence/dashboard-desktop-1280.png` (1280 × 900 px, CSS viewport 1280 × 900, device scale factor 1).
- Final mobile captures: `design-qa-evidence/landing-mobile-390.png` (390 × 844 px), `design-qa-evidence/setup-mobile-390.png` (390 × 1246 px), and `design-qa-evidence/dashboard-mobile-390.png` (390 × 2952 px), CSS viewport 390 × 844, device scale factor 1.
- Text-scaling reflow check: `design-qa-evidence/landing-200pct-equivalent.png` (640 × 450 px), using the 640px CSS-width equivalent of a 1280px viewport at 200% zoom.
- Density normalization: source and implementation were resized to 640px columns for the combined comparison; native captures were inspected separately for typography, icons, labels, and map overlap.
- Compared state: the source mock shows unusual silence, while the revised landing intentionally starts at routine activity per the implementation brief. The comparison therefore judges visual language, hierarchy, spacing, and asset treatment rather than identical story state.

## Findings

- No actionable P0, P1, or P2 findings remain.
- [P3] Three.js emits deprecation warnings for its internal clock and soft-shadow-map APIs. These warnings do not affect layout, interaction, or rendering in the tested journey.

## Required fidelity surfaces

- Fonts and typography: Geist and Geist Mono preserve the reference's display/body contrast. Status labels are now at least 12px and supporting instructions are 14px. Headline wrapping remains readable at 1280px, 390px, and the 200% zoom equivalent.
- Spacing and layout rhythm: the landing retains the sparse cinematic composition while placing both opening actions above the scene selector. The dashboard presents status and care notes beside the map on desktop, then reads status, controls, map, notes, story, and technical details on mobile.
- Colors and visual tokens: the near-black, paper, lime, amber, and coral tokens remain consistent with the source. Measured contrast is 6.54:1 for inactive scene text, 8.97:1 for supporting text, 15.58:1 for the primary action, and 11.62:1 for amber status text.
- Image quality and asset fidelity: the original 3D home and bundled floor-plan image remain intact and sharp. The photographic source and the existing 3D scene differ intentionally because the brief explicitly preserves the 3D home. No placeholder art or replacement imagery was introduced.
- Copy and content: both scenarios are named, the demo disclaimer is visible on both routes, the primary action is explicit, replay times are labeled, and the 86–100 second state consistently communicates pending confirmation before the all-clear.
- Icons and controls: existing Tabler icons retain a consistent stroke style. Primary, secondary, scene, camera, setup, and disclosure controls have practical targets and visible keyboard focus.
- Responsiveness and accessibility: no clipping or label overflow was found at 390px, 1280px, or the zoom-equivalent width. Native button groups use `aria-pressed`; keyboard router movement changes the pin in 2% increments; the focused story button reports a 2px visible outline with a 3px offset. Reduced-motion rules remove decorative animation without speeding playback.

## Primary interactions tested

- Landing story starts in routine activity, advances from one shared playback clock, pauses without chapter drift, and supports direct chapter selection.
- Family replay starts at normal activity and exposes all eight care stages from the same typed timeline as the headline and badge.
- The 1:26 replay point shows `Resident responding — confirmation pending` in the headline, badge, selected scene, current activity, and map caption.
- Technical details are collapsed initially; the CSI field is absent until the disclosure is expanded.
- Router placement is keyboard reachable and Arrow Right moved the pin from 58% to 60%; Arrow Left restored it.
- Custom floor-plan analysis produced its error state, and `Use demo home` restored the sample image, room data, router position, filename context, and cleared error state. Request-version and AbortController guards prevent pending or late analysis results from replacing the restored demo.
- Browser console review found only the non-blocking Three.js deprecation warnings described above.

## Comparison history

1. Earlier review evidence showed premature family-alert/all-clear copy, a secondary scene-status badge overlapping the camera controls, technical diagnostics dominating the family view, and conflicting raw activity text during the response stage.
2. The implementation replaced the alert sequence with a typed eight-stage presentation timeline, removed the duplicate scene-status badge, moved diagnostics into a lazy collapsed disclosure, reordered the dashboard, and derived response-stage activity text from the same care stage.
3. Post-fix evidence in the final desktop and mobile captures shows one clear 3D status panel, discoverable landing actions, unobstructed controls, matching pending-confirmation content, readable map markers, and the requested mobile reading order.

## Open questions

- None.

## Implementation checklist

- [x] Care stage, headline, badge, selected scene, notes, and map activity agree.
- [x] Setup recovery works from the custom-plan error path and invalidates late work.
- [x] Primary navigation and demo labeling are visible on both routes.
- [x] Family information precedes story history and technical diagnostics.
- [x] Desktop, mobile, zoom-equivalent, keyboard, contrast, and reduced-motion behavior checked.

final result: passed
