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
- [x] Enter/Space clicks DOM element (`Task.clickElement`, `RequestedItemClick` two-message flow)
- [x] Pointer events instead of mouse events on items (pointer event migration with touch filtering)
- [x] Firefox Space keyup workaround (`OnKeyUpPreventDefault` on button and items container)
- [x] Quick release / drag-to-select (`OnPointerDown`/`OnPointerUp`, `PressedPointerOnButton`/`ReleasedPointerOnItems`, 5px + 200ms thresholds)
- [x] Mouse vs touch button toggle (mouse toggles on `pointerdown`, touch/pen falls through to `click` via `lastButtonPointerType`)

## Remaining

### 2. Button moved detection

**Scope:** Model field + position tracking command

Headless UI tracks the button's visual position when the menu closes. If the button physically moves in the viewport (layout shift) before the close transition finishes, it cancels the transition to prevent the dropdown from animating at the wrong position.

**Change:** On close, snapshot the button's `getBoundingClientRect()`. Issue a `Task` command that watches for position changes (via rAF polling or `ResizeObserver`). If the position changes, send a message that immediately sets `transitionState` to `Idle`, skipping the animation.

**Reference:** `menu-machine.ts` lines 351-358, 409-421, `element-movement.ts`

### 3. Anchor positioning + portal rendering

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

### 4. iOS Safari scroll lock hardening

**Scope:** Enhancement to `Task.lockScroll` in `packages/foldkit/src/task/scrollLock.ts`

The current scroll lock implementation sets `overflow: hidden` on `documentElement` and compensates for scrollbar width. This is insufficient on iOS Safari, which ignores `overflow: hidden` on `<html>`/`<body>` for touch scrolling. iOS requires intercepting `touchmove` events to actually prevent scroll.

**Change:** In `lockScroll`, add iOS detection (via user agent or touch event presence). When on iOS:

- Add `touchmove` listener on `document` that calls `preventDefault()` for touches outside scrollable containers
- Set `overscroll-behavior: contain` on scrollable elements within the menu to allow internal scrolling while blocking page scroll
- Clean up touch listeners in `unlockScroll`

**Reference:** Headless UI `use-scroll-lock.ts` — handles iOS with `touchstart`/`touchmove` interception and overflow container detection

### 5. Mobile outside-click: distinguish scroll from tap

**Scope:** Enhancement to backdrop/outside-click handling

On mobile, users commonly scroll by touching and dragging on the page. The current backdrop click handler treats all `pointerup`/`click` events as intentional closes. This means scrolling the page behind an open menu (on non-modal menus) can accidentally close it.

Headless UI tracks the pointer origin on `pointerdown` and compares it to the `pointerup` position. If the pointer moved more than 30px, it's treated as a scroll gesture and the click is ignored.

**Change:** For non-modal menus (where the backdrop doesn't block interaction), track the pointer origin on `pointerdown` outside the menu. On `pointerup`, compare distance — if > 30px, suppress the close. Modal menus with a backdrop div are unaffected since the backdrop itself intercepts the event.

**Reference:** Headless UI `use-outside-click.ts` — 30px movement threshold

## Not applicable to foldkit

These Headless UI features are React-specific patterns that don't map to foldkit's architecture:

- **`as` prop** — foldkit uses `itemToConfig` callback pattern instead of render element override
- **Dynamic item registration** — foldkit takes a declarative `items` array; no need for register/unregister
- **Render props (`close()`, `active`, `focus`)** — foldkit exposes state via `itemToConfig` context and the model
- **`static` / `unmount` props** — foldkit's virtual DOM handles mount/unmount; transition system already keeps items mounted during leave
- **`useTreeWalker` role assignment** — foldkit explicitly sets all roles in virtual DOM
- **Hover/focus/active data attributes on button** — could add later but not a parity blocker; foldkit consumers can use native CSS `:hover`/`:focus` on the button
