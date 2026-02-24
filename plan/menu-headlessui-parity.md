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
- [x] Button moved detection (`DetectedButtonMovement` message, `Task.detectElementMovement`, cancels leave transition on layout shift)
- [x] Anchor positioning (Floating UI placement/flip/shift/offset, `--button-width` CSS variable, `anchor` config on `ViewConfig`)
- [x] iOS Safari scroll lock hardening (`touchmove` interception with scrollable container detection in `Task.lockScroll`)

## Remaining

### Portal rendering

**Scope:** New module

Headless UI renders the items container in a portal (appended to `<body>`) to escape stacking context and `overflow: hidden` ancestors. foldkit currently uses `position: absolute` with z-index, which works for the common case but clips inside overflow containers.

Portal rendering also requires **Tab key interception** — with the items container at the end of `<body>`, native Tab would focus the wrong element. Must `preventDefault()` Tab and programmatically move focus relative to the button.

**Subparts:**

- Portal rendering mechanism (move DOM node to body)
- Tab key interception (focus next/previous relative to button)
- Integration with existing anchor positioning

**Reference:** `menu.tsx` lines 362-391 + 546-564, `internal/floating.ts`

## Not applicable to foldkit

These Headless UI features are React-specific patterns that don't map to foldkit's architecture:

- **`as` prop** — foldkit uses `itemToConfig` callback pattern instead of render element override
- **Dynamic item registration** — foldkit takes a declarative `items` array; no need for register/unregister
- **Render props (`close()`, `active`, `focus`)** — foldkit exposes state via `itemToConfig` context and the model
- **`static` / `unmount` props** — foldkit's virtual DOM handles mount/unmount; transition system already keeps items mounted during leave
- **`useTreeWalker` role assignment** — foldkit explicitly sets all roles in virtual DOM
- **Hover/focus/active data attributes on button** — could add later but not a parity blocker; foldkit consumers can use native CSS `:hover`/`:focus` on the button
- **Mobile outside-click scroll-vs-tap** — HeadlessUI needs a 30px movement threshold because it uses document-level `touchstart`/`touchend` listeners. Foldkit uses an explicit backdrop `div` with `OnClick`, and mobile browsers already suppress `click` events from scroll gestures natively.
