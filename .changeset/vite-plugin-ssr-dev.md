---
'@foldkit/vite-plugin': minor
---

Add an `ssr` option that serves server-rendered pages from the Vite dev server: `foldkit({ ssr: { serverEntry: '/src/entry.server.ts' } })`. With the option set, plain `vite` covers the whole development story. The client entry, HMR, and assets flow through Vite untouched, and a GET request that falls through is rendered: the plugin loads the server entry through Vite's SSR module loader (so server-side edits take effect without a restart), calls its `renderPage` with the request, and places the result into the transformed `index.html` with `injectIntoTemplate`. No separate dev server process is needed. The server entry fulfils the `ServerEntryModule` contract from `foldkit/experimental/server`; pass `containerId` when the template's container element is not `id="root"`.
