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
- [x] Space as typeahead character (when search query is active, Space adds to query instead of selecting)
- [x] Scroll lock (`Task.lockScroll` / `Task.unlockScroll`, `isModal` option on `InitConfig`)
- [x] Inert others (`Task.inertOthers` / `Task.restoreInert`, pairs with scroll lock under `isModal`)

## Remaining

### 1. Enter/Space clicks DOM element

**Scope:** New `Task` command

Headless UI calls `.click()` on the actual DOM node of the selected item. This means items rendered as links (`<a>`) or containing forms actually navigate/submit. Foldkit just sends `SelectedItem` with an index — the consumer never gets a real click event.

**Change:** Add `Task.clickElement(selector, () => Message)` command. When Enter/Space selects an item, issue this command targeting the item's DOM node. The click event will bubble normally, then the menu closes.

**Reference:** `menu.tsx` line 475-478

### 2. Quick release (drag-to-select)

**Scope:** New pointer tracking behavior

Headless UI supports a "quick release" interaction: pointerdown on the button opens the menu, then dragging into an item and releasing selects it. This enables fast one-gesture menu selection on both desktop and mobile.

Thresholds prevent accidental activation: the pointer must move at least 5px from the initial pointerdown position, and the button must be held for at least 200ms before a release on an item counts as a selection.

**Change:** Track pointer origin on `pointerdown` (button open). On `pointerup` inside items container, check distance from origin (>= 5px) and elapsed time (>= 200ms). If both thresholds met and pointer is over an enabled item, select it. Requires tracking `pointerOrigin: Option<{ x: number; y: number; time: number }>` in the model.

**Reference:** `menu.tsx` pointerdown/pointerup handlers, `use-tracked-pointer.ts`

### 3. Firefox Space keyup workaround

**Scope:** Keyboard event handler change

Firefox fires a spurious `click` event on the button when Space is released after opening the menu via Space key. This causes the menu to immediately close after opening.

**Change:** Track whether the menu was opened via Space keydown. On the next `keyup` for Space, `preventDefault()` to suppress the synthetic click. This is a targeted Firefox workaround — other browsers don't exhibit this behavior.

**Reference:** `menu.tsx` keydown/keyup handlers for Space

### 4. Button moved detection

**Scope:** Model field + position tracking command

Headless UI tracks the button's visual position when the menu closes. If the button physically moves in the viewport (layout shift) before the close transition finishes, it cancels the transition to prevent the dropdown from animating at the wrong position.

**Change:** On close, snapshot the button's `getBoundingClientRect()`. Issue a `Task` command that watches for position changes (via rAF polling or `ResizeObserver`). If the position changes, send a message that immediately sets `transitionState` to `Idle`, skipping the animation.

**Reference:** `menu-machine.ts` lines 351-358, 409-421, `element-movement.ts`

### 5. Anchor positioning + portal rendering

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

## Mobile / iOS

Cross-cutting concerns for touch devices and mobile browsers. These affect existing features and should be addressed alongside or before the remaining desktop items.

### 6. Pointer events instead of mouse events on items

**Scope:** Event handler migration in `view`

Foldkit uses `OnMouseEnter`, `OnMouseLeave`, and `OnMouseMove` on menu items. These fire unreliably on touch devices — `mouseleave` may not fire at all, and `mouseenter` fires on tap rather than hover. Pointer Events (`pointerenter`, `pointerleave`, `pointermove`) work across mouse, touch, and pen input types consistently.

**Change:** Replace `OnMouseEnter` → `OnPointerEnter`, `OnMouseLeave` → `OnPointerLeave`, `OnMouseMove` → `OnPointerMove` on item elements. May also want to filter by `pointerType` to avoid activating hover states on `touch` events (Headless UI ignores pointer events with `pointerType === 'touch'` for item activation).

**Reference:** `menu.tsx` pointer event handlers, Headless UI filters `evt.pointerType` checks

### 7. iOS Safari scroll lock hardening

**Scope:** Enhancement to `Task.lockScroll` in `packages/foldkit/src/task/scrollLock.ts`

The current scroll lock implementation sets `overflow: hidden` on `documentElement` and compensates for scrollbar width. This is insufficient on iOS Safari, which ignores `overflow: hidden` on `<html>`/`<body>` for touch scrolling. iOS requires intercepting `touchmove` events to actually prevent scroll.

**Change:** In `lockScroll`, add iOS detection (via user agent or touch event presence). When on iOS:

- Add `touchmove` listener on `document` that calls `preventDefault()` for touches outside scrollable containers
- Set `overscroll-behavior: contain` on scrollable elements within the menu to allow internal scrolling while blocking page scroll
- Clean up touch listeners in `unlockScroll`

**Reference:** Headless UI `use-scroll-lock.ts` — handles iOS with `touchstart`/`touchmove` interception and overflow container detection

### 8. Mobile outside-click: distinguish scroll from tap

**Scope:** Enhancement to backdrop/outside-click handling

On mobile, users commonly scroll by touching and dragging on the page. The current backdrop click handler treats all `pointerup`/`click` events as intentional closes. This means scrolling the page behind an open menu (on non-modal menus) can accidentally close it.

Headless UI tracks the pointer origin on `pointerdown` and compares it to the `pointerup` position. If the pointer moved more than 30px, it's treated as a scroll gesture and the click is ignored.

**Change:** For non-modal menus (where the backdrop doesn't block interaction), track the pointer origin on `pointerdown` outside the menu. On `pointerup`, compare distance — if > 30px, suppress the close. Modal menus with a backdrop div are unaffected since the backdrop itself intercepts the event.

**Reference:** Headless UI `use-outside-click.ts` — 30px movement threshold

### 9. Mouse vs touch button toggle

**Scope:** Enhancement to button interaction handling

Headless UI differentiates mouse and touch input on the button. For mouse, it uses `pointerdown` to open (so the menu appears on press, enabling drag-to-select). For touch/pen, it uses `click` (which fires on release) to avoid blocking scroll gestures — a `pointerdown` handler on touch would interfere with the browser's scroll detection.

**Change:** Replace `OnClick` on the button with `OnPointerDown` that checks `pointerType`. For `mouse`, toggle immediately on pointerdown. For `touch` or `pen`, let it fall through to a `click` handler. This pairs with item 2 (quick release) — mouse pointerdown enables the drag-to-select gesture, while touch click keeps scrolling smooth.

**Reference:** `menu.tsx` button pointerdown + click handlers with `pointerType` checks

## Not applicable to foldkit

These Headless UI features are React-specific patterns that don't map to foldkit's architecture:

- **`as` prop** — foldkit uses `itemToConfig` callback pattern instead of render element override
- **Dynamic item registration** — foldkit takes a declarative `items` array; no need for register/unregister
- **Render props (`close()`, `active`, `focus`)** — foldkit exposes state via `itemToConfig` context and the model
- **`static` / `unmount` props** — foldkit's virtual DOM handles mount/unmount; transition system already keeps items mounted during leave
- **`useTreeWalker` role assignment** — foldkit explicitly sets all roles in virtual DOM
- **Hover/focus/active data attributes on button** — could add later but not a parity blocker; foldkit consumers can use native CSS `:hover`/`:focus` on the button
