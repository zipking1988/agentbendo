# Agent Bento redesign QA

Final result: passed

Compared the selected cinematic cutaway reference with the implementation at a 1440px desktop viewport, then verified the responsive layout at 390px.

## Evidence

- Selected reference: `design/agent-bento-selected-reference.png`
- Side-by-side comparison: `design-qa-evidence/reference-vs-implementation.png`
- Final alert state: `design-qa-evidence/final-alert.png`
- Final human check-in state: `design-qa-evidence/final-human.png`
- Mobile viewport: `design-qa-evidence/mobile.png`

## Findings

| Priority | Finding | Result |
| --- | --- | --- |
| P0 | None | Pass |
| P1 | Soft-shadow shader could fail after changing story state and hide the house | Resolved by removing the incompatible shadow injection; all story states now retain the full 3D scene with zero browser errors |
| P1 | Fallen resident was not visually readable enough | Resolved with a brighter elderly figure, gray hair, fall lighting, and centered signal rings |
| P2 | Courier callout overlapped the timeline | Resolved by moving the courier and callout into the central doorway area |
| P2 | First-visit meaning needed to read before interaction | Pass: headline, three-line explanation, privacy promise, and three-step sequence are visible immediately |
| P2 | Mobile layout needed a clear reading order | Pass: explanation and controls appear first, with the interactive 3D house immediately below |
| P2 | House needed a recognizably Japanese identity | Pass: tatami rooms, illuminated shoji screens, zabuton cushions, paper lanterns, genkan step, and deeper roof eaves read clearly without obscuring the fall signal |
| P3 | Three.js emits deprecation warnings for its internal clock/shadow-map APIs | Non-blocking dependency warning; no visual or interaction impact |

## Interaction checks

- Each timeline step selects the matching scene state.
- The 30-second story control advances to the human check-in state and changes to Pause.
- The 3D home remains draggable through constrained orbit controls.
- Desktop and mobile DOM preserve headings, tab semantics, live status text, and descriptive labels.
