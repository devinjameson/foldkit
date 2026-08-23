---
'@foldkit/ui': minor
---

Position an arrow for Popover, so a panel can point at its trigger and keep pointing at it as the panel flips and shifts. Popover does not draw the arrow. `toView` receives an `arrow` attribute bundle to spread onto your own element inside the panel, `Popover.arrowId` returns its id as `Popover.buttonId` does for the trigger, and `arrowPadding` keeps the arrow clear of the panel's corners. The Popover docs show the CSS.

`anchorSetup` takes `arrowId` and an optional `arrowPadding`. When the id resolves to an element inside the panel, of any type including `<svg>`, it appends Floating UI's `arrow` middleware and publishes the offset as `--arrow-x` and `--arrow-y` on the panel. One axis is set per placement, the other is reset to `initial`, and both are removed on cleanup. An id that resolves outside the panel is ignored. With an arrow, `anchorSetup` no longer writes `overflow-y: auto` and `overscroll-behavior: none` on the panel, and still writes `max-height`, so a panel that can outgrow the viewport scrolls through a child of its own. Cleanup now also removes `overflow-y` and `overscroll-behavior`, so a panel set up again, this time with an arrow, does not keep the scroll container the earlier run wrote. Panels with no arrow are otherwise unchanged.

Two things break. `RenderInfo` gains an `arrow` field, so code that constructs a `RenderInfo` literal, such as a test fixture, needs `arrow: []`. Popover's panel Mount args now always carry `arrowId`, so a Scene test matching the Mount by instance, `Scene.Mount.expectHas(Popover.AnchorPopover({ buttonId, anchor }))`, stops matching until `arrowId: Popover.arrowId(id)` is added to the expected args.
