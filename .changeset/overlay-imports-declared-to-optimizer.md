---
'@foldkit/vite-plugin': patch
---

Declare the DevTools overlay's imports to the dep optimizer.

The overlay is a virtual module injected into the served page, and its two imports, `@foldkit/devtools/vite` and `foldkit/devtools-host`, appear in no source file. Vite's optimizer scans only source, so on a cold cache (a fresh install, a changed lockfile) it discovered them on the first page load and re-optimized mid-session, and the full-page reload that follows tears down whatever the page was running. In development that was a flash on the first load; under a browser-mode test runner it was the suite itself: Vitest reports "Vite unexpectedly reloaded a test", the run flakes, and it can also hang outright when the runner keeps waiting on a browser session the reload destroyed.

The plugin now adds both specifiers to `optimizeDeps.include` whenever it will serve the overlay, so the optimizer has them before the first request and nothing changes mid-run. Projects that had added the two entries to their own config as a workaround can drop them.

Each specifier is declared on the standing of the package that owns it: `@foldkit/devtools/vite` when `@foldkit/devtools` is a registry install, `foldkit/devtools-host` when `foldkit` is. One owned by a linked package, the workspace's own examples included, stays undeclared: the optimizer serves linked packages from source, and force-including one would freeze that source into the cache where edits to it no longer reach the page. A layout that links one package and installs the other gets exactly the declaration its installed half needs.
