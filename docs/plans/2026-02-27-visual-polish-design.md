# Visual Polish & Typography Upgrade

**Goal:** Take the Foldkit website from "really good" to "holy shit" through typography, color, spacing, and component refinements. No structural changes to the page layout or content.

**Approach:** Visual identity upgrade (Approach 2 from brainstorming). The copy and page structure are strong — the visual execution needs to match that quality.

---

## Typography

### Fonts

- **Satoshi** (Fontshare, free) — Headings and body text. Geometric, warm, precise. Reads as a deliberate choice, not a default.
- **MonoLisa** (paid, ~$58-$248) — All code: inline code, code blocks, demo panels, install command. Premium code font with personality and excellent small-size readability.

### Type Scale

| Element                  | Current                          | Proposed                                                     |
| ------------------------ | -------------------------------- | ------------------------------------------------------------ |
| Hero headline            | `text-3xl md:text-4xl font-bold` | `text-4xl md:text-5xl lg:text-6xl font-black tracking-tight` |
| Section headlines (h2)   | `text-2xl md:text-3xl font-bold` | `text-3xl md:text-4xl font-bold tracking-tight`              |
| Feature card titles (h3) | `text-lg font-semibold`          | `text-xl font-semibold`                                      |
| Body text                | `text-base leading-relaxed`      | `text-base leading-relaxed` (unchanged)                      |
| Code blocks              | `text-sm font-mono`              | `text-sm` in MonoLisa                                        |
| Install command          | `text-sm font-mono`              | `text-base` in MonoLisa                                      |

### Font Loading

Self-host both fonts. Use `font-display: swap` for body, `font-display: optional` for code (code blocks render late enough that flash is unlikely). Preload the primary weight files.

---

## Color System

### Neutrals

| Token           | Current                 | Proposed                           | Note                                |
| --------------- | ----------------------- | ---------------------------------- | ----------------------------------- |
| Light bg        | `gray-100`              | Custom `--warm-50` ~`#FAFAF8`      | Barely perceptible warmth           |
| Dark bg         | `gray-900`              | Keep                               | Blue cast works with pink accent    |
| Dark card bg    | `gray-850` (#131921)    | Keep                               | Good contrast against gray-900      |
| Section borders | `gray-200` / `gray-800` | Remove `border-t` between sections | Replaced by alternating backgrounds |

### Accent

- Pink-600/pink-500 stays. No hue changes.
- Add **colored shadow** to `.cta-primary`: `shadow-sm shadow-pink-600/20`, hover `shadow-md shadow-pink-600/30`
- Hero "Beautifully" gets a **pink-to-rose gradient** text treatment instead of flat `text-pink-600`

### Section Backgrounds

Alternate sections between base background and subtle wash:

| Section                      | Background                     |
| ---------------------------- | ------------------------------ |
| Hero                         | Base (white / gray-900)        |
| Promise ("Declare behavior") | Wash (`gray-50` / `gray-850`)  |
| Demo ("Peek inside")         | Base                           |
| Powered by Effect            | Wash                           |
| Batteries included           | Base                           |
| AI section                   | Has animated grid — keep as-is |
| What's the catch             | Wash                           |
| Who it's for / not for       | Base                           |
| Comparison strip             | Wash                           |
| Proof of life                | Base                           |
| Final CTA                    | Wash                           |

---

## Component Refinements

### Landing Cards

**Current:** `rounded-xl bg-white border border-gray-200 dark:border-gray-700`

**Proposed:**

- Light: `rounded-xl bg-white border border-gray-200/60 shadow-sm`
- Dark: `rounded-xl bg-gray-850 border border-gray-700/40 shadow-lg shadow-black/10`
- Interactive hover: `hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-shadow`

### CTA Buttons

- `.cta-primary`: Add `shadow-sm shadow-pink-600/20`, hover `shadow-md shadow-pink-600/30`
- `.cta-gradient`: Bump border opacity for better light mode visibility

### Batteries Included Grid

- Each feature card gets a **colored icon background pill** using the demo color language:
  - Routing: emerald
  - UI Components: pink
  - Virtual DOM: blue
  - Subscriptions: amber
  - Field Validation: pink
  - Side Effect Management: violet
- Mobile: alternate indentation for visual rhythm

### Proof of Life Stats

- Numbers: `text-3xl md:text-4xl font-bold`
- Labels: `text-sm text-gray-500 uppercase tracking-wide`
- Subtle pink top-border accent on each stat

### Footer

Expand from "Built with Foldkit." to:

```
[logo mark]  Foldkit
GitHub  ·  npm  ·  Docs

Built with Foldkit, naturally.
```

---

## What's NOT Changing

- Page structure and section order
- All copy and messaging
- The animated grid canvas (hero + AI section)
- The interactive demo architecture and behavior
- The demo color scheme (emerald/amber/blue/violet)
- Dark mode toggle behavior
- Responsive breakpoints and layout structure
- Docs pages layout (sidebar + content + TOC)

---

## Follow-up Opportunities (Approach 3)

These are intentionally deferred but noted for future work:

- Scroll-triggered section reveals (gentle fade-in on enter)
- Section-specific ambient backgrounds (textures, radial glows)
- Interactive feature card hover states
- Animated stat counters on scroll into view
