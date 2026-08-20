# My Foldkit App

A statically generated Foldkit application built with Effect.

## Getting Started

```bash
{{installCommand}}
{{devCommand}}
```

## Building and previewing

```bash
{{buildCommand}}
{{previewCommand}}
```

The build script runs `scripts/build.mjs`, which builds the client bundle, builds
the server bundle, prerenders every path `src/entry.server.ts` lists, and gives
all three steps the same build id.

## The build id

The build id does not make hydration correct. It makes hydration refuse when it
would otherwise be incorrect.

The generated page carries the id, and the client bundle carries its own copy.
Hydration compares the two before it reads the Flags payload or adopts DOM.
When they differ, startup stops and the document body is marked `inert`,
`aria-hidden`, and `data-foldkit-refused`. A nondismissable modal shield covers
its controls and existing top-layer content, then takes focus without closing
author-owned dialogs. Nothing moves, so no custom element reconnects and no
frame reloads.

Without that check, stale HTML from an earlier deployment can be hydrated by the
newer client. Where the old markup happens to line up with the new markup,
an input the old page called `email` can be adopted for whatever the new build
puts in that position, carrying what the visitor typed into it.

The comparison happens when a client boots against a page. A tab whose client
is already running when a deployment lands is not rechecked.

`scripts/build.mjs` takes care of this: it produces one id per build and passes
it to every step. Supply `FOLDKIT_BUILD_ID` when those steps run in separate
jobs, or when you want the served id to name a deployment you can look up later:

```bash
FOLDKIT_BUILD_ID="$CI_DEPLOYMENT_ID" {{buildCommand}}
```

The id is public HTML and must never contain a secret or be derived from one.
Every step of one deployment must share an id. By contrast, two deployments
must never share one. Reusing an id produces no warning: the ids agree, so
hydration proceeds. When in doubt, leave `FOLDKIT_BUILD_ID` unset and let the
build script generate one.

## Learn More

- [Foldkit Documentation](https://foldkit.dev)
- [Effect Documentation](https://effect.website)
