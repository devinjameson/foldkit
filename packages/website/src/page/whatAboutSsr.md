# What about SSR?

## Overview

Foldkit is a client-first framework. Apps run as a single-page application today: ship a small HTML shell and boot the Foldkit runtime. Static pre-rendering is supported. Per-request server rendering with a hydration handoff is on the roadmap as a first-class capability.

## The kind of app Foldkit is for

Foldkit is for apps, not documents. The architecture pays off when:

- A user spends real time inside the application across a single session.
- State is rich and lives across many interactions.
- The interesting questions are about behavior over time, not first paint.

Editors, dashboards, multiplayer rooms, internal tools, configurators, games. The user opens the app, works inside it, closes it. Time to interactive is what matters most.

Per-request SSR landing as a first-class capability widens the door for content-heavy app shells too. They can get correct first-paint HTML, SEO for dynamic URLs, and social previews without leaving the architecture. Where another tool still fits better is the inverse case: a site that is mostly prose with a sprinkle of interactivity, where the framework exists to deliver content. Astro is excellent at that.

## What Foldkit does today: SSG

The architecture is not hostile to pre-rendering. [The view function](/core/view) is pure: given a Model, it produces a virtual DOM tree. That tree can be rendered to HTML at build time and served as static assets, then replaced by the live tree when the runtime boots in the browser.

### This site uses SSG

This site is a single Foldkit application. When we deploy it:

- Vite builds the SPA bundle.
- A build script boots vite preview and launches headless Chromium.
- The script visits every statically rendered route, waits for the runtime to render, and captures the HTML.
- Each route gets its own index.html written into dist/, so the static host serves real content for every URL.
- Pagefind indexes the rendered HTML so search works without a server.

You can read [the pre-render script](https://github.com/foldkit/foldkit/blob/main/packages/website/scripts/prerender.ts) in the website repo. It is about 800 lines of Effect-TS.

The cost is paid at build time, not at runtime. There is no Node server in production. The output is plain static files that any CDN can serve. Crawlers see fully rendered HTML. Users see real content before the runtime boots.

The website pre-render script is the reference implementation for this pattern. It captures the view as it stands right after `init` returns. That is the full content when the Model already has everything the page needs (docs, marketing, this site). App shells that fetch data after `init` will pre-render their loading state, with real content arriving once the runtime boots and those Commands resolve.

## On the roadmap: per-request render and hydrate

Per-request server rendering with a hydration handoff is on the roadmap as a first-class capability. The developer enables SSR once, and the server handles initial page loads for every route, the same way SSG handles every route today. When a request arrives, the server runs `init` for that URL, renders `view(model)` to a string, and ships the HTML in the response. The browser boots the runtime, reconstructs the same Model, attaches event listeners to the pre-rendered DOM, and runs the Commands that `init` returned. From there, in-app navigation is client-side, the same as any Foldkit SPA.

The same code runs on both sides. Same `init`, same `view`, same `update`, same Model. No two flavors of data fetching, no `'use client'` or `'use server'` boundary. Hydration mismatch is structurally ruled out: the view is a pure function of the Model, and both sides start from the same Model.

When people say "SSR" they usually mean a bundle of things: rendered HTML arriving in the response for a faster first paint, SEO for content that needs indexing, social link previews for dynamic URLs, and server-side data fetching so the client does not waterfall. Per-request render and hydrate covers the first three out of the box, without introducing a second programming model. The fourth is the next open question.

## Under consideration: running Commands on the server

A further step is to run Commands on the server during the initial render, so HTML ships with data already loaded rather than a loading state. This is tractable but introduces environment-awareness that Foldkit currently keeps out: per-request server context (cookies, auth, headers), Commands tagged as server-runnable versus client-only (a `ServerCommand` primitive), and services bound differently per side.

None of that splits the programming model in the Server Components sense. It does add an environment dimension to primitives that today have none. The shape is being designed before commitment.

## What Foldkit will not do

Server Components are not on the roadmap. The Foldkit tree is a function of one Model. Splitting it into server-only and client-only halves breaks the architecture. No `'use client'` or `'use server'` annotations, no two flavors of data fetching, no two programming models pretending to be one.

The recommendation is Effect-TS across the stack: a backend whose job is receiving requests and returning data, a Foldkit frontend whose job is rendering it. The line between server and client stays at the data, not the view.
