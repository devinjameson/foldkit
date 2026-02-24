# Anchor Positioning Research: Portal vs Popover

Research findings for menu item 3 (anchor positioning + rendering escape).

## The Problem

Menu items container can be clipped by ancestor `overflow: hidden`, buried under `z-index` stacking contexts, or constrained by `transform` containment. We need the items to visually escape these constraints while staying positioned relative to the button.

Two sub-problems:

1. **Rendering escape** — get the items above everything else
2. **Positioning** — place the items relative to the button with flip/shift/offset

## Approach A: Portal Primitive

Build a first-class vdom portal that reparents content to a container at `<body>`.

### How it would work in snabbdom

Snabbdom's `updateChildren` uses `insertBefore(parentElm, elm, ref)` — it expects elements to be children of `parentElm`. If an element has been reparented to `<body>`, snabbdom will yank it back or fail on `removeChild`. This means **we cannot reparent within the same patch cycle**.

The viable path is a **runtime-level portal manager**: the view returns portal content as a separate vnode, the runtime patches it into a dedicated container via a second `patch()` call, and the main tree gets a comment node placeholder.

### What it requires

- New `portal()` helper in `html.ts` that produces a placeholder + extractable content
- Runtime changes: `render()` must detect portals, maintain a second `maybeCurrentPortalVNodeRef`, and call `patch()` twice per update cycle
- Portal container lifecycle management (create on first portal, remove on last)
- Cleanup coordination with transitions (portal container must outlive leave animations)
- Changes to how `Html` is structured (view returns main tree + portal trees)

### Tradeoffs

- **Pro**: Full generality — works for any "render somewhere else" scenario
- **Pro**: No browser API dependency
- **Con**: Significant runtime complexity — second patch cycle, container lifecycle
- **Con**: Every portal-using component must coordinate with the runtime
- **Con**: Testing becomes more complex (two DOM trees to verify)
- **Con**: Permanent maintenance burden on a core infrastructure primitive

## Approach B: Popover API (`popover="manual"`)

Use the browser's native top layer via `showPopover()` to visually escape containment without reparenting.

### How it works

`popover="manual"` on an element + `showPopover()` promotes it to the browser's **top layer** — a rendering layer above all page content. The element escapes `overflow: hidden`, `z-index` stacking, and `transform`/`contain` containment. Critically, **the element stays in its original DOM position**. Snabbdom never knows the difference.

### What it requires

- New `Popover` attribute variant in the HTML DSL (trivial — same pattern as `Open` for `<details>`)
- New `showPopover(selector)` / `hidePopover(selector)` Task commands (trivial — same pattern as `showModal`/`closeModal`)
- Floating UI integration for positioning (same effort either way)
- Custom backdrop element (popover's `::backdrop` is `<dialog>`-only, but the menu already handles its own backdrop)

### Browser support

- Chrome 114+ (June 2023)
- Safari 17+ (September 2023)
- Firefox 125+ (April 2024)

Baseline available. Same floor foldkit would need for any modern feature in 2026.

### Tradeoffs

- **Pro**: Zero vdom complexity — element stays in DOM tree, snabbdom patches normally
- **Pro**: No runtime changes, no second patch cycle, no container lifecycle
- **Pro**: Native browser primitive — progressively enhanced, no maintenance burden
- **Pro**: Foldkit already has the `showModal`/`closeModal` pattern — identical shape
- **Con**: Requires JS positioning (Floating UI) since top-layer elements lose CSS position context relative to ancestors — but we need Floating UI anyway
- **Con**: No light dismiss with `manual` — but menu already handles close-on-backdrop-click

## Approach C: CSS Anchor Positioning (future)

CSS Anchor Positioning (`anchor()`, `position-anchor`, `@position-try`) became baseline in January 2026. It positions elements relative to an anchor **entirely in CSS** and works natively with the popover API.

This could eventually replace Floating UI's JS calculations. Not ready to be the sole strategy today (HeadlessUI hasn't adopted it, edge cases still emerging), but worth designing the architecture to accommodate it later.

## HeadlessUI's Current Approach

HeadlessUI still uses **React portals + Floating UI**. They have not adopted the popover API. This is likely because:

- They support older browser versions
- React's `createPortal` is a zero-cost abstraction (first-class primitive)
- Their portal infrastructure already exists and works

Foldkit's situation is different: we don't have `createPortal`, and building a portal primitive is a significant investment. The popover API gives us the same rendering escape for free.

## Recommendation

**Use `popover="manual"` for the rendering escape. Use Floating UI for positioning. Skip the portal primitive for now.**

Rationale:

1. The portal's only purpose is rendering escape. `popover` provides the same escape with zero vdom complexity.
2. Building a portal means modifying the runtime, maintaining a second patch cycle, and managing container lifecycle — permanent infrastructure cost for a problem the browser already solves.
3. Foldkit's strength is the Elm Architecture's simplicity. A portal primitive adds a second rendering path that every developer must understand. `popover` is invisible to the architecture.
4. If a genuine portal use case emerges later (one that `popover` can't handle), the snabbdom research is documented and the runtime-level approach is well understood. We're not closing that door.

The architecture for menu anchor positioning becomes:

1. Add `Popover` attribute + `showPopover`/`hidePopover` Task commands (small, matches existing patterns)
2. Add `@floating-ui/dom` dependency
3. Add a positioning command stream driven by `isOpen` that runs `autoUpdate` + `computePosition`
4. Add `anchor` config to menu's `ViewConfig`
5. When `anchor` is configured, items container gets `popover="manual"`, opens via `showPopover`, positions via Floating UI

No runtime changes. No new vdom primitives. The menu just uses two more HTML attributes and two more Task commands.

## Open Questions

- Should the Floating UI integration be a general-purpose `Task.anchorPosition` or menu-specific?
- How does `autoUpdate` map to foldkit's command stream pattern? (Likely: `isOpen` dependency → stream that sets up `autoUpdate` and emits position update messages)
- Should position be applied via inline styles (Floating UI's default) or CSS custom properties?
- Tab key interception: is this still needed if the element isn't reparented? (Probably not — DOM order is preserved, so native Tab works correctly)
