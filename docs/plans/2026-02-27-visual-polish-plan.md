# Visual Polish & Typography Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Elevate the Foldkit website's visual design through custom typography, color refinements, and component polish — taking it from "really good" to "holy shit."

**Architecture:** Pure CSS and view-layer changes. No model/update/message changes. No structural changes to page layout or content. Font files self-hosted in `packages/website/public/fonts/`. All Tailwind customization in the `@theme` block of `styles.css`.

**Tech Stack:** Tailwind CSS 4.x, Satoshi font (Fontshare), MonoLisa font (user-provided), Foldkit view functions

**Design Reference:** `docs/plans/2026-02-27-visual-polish-design.md`

---

### Task 1: Add Satoshi font files and configure Tailwind

**Files:**

- Create: `packages/website/public/fonts/` directory
- Create: `packages/website/public/fonts/Satoshi-Variable.woff2` (download from Fontshare)
- Create: `packages/website/public/fonts/Satoshi-VariableItalic.woff2` (download from Fontshare)
- Modify: `packages/website/src/styles.css:1-12`
- Modify: `packages/website/index.html:14-16`

**Step 1: Download Satoshi from Fontshare**

Download the Satoshi variable font from https://www.fontshare.com/fonts/satoshi. Extract the WOFF2 variable font files and place them in:

- `packages/website/public/fonts/Satoshi-Variable.woff2`
- `packages/website/public/fonts/Satoshi-VariableItalic.woff2`

**Step 2: Add @font-face declarations and configure Tailwind**

Add font-face declarations to `packages/website/src/styles.css` and register in `@theme`:

```css
@import 'tailwindcss';

@font-face {
  font-family: 'Satoshi';
  src: url('/fonts/Satoshi-Variable.woff2') format('woff2');
  font-weight: 300 900;
  font-display: swap;
  font-style: normal;
}

@font-face {
  font-family: 'Satoshi';
  src: url('/fonts/Satoshi-VariableItalic.woff2') format('woff2');
  font-weight: 300 900;
  font-display: swap;
  font-style: italic;
}

@custom-variant dark (&:where(.dark, .dark *));
@custom-variant hover-capable {
  @media (hover: hover) {
    @slot;
  }
}

@theme {
  --color-gray-850: #131921;
  --font-sans: 'Satoshi', ui-sans-serif, system-ui, sans-serif;
}
```

This sets Satoshi as the default sans-serif font for the entire site via Tailwind's `--font-sans` theme variable.

**Step 3: Preload the primary font file in index.html**

Add a preload link before the stylesheet link in `packages/website/index.html`:

```html
<link
  rel="preload"
  href="/fonts/Satoshi-Variable.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
<link href="/src/styles.css" rel="stylesheet" />
```

**Step 4: Verify the font loads**

Run: `cd packages/website && npx vite dev`
Expected: The entire site renders in Satoshi. Headings, body text, and navigation should all use the new font. Code blocks still use the browser's default monospace.

**Step 5: Commit**

```
feat(website): add Satoshi variable font and configure as default sans
```

---

### Task 2: Add MonoLisa font and configure as monospace

**Prerequisites:** User must provide MonoLisa font files (purchased separately). If MonoLisa is not yet available, skip this task and revisit later. The rest of the plan does not depend on it.

**Files:**

- Create: `packages/website/public/fonts/MonoLisa-Regular.woff2`
- Create: `packages/website/public/fonts/MonoLisa-Bold.woff2` (if available)
- Modify: `packages/website/src/styles.css` (add @font-face, update @theme)

**Step 1: Add MonoLisa font files**

Place the MonoLisa WOFF2 files in `packages/website/public/fonts/`.

**Step 2: Add @font-face and register in @theme**

Add to `packages/website/src/styles.css` after the Satoshi declarations:

```css
@font-face {
  font-family: 'MonoLisa';
  src: url('/fonts/MonoLisa-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: optional;
  font-style: normal;
}
```

Update the `@theme` block to include the mono font:

```css
@theme {
  --color-gray-850: #131921;
  --font-sans: 'Satoshi', ui-sans-serif, system-ui, sans-serif;
  --font-mono:
    'MonoLisa', ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace;
}
```

**Step 3: Verify code blocks use MonoLisa**

Run: `cd packages/website && npx vite dev`
Expected: All code blocks, inline code, and the hero install command render in MonoLisa. Body text still uses Satoshi.

**Step 4: Commit**

```
feat(website): add MonoLisa as monospace font
```

---

### Task 3: Refine color system and section backgrounds

**Files:**

- Modify: `packages/website/src/styles.css:10-12` (@theme block)
- Modify: `packages/website/src/styles.css:48` (body bg)
- Modify: `packages/website/src/styles.css:86-88` (section border)
- Modify: `packages/website/src/page/landing.ts` (section background classes)

**Step 1: Add warm background color to @theme**

In `packages/website/src/styles.css`, add the warm neutral to the `@theme` block:

```css
@theme {
  --color-gray-850: #131921;
  --color-warm-50: #fafaf8;
  --font-sans: 'Satoshi', ui-sans-serif, system-ui, sans-serif;
  --font-mono:
    'MonoLisa', ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace;
}
```

**Step 2: Update body background**

Change the body background in `packages/website/src/styles.css` line 48 from:

```css
@apply text-base text-gray-800 dark:text-gray-300 bg-gray-100 dark:bg-gray-900;
```

to:

```css
@apply text-base text-gray-800 dark:text-gray-300 bg-warm-50 dark:bg-gray-900;
```

**Step 3: Remove section border separator**

In `packages/website/src/styles.css`, remove or comment out lines 86-88:

```css
.landing-section + .landing-section {
  @apply border-t border-gray-200 dark:border-gray-800;
}
```

The alternating section backgrounds will provide visual separation instead.

**Step 4: Update section backgrounds in landing.ts**

Apply alternating backgrounds to sections in `packages/website/src/page/landing.ts`. The current section order (line 39-54) and their proposed backgrounds:

| Section function                    | Current bg class              | Target bg class                   |
| ----------------------------------- | ----------------------------- | --------------------------------- |
| `heroSection` (line 66)             | `bg-white dark:bg-gray-900`   | Keep as-is                        |
| `promiseSection` (line 248)         | `bg-gray-50 dark:bg-gray-850` | Keep as-is (already wash)         |
| `demoSection` (line 301)            | none (base)                   | Keep as-is                        |
| `poweredBySection` (line 167)       | `bg-gray-50 dark:bg-gray-850` | Keep as-is (already wash)         |
| `includedSection` (line 358)        | none (base)                   | Keep as-is                        |
| `aiSection`                         | Has canvas, dark bg           | Keep as-is                        |
| `whyFoldkitSection` (line 488)      | none (base)                   | Add `bg-gray-50 dark:bg-gray-850` |
| `audienceSection` (line 544)        | `bg-gray-50 dark:bg-gray-850` | Keep as-is (already wash)         |
| `comparisonStripSection` (line 690) | none (base)                   | Add `bg-gray-50 dark:bg-gray-850` |
| `trustSection` (line 733)           | `bg-gray-50 dark:bg-gray-850` | Remove wash — use base            |
| `finalCtaSection` (line 902)        | none (base)                   | Add `bg-gray-50 dark:bg-gray-850` |

The key changes are:

- `whyFoldkitSection` line 488: Change `Class('landing-section')` to `Class('landing-section bg-gray-50 dark:bg-gray-850')`
- `comparisonStripSection` line 690: Add `bg-gray-50 dark:bg-gray-850` to its class
- `trustSection` line 733: Remove `bg-gray-50 dark:bg-gray-850` (move to base)
- `finalCtaSection` line 902: Add `bg-gray-50 dark:bg-gray-850` to its class

**Step 5: Verify alternating rhythm**

Run: `cd packages/website && npx vite dev`
Expected: Sections alternate between white/gray-900 and gray-50/gray-850 backgrounds. No border lines between sections. The light mode body background has a barely perceptible warm tint.

**Step 6: Commit**

```
feat(website): refine color system with warm neutrals and alternating section backgrounds
```

---

### Task 4: Upgrade CTA buttons and landing cards

**Files:**

- Modify: `packages/website/src/styles.css:94-137` (CTA and card classes)

**Step 1: Add pink glow to .cta-primary**

In `packages/website/src/styles.css`, update `.cta-primary` (lines 94-96) from:

```css
.cta-primary {
  @apply inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-pink-600 dark:bg-pink-500 text-white font-semibold text-base transition hover:bg-pink-700 dark:hover:bg-pink-600 active:bg-pink-800 dark:active:bg-pink-700;
}
```

to:

```css
.cta-primary {
  @apply inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-pink-600 dark:bg-pink-500 text-white font-semibold text-base transition hover:bg-pink-700 dark:hover:bg-pink-600 active:bg-pink-800 dark:active:bg-pink-700 shadow-sm shadow-pink-600/20 hover:shadow-md hover:shadow-pink-600/30;
}
```

**Step 2: Add depth to .landing-card**

Update `.landing-card` (lines 135-137) from:

```css
.landing-card {
  @apply rounded-xl bg-white border border-gray-200 dark:border-gray-700;
}
```

to:

```css
.landing-card {
  @apply rounded-xl bg-white border border-gray-200/60 shadow-sm dark:border-gray-700/40 dark:shadow-lg dark:shadow-black/10;
}
```

**Step 3: Verify buttons and cards**

Run: `cd packages/website && npx vite dev`
Expected: Primary CTA buttons have a subtle pink glow. Landing cards have gentle shadows in light mode and deeper shadows in dark mode.

**Step 4: Commit**

```
feat(website): add depth to CTA buttons and landing cards
```

---

### Task 5: Add gradient text to hero "Beautifully"

**Files:**

- Modify: `packages/website/src/page/landing.ts:98-101` (hero heading span)

**Step 1: Replace flat pink with gradient**

In `packages/website/src/page/landing.ts`, update the "Beautifully" span (lines 98-101) from:

```typescript
span(
  [Class('text-pink-600 dark:text-pink-500')],
  ['Beautifully'],
),
```

to:

```typescript
span(
  [
    Class(
      'bg-gradient-to-r from-pink-600 to-rose-500 dark:from-pink-500 dark:to-rose-400 bg-clip-text text-transparent',
    ),
  ],
  ['Beautifully'],
),
```

**Step 2: Verify gradient renders**

Run: `cd packages/website && npx vite dev`
Expected: "Beautifully" in the hero shows a subtle pink-to-rose gradient. It should be noticeable but not garish — the gradient adds depth without screaming "gradient text."

**Step 3: Commit**

```
feat(website): add gradient text treatment to hero headline
```

---

### Task 6: Upgrade hero typography

**Files:**

- Modify: `packages/website/src/page/landing.ts:94` (h1 class)

**Step 1: Bump hero to font-black**

The hero h1 is already `text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight`. The one change is upgrading from `font-bold` to `font-black` for more visual weight:

In `packages/website/src/page/landing.ts` line 94, change:

```
'text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight leading-[1.1] text-balance'
```

to:

```
'text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white tracking-tight leading-[1.1] text-balance'
```

**Step 2: Verify hero weight**

Run: `cd packages/website && npx vite dev`
Expected: The hero headline is noticeably heavier/bolder. Satoshi at font-black (900 weight) should feel commanding.

**Step 3: Commit**

```
feat(website): use font-black for hero headline
```

---

### Task 7: Upgrade section heading typography

**Files:**

- Modify: `packages/website/src/page/landing.ts` (all h2 heading classes)

**Step 1: Update all section h2 headings**

Find all h2 section headings with `text-2xl md:text-3xl` and change to `text-3xl md:text-4xl` with `tracking-tight`. The affected lines are:

- Line 257 (Promise section "Declare behavior. Ship. Repeat.")
- Line 309 (Demo section "Peek inside.")
- Line 366 (Batteries section "Batteries included.")
- Line 496 (Why Foldkit "What's the catch?")
- Line 743 (Trust section "Proof of life.")

For each, change the pattern:

```
'text-2xl md:text-3xl font-bold text-gray-900 dark:text-white ...'
```

to:

```
'text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight ...'
```

Also update these h2 headings that follow a slightly different pattern:

- Line 559 ("Who it's for") and line 589 ("Who it's not for") in the audience section
- Line 699 (Comparison strip "How does Foldkit compare to React?")
- Line 856 (AI section heading)
- Line 906 (Final CTA "Ready to be bored?")

Note: Read each line carefully before editing — some may have extra classes like `mb-3`, `text-center`, `text-balance` that should be preserved. Only change the size and add tracking.

**Step 2: Verify heading hierarchy**

Run: `cd packages/website && npx vite dev`
Expected: All section headings are one size step larger and have tighter tracking. They should feel more authoritative while the hero still clearly dominates.

**Step 3: Commit**

```
feat(website): bump section headings to text-3xl/4xl with tight tracking
```

---

### Task 8: Add colored icon pills to Batteries Included section

**Files:**

- Modify: `packages/website/src/page/landing.ts:332-354` (includedFeature helper)
- Modify: `packages/website/src/page/landing.ts:384-476` (feature card calls)

**Step 1: Update includedFeature to accept an icon color class**

Change the `includedFeature` function (lines 332-354) to accept an icon background color:

From:

```typescript
const includedFeature = (
  icon: Html,
  title: string,
  description: ReadonlyArray<string | Html>,
): Html =>
  div(
    [Class('landing-card p-6 dark:bg-gray-850')],
    [
      div([Class('mb-3 text-pink-600 dark:text-pink-500')], [icon]),
      h3(
        [Class('text-base font-semibold text-gray-900 dark:text-white mb-2')],
        [title],
      ),
      p(
        [Class('text-gray-600 dark:text-gray-300 leading-relaxed')],
        description,
      ),
    ],
  )
```

To:

```typescript
const includedFeature = (
  icon: Html,
  title: string,
  description: ReadonlyArray<string | Html>,
  iconColorClass: string,
): Html =>
  div(
    [Class('landing-card p-6 dark:bg-gray-850')],
    [
      div(
        [
          Class(
            `inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${iconColorClass}`,
          ),
        ],
        [icon],
      ),
      h3(
        [Class('text-base font-semibold text-gray-900 dark:text-white mb-2')],
        [title],
      ),
      p(
        [Class('text-gray-600 dark:text-gray-300 leading-relaxed')],
        description,
      ),
    ],
  )
```

**Step 2: Update each feature call with its color**

Update the feature card calls (starting at line 384) to pass icon color classes:

```typescript
includedFeature(
  Icon.route('w-5 h-5'),
  'Routing',
  ['Type-safe bidirectional routing...'],
  'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
),
```

Color assignments:

- **Routing** (emerald): `'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'`
- **UI Components** (pink): Update the inline card at line 387 to use same pill pattern with `'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'`
- **Virtual DOM** (blue): `'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'`
- **Subscriptions** (amber): `'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'`
- **Field Validation** (pink): `'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'`
- **Side Effect Management** (violet): `'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'`

Note: The icon SVGs are currently `w-6 h-6`. Since they're now inside a `w-10 h-10` pill, reduce to `w-5 h-5` for better proportion.

Note: The UI Components card (lines 387-437) is inline rather than using the `includedFeature` helper. Apply the same pill pattern to it manually — wrap the icon div at line 390-392 in the same `inline-flex items-center justify-center w-10 h-10 rounded-lg` treatment.

**Step 3: Verify colored pills**

Run: `cd packages/website && npx vite dev`
Expected: Each feature card has a colored rounded square behind its icon. Colors match the demo's color language (emerald, amber, blue, violet, pink).

**Step 4: Commit**

```
feat(website): add colored icon pills to batteries included section
```

---

### Task 9: Upgrade Proof of Life stats section

**Files:**

- Modify: `packages/website/src/page/landing.ts:779-830` (trustItem and trustItemWithLink)

**Step 1: Update trustItem helper**

Change `trustItem` (lines 779-796) from:

```typescript
const trustItem = (label: string, value: string): Html =>
  li(
    [Class('landing-card p-5 text-center dark:bg-gray-850')],
    [
      p(
        [
          Class(
            'text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-1',
          ),
        ],
        [label],
      ),
      p([Class('text-xl font-bold text-gray-900 dark:text-white')], [value]),
    ],
  )
```

to:

```typescript
const trustItem = (label: string, value: string): Html =>
  li(
    [
      Class(
        'landing-card p-6 text-center dark:bg-gray-850 border-t-2 border-t-pink-600/30 dark:border-t-pink-500/30',
      ),
    ],
    [
      p(
        [
          Class(
            'text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2',
          ),
        ],
        [label],
      ),
      p(
        [Class('text-3xl md:text-4xl font-bold text-gray-900 dark:text-white')],
        [value],
      ),
    ],
  )
```

**Step 2: Update trustItemWithLink helper**

Change `trustItemWithLink` (lines 798-830) to match the same elevated style — larger link text, pink top border, more padding:

```typescript
const trustItemWithLink = (
  label: string,
  linkText: string,
  href: string,
): Html =>
  li(
    [
      Class(
        'landing-card p-6 text-center dark:bg-gray-850 border-t-2 border-t-pink-600/30 dark:border-t-pink-500/30',
      ),
    ],
    [
      p(
        [
          Class(
            'text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2',
          ),
        ],
        [label],
      ),
      a(
        [
          Href(href),
          Class(
            'text-pink-600 dark:text-pink-500 hover:underline text-2xl md:text-3xl font-bold',
          ),
        ],
        [
          linkText,
          span(
            [Class('inline-block ml-1')],
            [Icon.arrowRight('w-5 h-5 inline')],
          ),
        ],
      ),
    ],
  )
```

**Step 3: Verify stats section**

Run: `cd packages/website && npx vite dev`
Expected: Stats numbers are large and commanding. Each card has a subtle pink top border. The section feels like a proud dashboard rather than a footnote.

**Step 4: Commit**

```
feat(website): elevate proof of life stats with larger type and pink accents
```

---

### Task 10: Redesign footer

**Files:**

- Modify: `packages/website/src/main.ts:1170-1192` (landingFooter)

**Step 1: Expand the footer**

Replace the `landingFooter` const in `packages/website/src/main.ts` (lines 1170-1192) with:

```typescript
const landingFooter: Html = footer(
  [
    Class(
      'px-6 py-12 md:px-12 lg:px-20 text-center text-sm text-gray-500 dark:text-gray-400',
    ),
  ],
  [
    div(
      [Class('flex items-center justify-center gap-2 mb-4')],
      [
        img([
          Src('/foldkit-logo.svg'),
          Alt('Foldkit'),
          Class('h-6 dark:invert'),
        ]),
        span(
          [Class('text-base font-semibold text-gray-900 dark:text-white')],
          ['Foldkit'],
        ),
      ],
    ),
    div(
      [Class('flex items-center justify-center gap-4 mb-6')],
      [
        a(
          [
            Href(Link.github),
            Class('hover:text-gray-700 dark:hover:text-gray-200 transition'),
          ],
          ['GitHub'],
        ),
        span([Class('text-gray-300 dark:text-gray-600')], ['\u00B7']),
        a(
          [
            Href(Link.npm),
            Class('hover:text-gray-700 dark:hover:text-gray-200 transition'),
          ],
          ['npm'],
        ),
        span([Class('text-gray-300 dark:text-gray-600')], ['\u00B7']),
        a(
          [
            Href('/getting-started'),
            Class('hover:text-gray-700 dark:hover:text-gray-200 transition'),
          ],
          ['Docs'],
        ),
      ],
    ),
    p(
      [],
      [
        'Built with ',
        a(
          [
            Href(Link.github),
            Class('text-pink-600 dark:text-pink-500 hover:underline'),
          ],
          ['Foldkit'],
        ),
        ', naturally.',
      ],
    ),
  ],
)
```

Note: This adds `img` and `Src` imports — verify they're already imported in main.ts (they likely are for the header logo). Also verify `Alt` is imported. Check that `Link.npm` exists — if not, add it to the link module.

**Step 2: Verify footer**

Run: `cd packages/website && npx vite dev`
Expected: Footer shows the Foldkit logo mark, name, navigation links, and the sign-off line. It should feel like a confident close to the page.

**Step 3: Commit**

```
feat(website): redesign footer with logo and navigation links
```

---

### Task 11: Final visual review and polish pass

**Files:**

- Potentially any files modified in Tasks 1-10

**Step 1: Full visual review in both themes**

Run: `cd packages/website && npx vite dev`

Check the following in both light and dark mode:

1. Font rendering — Satoshi loads correctly, no FOUT (flash of unstyled text)
2. Hero gradient text — visible but not garish
3. Section background alternation — smooth rhythm, no jarring transitions
4. Card shadows — subtle in light, deeper in dark
5. CTA button glow — visible on hover
6. Feature card icon pills — colors are distinct and match demo language
7. Stats section — numbers are large and confident
8. Footer — logo, links, and sign-off all render correctly
9. Mobile responsiveness — check at 375px width

**Step 2: Check docs pages weren't affected**

Navigate to `/architecture-and-concepts` and verify:

- Docs page typography uses Satoshi correctly
- Code blocks use MonoLisa (or fallback mono)
- Sidebar, TOC, and navigation are unaffected
- No spacing regressions

**Step 3: Fix any issues found**

Address spacing, color, or layout issues discovered during review.

**Step 4: Commit any fixes**

```
fix(website): polish pass after visual upgrade
```
