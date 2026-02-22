# foldkit

## 0.19.0

### Minor Changes

- fd9b6cf: ### Breaking Changes
  - **`m()` moved to `foldkit/message`** — import `m` from `foldkit/message` instead of `foldkit/schema`
  - **`r()` and `ts()` helpers added** — `r()` creates route schemas, `ts()` creates general tagged structs; `m()` is now reserved for message variants only

  ### Features
  - **Menu pointer events** — migrated from mouse events to pointer events with touch filtering for better cross-device support
  - **Menu drag-to-select** — split mouse and touch button toggle; mouse users can hold-and-drag to select menu items
  - **Menu scroll lock** — modal menus lock page scroll while open
  - **Menu screen reader isolation** — elements outside modal menus are marked inert
  - **Menu Space typeahead** — Space acts as a typeahead character when search is active
  - **Menu transitions** — transition system for animated open/close
  - **Menu keyboard DOM click** — keyboard selection clicks the actual DOM element for better compatibility
  - **Menu Firefox workaround** — Space keyup workaround for Firefox menu button bug
  - **Menu disabled items** — disabled button support with pointer tracking

  ### Internal
  - Split monolithic Task module into focused sub-files
  - Verb-first message naming across all apps and examples

## 0.18.0

### Minor Changes

- 401e224: Make `Command` accept schema values via conditional type, eliminating the need for individual message type declarations. `Command<typeof Foo>` now extracts the instance type automatically. Added optional `E` and `R` type parameters to `Command` for commands with error or service requirements.

## 0.17.0

### Minor Changes

- 598f974: Add headless Disclosure component and public barrel exports for all modules

## 0.16.0

### Minor Changes

- Add headless Tabs component to foldkit-ui
  - Horizontal and vertical orientations with arrow key navigation
  - Automatic and manual activation modes
  - Disabled tab support, skipped in keyboard navigation
  - Panel persistence option to keep inactive panels in the DOM
  - Element polymorphism for tab list, tab, and panel elements
  - Data attributes (`data-selected`, `data-disabled`) for CSS-driven styling
  - Add `AriaControls` and `AriaOrientation` helpers to the html module

## 0.15.0

### Patch Changes

- 56cfa38: Update dependencies
- 091aa97: Fix errorView not rendering when errors occur during synchronous dispatch (e.g. click handlers). Errors thrown during `Runtime.runSync` now correctly render the error view instead of escaping as uncaught FiberFailure exceptions.

## 0.15.0-canary.1

### Patch Changes

- 56cfa38: Update dependencies
