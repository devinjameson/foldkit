---
title: Foldkit Has Server Rendering Now
description: Your Foldkit application can now render to HTML at build time or per request, then hydrate in place on the client.
date: 2026-08-15
coverImage: /blog/foldkit-has-server-rendering-now/cover.webp
coverImageAlt: The letters SSR in cyan set over a large black circle on a coral background.
coverImageWidth: 1600
coverImageHeight: 1066
---

Until today, Foldkit was purely an SPA framework. The server sent an HTML file to the client, the client requested the JavaScript bundle, and once it loaded, the application booted.

There are issues with this approach in isolation:

- The user sees the server's HTML before the JavaScript loads. Unless you prerender HTML that matches the loaded app, that is typically a blank page.
- There is no way to do SSG without a heavy prerender step: for example, using Playwright to visit each route and capture HTML (which the Foldkit website used to do).
- There is no way to do request-time SSR: for example, the server sending the client an initial HTML file personalized to the logged-in user.

There was one more problem. Foldkit not having SSR was the deal-breaker for [Michael Arnaldi](https://x.com/MichaelArnaldi), BDFL of Effect. And that simply will not do.

[![Michael Arnaldi on X: "Personally it's the deal breaker for me, I can't see myself writing 500+ lines of code to do SSG and not have a solution for SSR. I think we made the same mistakes over and over again, server side rendering is strictly necessary for good DX. I like the rest of the design."](/blog/foldkit-has-server-rendering-now/michael-ssr-dealbreaker.webp)](https://x.com/MichaelArnaldi/status/2059527426833592755)

So, Foldkit can render on the server now. It shipped today under `foldkit/experimental/server`. It will be promoted to `foldkit/server` once the community puts it through its paces.

`foldkit/experimental/server` ships `renderToString`, and `foldkit/runtime` ships `hydrate`. Together, they give a Foldkit application two new ways to reach the browser: generate static HTML for every route during the build, or render each request on a server. Either way, the browser hydrates the served HTML in place, and the application it boots is the same Foldkit application you wrote yesterday.

## SSG vs SSR

SSG and SSR are the same thing run at different times. Either a build script calls your server entry once per URL and writes files, or a server calls it once per request and sends the response. The entry is a small module that derives flags from a `Request` and asks Foldkit to render:

::Snippet{name="serverRenderingServerEntry" label="server entry example"}

The `Flags` Schema, `init`, `view`, and `flagsForRequest` are provided by you. The rest is wiring.

The same entry serves Vite in development, a Node host in production, a build script for static generation, and fetch-native runtimes like Cloudflare Workers. Hosts are interchangeable because the entry takes a Web `Request`, and its result becomes a Web `Response`.

## How it works

Foldkit's view is a pure function of the Model, so most of server rendering was less "add SSR to the framework" and more "call the same function somewhere else."

If you are using Foldkit without SSR, the browser runs the whole sequence: your `flags` Effect produces the flags, `init` turns them into the first Model, and `view` renders it.

With SSR, the server runs the front of that sequence and the browser finishes it:

- **On the server**, `flagsForRequest` turns the request into flags, `init` builds the first Model, and `view` renders it to HTML. That HTML ships to the browser with the flags serialized alongside it.
- **On the client**, `init` runs again with those same flags, rebuilds the identical Model, and `view` renders it. Instead of replacing the server's HTML, hydration adopts it in place.

Same flags, same `init`, same `view` on both sides. That is why there is nothing to reconcile.

After hydration, the initial Commands run, and your Foldkit application behaves like a typical SPA with client-side navigation.

## What shipped

Check out the [release notes](https://github.com/foldkit/foldkit/blob/main/packages/foldkit/CHANGELOG.md) and the new docs page on [Server Rendering](/core/server-rendering).

This website ([foldkit.dev](https://foldkit.dev)) now prerenders every route through the same `renderPage` contract (SSG). The page you are reading hydrated in place.

## What this means for Foldkit

Foldkit is not getting more complicated. It is gaining a crucial capability.

There is still a single programming model. There are no server components, no `'use client'` or `'use server'` boundaries, and no plan for them: the view is one function of one Model. Server rendering changes where the first paint comes from, not how you write applications.

Scaffold a Foldkit SSR application:

```sh
npx create-foldkit-app@latest --rendering ssr
```

Check it out and let me know what breaks. And don't be a stranger!

Devin
