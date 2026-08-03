---
'foldkit': minor
---

Add `injectIntoTemplate` to `foldkit/experimental/server`. It places a rendered page into an HTML template: the rendered markup replaces the empty container element (`id="root"` by default, configurable via `containerId`), and the `Document` head fields are stamped into the shell, `title` into the `<title>`, `lang` and `dir` onto `<html>`, and `canonical` and `ogUrl` into a matching `<link rel="canonical">` and `<meta property="og:url">` when the template carries them. The helper is pure string work with no module state, so a host process may import it directly even when the render itself must stay inside the server entry's module graph.

Also exports the `ServerEntryModule` type, the contract a server entry fulfils for hosts: `renderPage` takes a `Request` and returns a `Promise<RenderedApplication>`. The boundary is a Promise because a host holds a different module graph than the entry, so the entry runs its own Effect and settles the result before it crosses the seam.
