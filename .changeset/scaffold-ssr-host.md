---
'create-foldkit-app': patch
---

The scaffolded SSR host takes the origin it serves from configuration rather than from the request, refuses a request target that resolves to another origin, answers a missing static asset with 404 rather than the application shell, and declares `Sec-Fetch-Dest` on any response whose selection inspected it.

The scaffolded SSR and SSG projects build through `scripts/build.mjs`, which produces one build id per build and gives it to every command that build runs, so a generated project reaches a working hydratable build through its own documented build command. `FOLDKIT_BUILD_ID` names builds from a value the deployment already has, such as a commit or a release tag. The generated README states the contract: the id is published in the page and must never contain a secret, and two deployments must never share one.

An empty `FOLDKIT_BUILD_ID` is treated as unset by the generated build script, matching the plugin, so `FOLDKIT_BUILD_ID= npm run build` takes a generated id rather than suppressing one and failing later at the render.
