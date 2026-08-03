# Server Rendering

## Overview

:::Info{label="Experimental"}
Server rendering ships from `foldkit/experimental/server` while the API settles, and any release may change it. Please try it and report what breaks; the shape firms up alongside Server Commands.
:::

Foldkit renders on the server with the same program the browser runs. `renderToString` from `foldkit/experimental/server` resolves `init` for a request, runs the pure view, and returns HTML. On the client, you boot with `Runtime.hydrate` instead of `Runtime.run`, and the existing DOM is adopted in place: listeners attach to the elements that are already on screen, and nothing is torn down. Same `init`, same `view`, same `update`, same Model. There is no second programming model, no server-only components, and no `'use client'` boundary.

## Rendering a request

The server entry exports a render function built from the same pieces the client boots with:

```typescript
import { Effect } from 'effect'
import * as Server from 'foldkit/experimental/server'

import { Flags, init, view } from './main'

const flagsForRequest = (request: Request): Flags => ({
  initialCount: readCountCookie(request.headers.get('cookie') ?? ''),
  renderedAt: new Date().toISOString(),
  renderedOn: 'Server',
})

export const renderPage = (
  request: Request,
): Promise<Server.RenderedApplication> =>
  Effect.runPromise(
    Server.renderToString(
      { Flags, init, view },
      { flags: flagsForRequest(request) },
    ),
  )
```

`renderPage` is the whole contract between the entry and whatever hosts it: one request in, one rendered page out. The boundary is a `Promise` rather than an `Effect` on purpose. A host holds a different module graph than the entry (Vite bundles linked workspace packages into an SSR build, and the dev server loads the entry through its own module loader), and an `Effect` value only composes inside the runtime that created it. The entry runs its own Effect and settles the result before it crosses the seam; inside the entry, everything stays Effect.

`renderToString` takes the server-relevant subset of a `makeApplication` config: `init`, `view`, plus `Flags` and `routing` when the application declares them. `container`, `update`, `subscriptions`, and the client `flags` Effect play no part in a server render, and the full client config is structurally assignable, so one shared module can feed both sides.

For a routing application, pass the request URL in the options and `init` receives it, exactly as it receives `window.location` in the browser:

```typescript
Server.renderToString(config, { url: request.url, flags })
```

The result carries the rendered markup and the Document head fields:

```typescript
type RenderedApplication = Readonly<{
  html: string
  title: string
  lang?: string
  dir?: 'ltr' | 'rtl' | 'auto'
  canonical?: string
  ogUrl?: string
}>
```

The host places `html` where the container placeholder sits in the HTML template. The served page has the application root in the container's place, which is the same shape the runtime produces on a client-only boot.

The other fields are the `Document`'s head state, ready for the host to stamp into the shell so the served HTML is correct before the runtime boots. `title` becomes the `<title>`, `canonical` the `href` of the `<link rel="canonical">` element, `ogUrl` the `og:url` meta value, and `lang` and `dir` (already lowercased from the view's `TextDirection`) become the `<html>` attributes, so a localized page carries its language on first paint for crawlers and screen readers. The runtime keeps all of them in sync from the first render on, so the host only needs to place the initial values. When the view omits one of the optional fields (`lang`, `dir`, `canonical`, `ogUrl`), it is absent from the result and the host leaves the shell's value in place; `title` is always present. `injectIntoTemplate` from `foldkit/experimental/server` does all of this stamping for a standard `index.html`; a host with a bespoke shell can place the fields itself.

Commands returned by `init` are not run on the server. The rendered HTML is the post-`init` state, and the client runs those Commands after hydration, so data that arrives through Commands appears exactly as it would on a client-only boot. Running Commands on the server is [under consideration](/what-about-ssr) as a separate capability.

## The hydration handoff

Two markers in the server output carry the handoff:

- The application root is stamped with `data-foldkit-app`. Its value is the runtime id used for HMR model preservation, replacing the container id requirement on server-rendered pages.
- When the application declares `Flags`, a `<script type="application/json" data-foldkit-flags="...">` tag rides along with the Schema-encoded flags the server rendered with.

You boot the client with `Runtime.hydrate(application)` rather than `Runtime.run(application)`. That call is the whole opt-in: `run` always builds the DOM fresh, `hydrate` adopts a server-rendered one, and reading the entry file tells you which mode a page uses. There is no hidden detection and no config flag; the runtime never decides on its own. Under `hydrate`, the client decodes the flags payload instead of running its own `flags` Effect, calls `init` with the same values the server used, and the first render adopts the server DOM node by node. Both sides start from the same Model by construction, so there is no semantic mismatch to reconcile: no missing or extra content, no diverging text. Where the HTML parser normalizes markup on the way in, for example inserting an implicit `<tbody>` or closing a `<p>` early, the affected subtree simply rebuilds rather than adopting, which is correct and invisible in the result.

`hydrate` and `run` differ only when a server-rendered root is present. On a page served without one, for example the same bundle deployed to static hosting, `hydrate` finds nothing to adopt and renders fresh from the client `flags` Effect, exactly as `run` would. So a hydrating client entry keeps working when the same app is served statically, and the choice of `hydrate` documents that the app is meant to be server-rendered.

Adoption preserves everything the DOM holds: element identity, focus, scroll positions, media playback. Listeners attach to the adopted elements, controlled values are re-asserted from the Model, and Mounts fire for adopted elements in the same children-first order the differ uses for created ones.

The handoff degrades safely at every step. An HMR-restored Model wins over hydration, since a code reload means the server DOM reflects a stale view. An undecodable or missing flags payload falls back to a fresh render with a console warning. A subtree that disagrees with the server DOM is rebuilt at the nearest parent.

## Flags come from whoever boots

Flags are the data `init` boots with, produced by whichever side initiates the boot. In a SPA the browser initiates, so reading `localStorage` or `matchMedia` in the `flags` Effect is fully legitimate. In a server render the server initiates, so flags must be producible from the request: cookies, headers, the URL.

That constraint is not a Foldkit rule, it follows from wanting HTML rendered before the browser is involved. Facts the server should respect, like a theme preference, move to a cookie so per-request flags can include them. Facts only the browser can measure, like viewport size, arrive after boot through a Command or Subscription. The client `flags` Effect stays in the config untouched: it is the fallback for non-hydrating boots, so the same application still works served statically.

## Serving

In development, server rendering is a `@foldkit/vite-plugin` option:

```typescript
foldkit({ ssr: { serverEntry: '/src/entry.server.ts' } })
```

With the option set, plain `vite` serves the whole story. The client entry, HMR, and assets flow through Vite untouched, and a GET request that falls through is rendered: the plugin loads the server entry through Vite's SSR module loader (so server-side edits take effect without a restart), calls `renderPage` with the request, and places the result into the transformed `index.html` with `injectIntoTemplate`. There is no separate dev server process and nothing to wire up.

`injectIntoTemplate` expects the template to carry an empty container element where the application root belongs, `<div id="root"></div>` by default (pass `containerId` when the template uses a different id). It stamps `title` always, `lang` and `dir` onto `<html>` when the render carries them, and `canonical` and `ogUrl` when the template has the matching `<link>` and `<meta>` elements.

In production, hosting is the application's business: any process that can read the built template, import the built server bundle, and call its `renderPage` will do. The [SSR example](https://github.com/foldkit/foldkit/tree/main/examples/ssr) is the reference host, an Effect `HttpServer` that serves the built client assets and renders each page from the built server bundle.

One rule matters when bundling: render inside the server entry's module graph. Vite bundles linked workspace packages into an SSR build, so a host process that imports `foldkit/experimental/server` and rendered there would hold a second copy of Foldkit alongside the bundled one, and the render frame the host pushes would not be the one the bundled view reads. Export `renderPage` from the server entry and let the host call it. `injectIntoTemplate` is the one exception: it is pure string work with no module state, so a host may import it directly for the stamping.

## Static generation

`renderToString` also powers build-time static generation: render every route once at build time and write the files out. This site is generated exactly that way; [the pre-render script](https://github.com/foldkit/foldkit/blob/main/packages/website/scripts/prerender.ts) renders all of its routes through `renderToString` in a few seconds, with no browser involved.

Static generation of a Flags application whose flags describe the browser environment (theme, viewport, storage) should pass `isHydratable: false`. One static page serves every visitor, so baking the build machine's flags into a payload would pin every visitor to them. Without the stamp, the client boots with a fresh render from its own flags, exactly as an unrendered page does, which is the correct behavior when the Model depends on facts only each visitor's browser knows.

## Limitations

- Commands do not run during a server render, so content they load ships as its loading state. Running Commands on the server is under consideration.
- Components that measure the DOM to decide what to render, like `Ui.VirtualList`, render their initial unmeasured state into server HTML and fill in after boot.
- `makeElement` and `embed` applications do not hydrate yet; server rendering is for page-owning `makeApplication` programs.
- Text a user types into a controlled input before the runtime boots yields to the Model when hydration re-asserts controlled values. The element itself, its focus, and the page's scroll positions survive.
- Arbitrary properties set through `h.Prop` are not serialized: they are client-side behavior, not markup, so they take effect after boot rather than in the server HTML. A `<select>`'s value is likewise set from the selected `<option>`'s `Selected` attribute, not a `value` on the select, and settles when the runtime boots.
- Raw-text elements (`script`, `style`) cannot represent a closing-tag sequence in their content, since HTML entities do not work inside them. `renderToString` throws rather than emit content that would break out of the tag, so keep a literal `</script>` or `</style>` out of that content.
