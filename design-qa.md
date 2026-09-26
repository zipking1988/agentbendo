# Agent Bento product landing design QA

## Evidence

- Selected visual target: `design/agent-bento-product-landing-selected.png` (1536 × 1024 px).
- Rendered implementation: `http://127.0.0.1:3010/`.
- Desktop review: 1440 × 1024 CSS viewport, device scale factor 1.
- Mobile review: 390 × 844 CSS viewport, device scale factor 1.
- Zoom-equivalent review: 720 × 512 CSS viewport, equivalent to viewing a 1440 px composition at 200%.
- Combined comparison: the selected visual and live implementation were rendered together in one in-app-browser view as equal 648 px columns. The live page used a 1440 × 1013 iframe scaled to 0.45. The temporary comparison route was removed after review.
- Compared state: initial landing state with `Movement looks normal`, matching the selected design.

## Final findings

- No actionable P0, P1, or P2 findings remain.
- [P3, accepted] The independently generated production photograph differs in exact foliage, resident pose, and room details from the concept image. It preserves the selected composition, nighttime Japanese-home setting, warm/cool balance, resident placement, router, and subtle sensing field.

## Fidelity review

- **Hierarchy:** The wordmark, restrained navigation, family CTA, headline, supporting copy, dual hero actions, privacy promise, live status, and three-step strip follow the selected visual in the same reading order.
- **Typography:** The live page uses the project's Geist family with the concept's large geometric headline, compact mono labels, 14–21 px supporting text, and controlled line lengths.
- **Layout and spacing:** The desktop hero ends near the selected design's fold so the three-step section is visible in the first viewport. The content grid, CTA sizing, status placement, and generous whitespace closely match the reference.
- **Color and surfaces:** Deep ink, warm ivory, restrained lime, hairline separators, and warm architectural photography reproduce the chosen visual system without game controls, neon HUD treatment, glass panels, or a card wall.
- **Imagery:** The hero is a dedicated 1536 × 1024 editorial asset optimized to a 168 KB WebP. A realistic resident portrait replaces the previous illustrated landing image. Both assets are responsive and have useful alt text.
- **Copy:** The headline and core promise match the selected direction. Claims stay within the prototype's actual story and explicitly identify sensing, delivery, and notifications as simulated.
- **Responsiveness:** The hero, CTAs, status badge, care steps, family section, privacy section, and footer reflow cleanly at 390 px and the 200% zoom equivalent without horizontal clipping.
- **Accessibility:** Navigation and actions use semantic links, sections have labelled headings, images have descriptive alt text, decorative icons are hidden, focus indicators are visible, reduced-motion rules remove transitions, and touch targets are practical.
- **Icons:** All UI icons use the existing Tabler family. No emoji, text glyph icons, CSS drawings, or placeholder art remain in the landing.

## Interaction checks

- The hero and header primary actions navigate to `/dashboard`; browser navigation was verified.
- `How it works`, `For families`, `Privacy`, and `About` resolve to labelled page sections.
- Keyboard Tab focuses the wordmark first and uses a visible lime focus outline.
- The family and privacy CTAs remain available below the fold.
- A fresh browser tab reported zero console warnings or errors.

## Iteration history

1. The selected concept established a quiet, premium product direction with an editorial home photograph, simple navigation, one live status, and a three-step care explanation.
2. The first implementation replaced the interactive 3D toy hero with a photographic product story and preserved the working family dashboard.
3. The first comparison found the hero was too tall, the step strip appeared too late, extra step icons weakened fidelity, and the old illustrated resident brought the toy feeling back below the fold.
4. The hero height, content placement, step grid, and typography were aligned to the reference. Extra icons were removed and a realistic resident portrait was added.
5. The hero asset inherited a compass badge from the old reference; the image was regenerated without that artifact and saved under a new cache-safe filename.
6. The final combined comparison, desktop/mobile review, zoom reflow, keyboard check, CTA navigation, and clean-console pass found no remaining P0–P2 issues.

## Validation

- `npm run lint` — passed.
- `npx tsc --noEmit --incremental false` — passed.
- Focused Node suite — 19 tests passed.
- Rendered HTML suite — 2 tests passed.
- `npm run build -- --webpack` — passed.

## Open questions

- None.

final result: passed
