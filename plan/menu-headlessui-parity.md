# Menu: Headless UI Parity Plan

Tracking remaining work to reach feature parity with Headless UI's Menu component.

Reference: `~/Repos/headlessui/packages/@headlessui-react/src/components/menu/menu.tsx`

## Completed

- [x] Keyboard navigation (ArrowUp/Down, Home/End, PageUp/Down, Escape)
- [x] Typeahead search with debounce
- [x] Pointer tracking with coordinate deduplication
- [x] Focus management (aria-activedescendant pattern)
- [x] Disabled items and disabled button
- [x] CSS transition system (enter/leave state machine, data attributes)
- [x] Item grouping with headings and separators
- [x] Activation trigger tracking (Pointer vs Keyboard)
- [x] Backdrop click to close
- [x] Tab to close (native browser focus advancement works correctly without manual interception)

## Remaining

### 1. Space as typeahead character

**Scope:** ~10 lines in `update`

Headless UI treats Space as a typeahead character when `searchQuery !== ''`, falling through to "select active item" only when there's no active search. Foldkit always treats Space as select. This means you can't type multi-word queries like "Danger Zone" in typeahead.

**Change:** In the items keydown handler, check if `searchQuery` is non-empty before treating Space as select. If searching, treat it as a `Searched` message with `' '` as the key.

**Reference:** `menu.tsx` line 465-470

### 2. Scroll lock

**Scope:** New `Task` command + `InitConfig` option

Headless UI locks body scroll when the menu is open, gated by a `modal` prop (default `true`). Prevents page from scrolling while navigating menu items.

**Change:** Add `isModal?: boolean` to `InitConfig` (default `true`). On `Opened`, if `isModal`, issue a `Task.lockScroll()` command. On close, issue `Task.unlockScroll()`. Implementation sets `overflow: hidden` on `document.body` (or uses `scrollbar-gutter: stable` to prevent layout shift).

**Reference:** `menu.tsx` line 409-410, `use-scroll-lock.ts`

### 3. Inert others

**Scope:** New `Task` command, pairs with scroll lock

Headless UI applies `inert` attribute to all sibling elements outside the menu when open, preventing interaction with the rest of the page. Same `modal` gate as scroll lock.

**Change:** On open, issue `Task.inertOthers(containerSelector)` which walks up from the menu wrapper and sets `inert` on all siblings/ancestors' siblings. On close, remove all `inert` attributes. Must track which elements were made inert to restore correctly.

**Reference:** `menu.tsx` line 413-419, `use-inert-others.ts`

### 4. Enter/Space clicks DOM element

**Scope:** New `Task` command

Headless UI calls `.click()` on the actual DOM node of the selected item. This means items rendered as links (`<a>`) or containing forms actually navigate/submit. Foldkit just sends `SelectedItem` with an index — the consumer never gets a real click event.

**Change:** Add `Task.clickElement(selector, () => Message)` command. When Enter/Space selects an item, issue this command targeting the item's DOM node. The click event will bubble normally, then the menu closes.

**Reference:** `menu.tsx` line 475-478

### 5. Button moved detection

**Scope:** Model field + position tracking command

Headless UI tracks the button's visual position when the menu closes. If the button physically moves in the viewport (layout shift) before the close transition finishes, it cancels the transition to prevent the dropdown from animating at the wrong position.

**Change:** On close, snapshot the button's `getBoundingClientRect()`. Issue a `Task` command that watches for position changes (via rAF polling or `ResizeObserver`). If the position changes, send a message that immediately sets `transitionState` to `Idle`, skipping the animation.

**Reference:** `menu-machine.ts` lines 351-358, 409-421, `element-movement.ts`

### 6. Anchor positioning + portal rendering

**Scope:** New module — largest item

Headless UI uses Floating UI to auto-position the dropdown relative to the button. Supports directional placement (`top`, `bottom`, `left`, `right` with start/end alignment), configurable gap/offset, viewport padding, and automatic flipping when the dropdown would overflow. Renders items in a portal to escape stacking context/overflow issues.

This also requires **intercepting Tab key** for correct focus advancement. With portal rendering, the items container is at the end of `<body>`, so native Tab would focus the wrong element. Must `preventDefault()` Tab and programmatically move focus relative to the button (not the portal).

Exposes `--button-width` CSS variable on the items container for width matching.

**Subparts:**

- Portal rendering mechanism (move DOM node to body)
- Floating position calculation (placement, flip, shift, offset)
- `--button-width` CSS variable
- Tab key interception (focus next/previous relative to button)
- `anchor` config option on `ViewConfig`

**Reference:** `menu.tsx` lines 362-391 + 546-564, `internal/floating.ts`

## Not applicable to foldkit

These Headless UI features are React-specific patterns that don't map to foldkit's architecture:

- **`as` prop** — foldkit uses `itemToConfig` callback pattern instead of render element override
- **Dynamic item registration** — foldkit takes a declarative `items` array; no need for register/unregister
- **Render props (`close()`, `active`, `focus`)** — foldkit exposes state via `itemToConfig` context and the model
- **`static` / `unmount` props** — foldkit's virtual DOM handles mount/unmount; transition system already keeps items mounted during leave
- **`useTreeWalker` role assignment** — foldkit explicitly sets all roles in virtual DOM
- **Hover/focus/active data attributes on button** — could add later but not a parity blocker; foldkit consumers can use native CSS `:hover`/`:focus` on the button
