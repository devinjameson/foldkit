---
'foldkit': minor
---

### Breaking Changes

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
