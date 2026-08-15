---
title: Foldkit Has Server Rendering Now
description: The same program now renders to HTML at build time or per request, then hydrates in place. Here is what shipped and why it fits the architecture.
date: 2026-08-15
---

Hey, Devin here. Foldkit renders on the server now.

`foldkit/experimental` ships `Server.renderToString`, and the runtime ships `Runtime.hydrate`. Together they give a Foldkit application two new ways to reach the browser: generate static HTML for every route during the build, or render each request on a server. Either way, the browser hydrates the served HTML in place, and the application it boots is the one you wrote. Same `init`, same view, same `update`, same Model.

## One pipeline, two schedules

I did not want two rendering products. SSG and SSR are the same machinery run at different times: a build script calls your server entry once per URL and writes files, or a server calls it once per request and sends the response. The entry is a small module that derives Flags from a `Request` and asks Foldkit to render:

```ts
export const renderPage = (
  request: Request,
): Promise<Server.ServerEntryResult> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const renderedApplication = yield* Server.renderToString(
        { Flags, init, view },
        { flags: flagsForRequest(request) },
      )

      return Server.Rendered(renderedApplication)
    }),
  )
```

The same entry serves Vite in development, a Node host in production, a build script for static generation, and fetch-native runtimes like Cloudflare Workers. Hosts are interchangeable because the entry only speaks Web `Request` and `Response`.

## Why this was natural

Foldkit's view is a pure function of the Model. That made most of server rendering less "add SSR to the framework" and more "call the same function somewhere else." No component lifecycles to simulate, no effects to suppress, no second flavor of data fetching to invent. `renderToString` resolves `init`, runs the view once, and serializes the result.

The genuinely interesting part is the handoff. The server embeds the Schema-encoded Flags that produced the render in the HTML, and `Runtime.hydrate` reads them back, calls the same `init`, and adopts the existing DOM instead of rebuilding it. Element identity, focus, and scroll survive; listeners and Mounts attach to the markup that is already on screen. Because both sides construct the first Model from the same Flags, there is no semantic mismatch to reconcile.

And the handoff is strict on purpose. A missing or undecodable payload fails startup loudly instead of silently booting a different application on top of your rendered page. Stale HTML and mismatched bundles are deployment bugs, and I want them to look like bugs.

## What shipped

- `Server.renderToString`, `Server.Rendered` / `Server.Responded`, `Server.toResponse`, and `Server.injectIntoTemplate` in `foldkit/experimental`
- `Runtime.hydrate` for the client side of the handoff
- A dev host in `@foldkit/vite-plugin`: page requests render through your server entry while Vite keeps serving HMR and assets
- `create-foldkit-app --rendering spa|ssg|ssr`, so a new project starts server-rendered if you want it to
- [SSG](/example-apps/ssg) and [SSR](/example-apps/ssr) reference examples, and a [Server Rendering](/core/server-rendering) docs page covering the whole lifecycle, deployment included

It is dogfooded, too: foldkit.dev now prerenders every route through the same `renderPage` contract, and the page you are reading hydrated in place.

## What it means for the framework

Foldkit stays one programming model. There are no server components, no `'use client'` or `'use server'` boundaries, and no plan for them: the view is one function of one Model, and cutting that tree across a network boundary breaks the architecture. Server rendering changes where the first paint comes from, not how you write applications. The open question I am still designing is running Commands on the server during the initial render; [What about SSR?](/faq/what-about-ssr) covers where that stands.

Server rendering ships from `foldkit/experimental` while the API settles, and any release may change it. Please try it and tell me what breaks:

```sh
npx create-foldkit-app@latest --rendering ssr
```
