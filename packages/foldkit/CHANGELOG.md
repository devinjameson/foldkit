# foldkit

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
