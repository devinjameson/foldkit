# Visual Polish — Status & Context for Next Session

## Branch

`feat/visual-polish` — 10 commits ahead of main. Not yet merged. No PR open.

## What Was Done

Full visual identity upgrade to the Foldkit website landing page. No structural changes — same sections, same copy, same architecture. Pure CSS and view-layer refinements.

### Typography

- **Geist + Geist Mono** (Vercel's font family). Replaced Tailwind's default system font stack. Self-hosted variable WOFF2 files in `public/fonts/`.
- Hero headline upgraded to `font-black` (900 weight) for more visual authority
- All section h2 headings bumped from `text-2xl/3xl` to `text-3xl/4xl` with `tracking-tight`
- Geist was chosen over Satoshi because Satoshi felt too warm/consumer-product ("mattress brand energy"). Geist is geometric, precise, and developer-native — matches the "boringly beautiful" ethos. The matched Geist Mono pairing is a huge win for a code-heavy site.

### Color & Layout

- Light mode body background warmed from `gray-100` to custom `warm-50` (#FAFAF8) — barely perceptible but removes the cold/generic feel
- Dark mode kept as-is (the blue cast in gray-900 works well with the pink accent)
- Hard `border-t` lines between landing sections removed, replaced with alternating section backgrounds (base vs gray-50/gray-850 wash). Creates visual rhythm instead of stacked cards.

### Component Polish

- `.cta-primary` buttons have a subtle pink glow (`shadow-pink-600/20`, deeper on hover)
- `.landing-card` has softer borders (60% opacity) and shadows — subtle in light, deeper in dark
- Hero "Beautifully" has a pink-to-rose gradient text treatment
- Batteries Included feature icons now have colored background pills using the demo color language (emerald for routing, blue for virtual DOM, amber for subscriptions, violet for side effects, pink for validation/UI)
- Proof of Life stats have large `text-3xl/4xl` numbers with pink top-border accents
- Footer expanded: logo mark + name, nav links (GitHub · npm · Docs), "Built with Foldkit, naturally."

## What's NOT Done (Deferred)

These were identified during brainstorming as "Approach 3" follow-ups:

- Scroll-triggered section reveals (gentle fade-in on enter)
- Section-specific ambient backgrounds (textures, radial glows)
- Interactive feature card hover states
- Animated stat counters on scroll into view

## Why These Choices

**"Boringly beautiful"** is the guiding principle. Every decision should feel deliberate and precise, not flashy. The site's copy is excellent and the page structure is strong — the visual layer's job is to match that quality, not compete with it.

- Geist over Satoshi: technical precision > consumer warmth
- JetBrains Mono was briefly considered but Geist Mono wins because matched font families share proportions, x-height, and stroke weight — they feel like they belong together
- Alternating backgrounds over borders: flowing story > stacked cards
- Colored icon pills: ties the feature grid back to the demo's color language, adds differentiation without being loud
- Pink glow on CTAs: alive without being flashy
- Large stats: the numbers deserve visual weight — "v0.24.0" and "13 examples" are proof points, not footnotes

## Files Changed

All changes are in `packages/website/`:

- `public/fonts/` — Geist-Variable.woff2, GeistMono-Variable.woff2
- `src/styles.css` — @font-face, @theme (fonts, warm-50 color), body bg, section border removal, CTA glow, card depth
- `src/page/landing.ts` — hero gradient + font-black, heading sizes, section backgrounds, icon pills, stats styling
- `src/main.ts` — footer redesign
- `index.html` — font preload link

## Next Steps

1. **Visual review** — Run the dev server (`cd packages/website && npx vite dev`), check both light and dark mode, check docs pages for regressions
2. **Decide on merge** — Squash merge to main when satisfied, or open a PR for further review
3. **Optional: Approach 3 follow-ups** — scroll animations, ambient textures, etc. See design doc at `docs/plans/2026-02-27-visual-polish-design.md`
