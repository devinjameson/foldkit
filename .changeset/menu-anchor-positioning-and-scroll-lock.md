---
'foldkit': minor
---

### Breaking Changes

- **Menu anchor positioning via portals** — menu items container renders in a portal root (`document.body`) when anchor positioning is enabled, escaping `overflow: hidden` ancestors. Opt out with `portal: false`
- **Menu isModal defaults to false** — aligns with HeadlessUI, Radix, and Ariakit conventions. Consumers that need scroll lock and inert can opt in with `isModal: true`
- **Anchor positioning moved to snabbdom hooks** — replaced subscription-based positioning with insert/destroy hooks for tighter lifecycle management
- **Dropped Popover API from anchor positioning** — removed `popover` attribute approach in favor of portal rendering

### Features

- **iOS Safari scroll lock** — `lockScroll` now intercepts `touchmove` events on iOS Safari, which ignores `overflow: hidden` on `documentElement`
- **Command namespace export** — `Command` is now exported as a namespace via `foldkit/command` subpath, matching other module exports
- **Keyboard modifier attributes** — all keyboard handler attributes now include `KeyboardModifiers`
- **Lifecycle hook attributes** — added `OnInsert` and `OnDestroy` hook attributes for snabbdom lifecycle events
- **advanceFocus Task and FocusDirection type** — exported for external focus management
