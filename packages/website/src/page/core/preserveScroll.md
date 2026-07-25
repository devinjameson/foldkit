# Preserve Scroll

## Overview

Editing a file under Vite triggers a full page reload, which resets the window scroll back to the top. When you are working on something far down a long page, every save bounces you away from it.

To keep your place, Foldkit captures `window.scrollX` and `window.scrollY` just before the reload and reapplies them once the restored view has rendered, so the page comes back where you left it.

Restoration runs in dev mode (gated behind `import.meta.hot`), so there is zero runtime cost in production builds. Set `preserveScroll` to `false` to disable it, for an app that drives its own scroll restoration.

## Scope

Only the window scroll offset is preserved. Scroll positions of nested `overflow` containers are not.

Restoration applies to document-owning apps built with `makeApplication`. An embedded `makeElement` app is scoped to its container and never touches the host page’s scroll, so it opts out on its own.

The offset is reapplied as soon as the restored view renders. A page whose full height settles only after asynchronous layout, such as images without set dimensions or media that loads in below the fold, can land short of a deep offset.
