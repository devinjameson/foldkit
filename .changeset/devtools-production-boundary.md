---
'@foldkit/devtools': minor
'@foldkit/vite-plugin': minor
'create-foldkit-app': patch
'foldkit': minor
---

Let the Foldkit Vite plugin mount the installed DevTools overlay automatically. Development dependencies stay out of production builds, while a regular dependency makes `show: 'Always'` sufficient to include the overlay in production. Keep `@foldkit/devtools` in generated applications' development dependencies.

Installing `@foldkit/devtools` is now the whole opt-in: an application that never configured `devTools` gets the overlay in development as soon as the package is present. Set `devTools: false` to turn DevTools off, or uninstall the package to drop the overlay alone.

This removes `DevToolsConfig.overlay`, the `DevToolsOverlay` export from `foldkit/runtime`, and the bare `overlay` export from `@foldkit/devtools`. Remove the overlay import and configuration field when upgrading. The Vite plugin now owns that integration through `@foldkit/devtools/vite`.

Upgrade `foldkit`, `@foldkit/vite-plugin`, and `@foldkit/devtools` together. The plugin injects the overlay only when the installed `@foldkit/devtools` exposes `@foldkit/devtools/vite`, so an older copy skips the overlay instead of failing the build. Thanks @artile for the report.

## Migration

Drop the `overlay` import and the `overlay` field. The Vite plugin mounts the overlay whenever `@foldkit/devtools` is installed, so `devTools` now carries configuration alone.

```ts
// before
import { overlay } from '@foldkit/devtools'

const application = Runtime.makeApplication({
  // ...
  devTools: {
    overlay,
    position: 'BottomLeft',
  },
})

// after
const application = Runtime.makeApplication({
  // ...
  devTools: {
    position: 'BottomLeft',
  },
})
```

An application whose only `devTools` field was `overlay` drops the object entirely and still gets the overlay in development.

```ts
// before
import { overlay } from '@foldkit/devtools'

const application = Runtime.makeApplication({
  // ...
  devTools: { overlay },
})

// after
const application = Runtime.makeApplication({
  // ...
})
```

Shipping the overlay in production keeps `show: 'Always'` and moves `@foldkit/devtools` from `devDependencies` to `dependencies`. Dependency placement is the build-time boundary, and `show` controls whether the runtime mounts it.

```ts
// before
import { overlay } from '@foldkit/devtools'

const application = Runtime.makeApplication({
  // ...
  devTools: {
    overlay,
    show: 'Always',
    mode: { development: 'TimeTravel', production: 'Inspect' },
  },
})

// after
const application = Runtime.makeApplication({
  // ...
  devTools: {
    show: 'Always',
    mode: { development: 'TimeTravel', production: 'Inspect' },
  },
})
```

An application that imported `DevToolsOverlay` from `foldkit/runtime` to type its own wiring no longer needs the type.
