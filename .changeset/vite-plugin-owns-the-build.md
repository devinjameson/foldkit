---
'@foldkit/vite-plugin': minor
'create-foldkit-app': minor
---

Let the plugin own the whole build. `ssr.build` declares the server environment and orchestrates it, so one `vite build` produces the browser bundle, the server bundle, and — with `ssr.build.prerender` — a page for every path the entry lists. The generated projects lose `scripts/build.mjs` and `scripts/prerender.ts`; their build command is `vite build` again.

A Foldkit application that rendered on the server could not be deployed by anything that runs `vite build`. Its build was three commands a script chained together, and a host that injects its own Vite plugin — a Cloudflare adapter, an infrastructure tool, a platform's build step — can only join the first of them. Such a host built the browser half of the application and deployed it without the server bundle it needed. The build id had the same shape of problem: the client build and the server build were separate processes, so one script had to mint an id and pass it through the environment of each, and a project that built its halves any other way produced pages hydration then refused.

Both follow from the build being one process. Vite reads the config once, so the id it computes there reaches every environment that build produces, and a host plugin composes with all of them.

```ts
foldkit({
  buildId,
  ssr: {
    serverEntry: '/src/entry.server.ts',
    build: { prerender: true },
  },
})
```

`build.entry` names the module the server build starts from when requests reach a host that wraps the entry, such as an HTTP server or a Worker; it defaults to the entry itself, which is what a generated site wants. `build.prerender` takes the paths from the entry's `prerenderPaths` export, or from `paths` when the build names them, and `origin` sets what the entry sees as `Request.url` while generating.

The build also writes `foldkit.build.json` beside the server bundle, naming the output directories, the server entry, and every path it generated. What a host should do with a request that matches no file follows from the build rather than from taste, and until now the build knew it and threw it away, leaving a deployment to ask its user for settings whose wrong values serve an empty page at 200.

Generated pages take their template from the browser build that produced it rather than from `index.html` on disk. The generated `/` replaces that file, so a build that re-read it would parse a generated page as its template on any second pass over one client build.

`ssr.serverEntry` is also safe now under a host plugin that runs the server itself. Dev-time rendering loads the entry through the `ssr` environment's module runner, which a workerd-backed environment does not have, so the plugin stands down and lets that host answer page requests through the same entry rather than failing them. It reports why once, at startup.

Nothing changes for an application that does not set `ssr.build`: `vite build` builds the browser bundle alone, as before.
