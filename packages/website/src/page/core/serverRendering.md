# Server Rendering

## Overview

:::Info{label="Experimental"}
Server rendering ships from `foldkit/experimental` while the API settles, and any release may change it. Please try it and report what breaks.
:::

Foldkit renders on the server with the same program the browser runs. `renderToString` resolves `init`, runs the pure view, and returns HTML. `Runtime.hydrate` then adopts that HTML in place. The same init, view, update, and Model work whether the HTML was rendered during a build (SSG) or while handling a request (SSR).

That gives Foldkit one rendering pipeline with two delivery policies:

- **Static site generation (SSG):** a build script renders a finite set of URLs and writes HTML files.
- **Server-side rendering (SSR):** a server renders a URL when its request arrives.

An application can use either policy, or use SSG for some URLs and SSR for others. The application code does not need a second rendering API.

One page, end to end, grouped by where each step runs and tagged with who supplies it:

```diagram
GET /page  (from the browser)
   │
   ▼
── on the host ──  Vite in dev, your server in production
     renderPage      [you write]
        derives Flags from the request
     renderToString  [Foldkit]
        calls your init, runs your view → HTML
     toResponse      [Foldkit]
        fills index.html, embeds the Flags payload
   │
   ▼  HTML page + Flags payload
── on the browser ──
     Runtime.hydrate [Foldkit]
        reads the Flags, calls the same init, adopts the DOM
     live application
        listeners and Mounts attach to the existing elements
```

Once the live application takes over, the page is an ordinary Foldkit application: routing, update, Commands, and Subscriptions all run in the browser, and navigation moves between routes without contacting the server. The server renders again only on the next full page load, such as a reload or a link the runtime does not handle.

For SSG the picture is identical with one substitution: the host is a build script, and the response is written to a file that a static server or CDN delivers later.

## The server entry

A server entry is the module that sits between the application and its host. It exports a `renderPage` function that accepts a Web `Request` and returns a `Promise<EntryResult>`:

::Snippet{name="serverRenderingServerEntry" label="server entry example"}

The outer `Promise` keeps `renderPage` callable from Vite, build scripts, serverless functions, and long-running Effect HTTP servers without making those hosts provide the application's Effect requirements. The entry uses Effect internally; hosts see only the `Promise`.

The entry is application code, so it lives in `src/` (`src/entry.server.ts` in the examples), not in the host's directory. It imports the app's `init`, `view`, and `Flags` and renders them, so it must build into the same module graph as the client. Foldkit's HTML builder uses a module-local render frame, and the view and `renderToString` share that frame only when they resolve to the same Foldkit module instance, which is what bundling the entry with the app guarantees. A host imports the built entry and calls `renderPage`; it never imports the application and renders it itself. The [SSR example](/example-apps/ssr)'s delivery host lives outside `src/`, in `server/`, and does exactly that.

`renderToString` accepts the server-relevant subset of a `makeApplication` config: the `init` and `view` fields, plus `Flags` and `routing` when the application declares them. A full application config satisfies that subset, so an entry may pass the application's config object unchanged. The `container`, `update`, `subscriptions`, and `managedResources` fields do not participate in the server render: the render runs the view once over the Model `init` returns, with no DOM to attach to and no Messages to dispatch.

For a routing application, pass the request URL so `init` receives it exactly as it receives `window.location` in the browser:

::Snippet{name="serverRenderingRenderToStringUrl" label="renderToString with url example"}

## The result contract

A server entry returns one of two variants:

- `Server.Rendered(application, options)` asks the host to place Foldkit's rendered application in its HTML template. Its options can carry an HTTP status and headers.
- `Server.Responded(response)` bypasses template injection with a complete Web `Response`. Use it for redirects and other non-page responses the page request itself resolves without rendering the shell.

`Server.toResponse(template, result)` folds either variant into the Web `Response` the host sends, so a request-time host handles both cases with one call instead of matching on the result itself. It injects a `Rendered` application into the template, defaults to status 200 and a UTF-8 HTML content type, and passes a `Responded` response through unchanged.

The render host serves pages, not a data API. When a client needs JSON, put that endpoint on a separate backend (an Effect `HttpApi` service is the natural fit) rather than answering it from the server entry. Foldkit keeps the line between server and client at the data: the backend returns data, the frontend renders it.

The rendered application contains the body markup and the Document's initial head state:

::Snippet{name="serverRenderingRenderedApplication" label="RenderedApplication type"}

`injectIntoTemplate` places that output into a standard `index.html`. It expects exactly one `<div id="root"></div>` placeholder by default, with no extra attributes or inner whitespace, plus exactly one `<title>` element. Pass `containerId` when the template uses another id. It also stamps language, text direction, canonical URL, and Open Graph URL into matching shell elements.

## The hydration handoff

A hydratable render carries four markers:

- The application root has `data-foldkit-app`. Its value identifies the runtime.
- The root also has `data-foldkit-build`, the token identifying the build that rendered it, which hydration compares against its own before adopting anything.
- A Flags application also emits a JSON script carrying the Schema-encoded Flags that produced the server Model.
- A keyed element carries `data-foldkit-key`, and an element the build gave a view identity carries `data-foldkit-identity`. Both values are digests, never the key or the identity itself, so a key holding an account id or an email address and a build's source paths stay out of the served markup. Hydration only compares them, then strips both from the element as it adopts. A render made with `isHydratable: false` emits neither.

Conceptually, the handoff appears next to the rendered root:

::Snippet{name="serverRenderingHydrationHandoff" label="hydration handoff markup"}

The script type makes the payload data rather than executable JavaScript. Foldkit escapes values that could close the script element, then parses and Schema-decodes the text during hydration. Flags are public HTML, not a place for secrets.

The client opts into the handoff explicitly, in the client entry (`src/entry.ts` in the examples):

::Snippet{name="serverRenderingHydrate" label="Runtime.hydrate example"}

`Runtime.run` always builds the DOM fresh. A Flags application supplies its client-only Flags Effect at that boundary:

::Snippet{name="serverRenderingRunWithFlags" label="Runtime.run with flags example"}

`Runtime.hydrate` accepts no client Flags producer. It reads the serialized Flags, calls the same `init`, and adopts matching server DOM nodes rather than replacing them. Element identity, focus, scroll position, and media state survive while listeners and Mounts attach. This adoption is the hydration step. A mismatching subtree rebuilds at the nearest parent, with a development warning that points back to nondeterministic Flags, init, or view output.

Calling `hydrate` declares that a complete server handoff exists. A missing stamped root, missing Flags payload, or undecodable Flags payload terminates startup and leaves the rendered HTML visible but inert. The failure is a descriptive `[foldkit]` error logged through the runtime's error reporting, where the console and error monitoring pick it up; there is no application-level hook because startup never reaches a Model. This catches a deployment that serves HTML without a handoff, or with one the client cannot read, instead of silently booting a different client Model. Use `run` in a separate client entry when a page must support a fresh SPA boot.

A page served from an earlier deployment is caught by the build token rather than by that startup check. `@foldkit/vite-plugin` compiles the same token into the client bundle and the server bundle of one build and stamps it on the rendered root, and hydration compares the two before it adopts anything. A page from another deployment is rebuilt rather than reconciled, so nothing on it can carry state into a view that now means something else.

The token is derived from the deployment's inputs: the source files the project tracks, the lockfile that pins its dependencies, and Foldkit's own version and hydration protocol. It therefore moves for a change anywhere in the application, not only in a view: a constant a view imports, a value from configuration, an argument a caller passes. Set `FOLDKIT_BUILD_ID` to name builds yourself, from a commit or a release, and that value is used instead. Development carries no token, since the render and the client run from one module graph in one process.

Within a build, identities do the finer-grained work. The build stamps a digest of each view module's source into the identities it assigns, so a subtree whose view changed rebuilds on its own.

One development-only exception: when a hot update restarts the runtime, the Model HMR preserved wins and the view rebuilds from it instead of adopting the served DOM, since that DOM was rendered by code from before the update. The handoff contract still holds, so the stamped server root must exist.

Commands returned by `init` do not run during `renderToString`. The server output represents the immediate post-`init` Model. After hydration, the browser runs those Commands normally.

## Flags and browser facts

Hydration requires both sides to construct the same first Model. Flags embedded in HTML are the contract that makes this reproducible.

For request-time SSR, Flags can come from the request, including the URL, headers, and cookies. For build-time SSG, Flags must be universal and build-stable because one file is served to every visitor.

:::Warning{label="Flags are public"}
Every serialized Flag ships in the page's HTML. Never place credentials, private tokens, or other secrets in Flags.
:::

Browser-only facts do not belong in hydratable SSG Flags. For example: a theme stored in `localStorage`, the viewport width, or browser feature detection cannot be known by the build. Start from a neutral Model on both sides, then load those facts through a boot-time Command or Subscription after hydration. If a preference must affect the server HTML, promote it to request-visible data such as a cookie and use request-time SSR for that URL.

`isHydratable` defaults to `true` for both SSG and SSR. Pass `isHydratable: false` only when producing static markup that will not be hydrated. It is not the normal SSG setting.

## Request-time SSR

In development, enable the Vite host in `vite.config.ts`:

::Snippet{name="serverRenderingViteSsr" label="Vite SSR config example"}

Vite continues to serve the client entry, HMR, and assets. Requests that reach the Foldkit middleware are converted to Web `Request` values and passed to `renderPage`; the returned Web `Response` supplies the status, headers, and body.

In production, build the client and the server host separately. The host serves static assets first, imports the built server entry, and sends `Server.toResponse(template, await renderPage(request))`. The [SSR example](https://github.com/foldkit/foldkit/tree/main/examples/ssr) uses an Effect `HttpServer` for that thin delivery layer.

:::Warning{label="Caching personalized responses"}
When Flags depend on the request, such as a cookie, an authorization header, or locale, the rendered HTML is specific to that visitor. Set `cache-control` and `vary` so it cannot be stored in a shared cache and served to someone else. The SSR example uses `private, no-store` and `vary: cookie` because its initial count comes from a cookie.
:::

## Build-time SSG

An SSG host builds the browser bundle and server entry, then calls `renderPage` once for every generated URL from a build script (`scripts/prerender.ts` in the SSG example):

::Snippet{name="serverRenderingSsgLoop" label="SSG render loop example"}

A static file cannot preserve arbitrary response behavior. The build should reject `Responded` results and rendered statuses it cannot reproduce rather than silently discarding them.

The [SSG example](https://github.com/foldkit/foldkit/tree/main/examples/ssg) is the minimal reference. This website is the production-scale reference: its prerender host uses the same `renderPage(Request)` contract, seeds route content through universal Flags, and writes every route as hydratable static HTML.

## Deploying

A deployed SSG build is static files. Any static host or CDN serves the generated directory as is; the hydration handoff already lives inside the HTML, so nothing beyond serving files is required.

A deployed SSR application needs a host with two jobs: serve the built client assets, and call `renderPage` for page requests. On Node, the [SSR example's server](https://github.com/foldkit/foldkit/tree/main/examples/ssr/server) is the reference: an Effect `HttpServer` that serves static files first and sends `Server.toResponse(template, await renderPage(request))` for everything else.

Behind a CDN or reverse proxy, a route whose Flags read from the request produces visitor-specific HTML. Keep those responses out of shared caches with `cache-control` and `vary`, so an edge cache never serves one visitor's page to another.

Fetch-native runtimes such as Cloudflare Workers, Deno, and Bun run the entry without an adapter, because those platforms already speak Web `Request` and `Response`:

::Snippet{name="serverRenderingWorkersHost" label="Workers host example"}

The platform serves the built client assets, and the handler covers page requests. The template `import` works because the bundler is told to treat `.html` imports as plain strings; Cloudflare's Wrangler CLI, the tool that builds and deploys Workers, calls this a `Text` module rule. The same built server entry runs unchanged on each of these hosts.

To provision and deploy the host itself, [Alchemy](https://alchemy.run) is the natural fit. It is TypeScript-native infrastructure as code built on Effect, so the Worker and the resources it binds to, such as a database, object storage, or a queue, are declared in the same TypeScript program that ships the entry, with no separate configuration language to keep in sync. Its [Cloudflare support](https://alchemy.run/cloudflare/) deploys the Worker directly, which pairs naturally with the fetch-native host above.

## One application using both

SSG and SSR are route delivery policies, not separate Foldkit application types. A hybrid deployment can generate stable routes during the build and send the remaining URLs to a request-time host. Both hosts import the same server entry, and every delivered page hydrates through the same client entry.

For example: product documentation and marketing pages can be generated at build time, while account pages and preview URLs render per request. A route should have one authoritative delivery policy in a deployment so the CDN and runtime server do not disagree about which version owns it.

## Limitations

- Commands do not run during a server render, so a page whose data arrives through a Command renders the Model's pre-Command state, usually a loading state. Supply the data through Flags when the server HTML must include it.
- Components that measure the DOM to decide what to render, such as `Ui.VirtualList`, render their initial unmeasured state and fill in after hydration.
- `makeElement` and `embed` applications do not hydrate yet. Server rendering is for page-owning `makeApplication` programs.
- A custom element that upgrades before hydration keeps the attributes its `connectedCallback` adds that the view does not declare on the element. When the view drives class and style through `h.Class` and `h.Style`, component-added class tokens and style properties the view does not declare are kept as well; a raw `h.Attribute('class', ...)` or `h.Attribute('style', ...)` instead owns the whole attribute and replaces it, dropping component additions. Component-built light DOM is preserved only when the view declares no children for the element; a view that declares children owns the element's light DOM.
- Text typed into a controlled input before hydration yields to the Model when controlled values are reasserted. The element, focus, and page scroll survive.
- A custom element's declared properties, and any `h.Prop` on it, are client behavior rather than markup: they apply after hydration and never serialize as attributes. This holds for a property named after a global attribute too, so a component property named `id` or `title` stays client-side while `h.Id` and `h.Title`, which set the reflected attribute every element has, still serialize. Native elements reflect their standard properties, so a `<select>` value comes from its selected `<option>` in server HTML and settles from the Model after hydration.
- Raw-text elements such as `script` and `style` cannot contain their literal closing-tag sequence. `renderToString` rejects content that would break out of the element.
