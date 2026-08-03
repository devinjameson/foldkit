---
'@foldkit/ui': patch
---

Focus the anchored items panel on open for `Listbox` and `Menu`.

An anchored panel renders `visibility: hidden` and stays hidden until Floating UI resolves its first position. `.focus()` does not land on a hidden element, so the `FocusItems` Command that runs once the render commits had nothing to focus, and opening the panel left focus on the button.

The panel is what carries `role="listbox"` (or `role="menu"`) and `aria-activedescendant`, so assistive technology never followed the user into the open panel. Closing on blur is also armed by the panel holding focus, so a panel opened from the keyboard stayed open when the user tabbed away. Arrow keys and typeahead still worked, since the button's key handler delegates to the panel's while the panel is open.

Both components now pass `focusAfterPosition` to their anchor Mount, focusing the panel as part of the same reveal that clears `visibility`. `Popover` already did this. `FocusItems` still focuses the panel when no anchor is configured, where the panel is visible as soon as the render commits.
