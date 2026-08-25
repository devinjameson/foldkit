---
'@foldkit/ui': minor
---

Add HoverIntent, a behavior-only Submodel for delayed hover and focus reveal across a trigger and panel.

HoverIntent opens after a configurable pointer-entry delay, keeps the interaction visible while the pointer or focus moves between its trigger and panel, and closes after a configurable grace delay. Escape closes immediately and suppresses reopening until the interaction fully disengages. The component returns headless trigger and panel event bundles only. It does not impose markup, ARIA semantics, positioning, or styling, so Hover Card and Navigation Menu implementations can compose it with their own UI behavior.
