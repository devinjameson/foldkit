---
'foldkit': minor
'@foldkit/vite-plugin': patch
---

Stop treating page-lifecycle events as a commitment. A page-owning app no longer tears itself down, or reloads itself, on an event the document can survive.

Fixes an app going permanently blank when the user clicks a download link. `Runtime.run` started the program with `BrowserRuntime.runMain`, which interrupts the runtime on `beforeunload`. Chrome fires `beforeunload` for a click on a download link: it starts a navigation and converts it to a download once it sees the response, so the navigation is abandoned and the document lives on. By then the interrupt had already run the render finalizer, which puts the container element back empty. The file downloaded, the URL never changed, nothing was logged, and the app was gone until a manual reload.

None of this is specific to Chrome, or to downloads. Browsers fire `beforeunload` when a navigation starts rather than when it commits, so any navigation that does not replace the document leaves the same result. A response that comes back `204 No Content` has the same shape, as does a navigation the user cancels. The download link is the case that was reported.

`run` now starts the program with a `Runtime.makeRunMain` runner that registers no page-lifecycle interrupt. Error reporting is unchanged. A real navigation still ends the runtime, because the document goes with it.

**Behavior change:** a page-owning app restored from the browser's back/forward cache no longer reloads the page. The runtime survives the freeze with its Model, its DOM, and its listeners intact, so a back-navigation now returns the app as the user left it, which is what the cache is for. The reload was there to rescue a page the `beforeunload` interrupt had already emptied, and that interrupt is gone. Two things do come back changed: an app that wants fresh data on restore has to ask for it, with a `pageshow` Subscription that dispatches a Message when `persisted` is set, and an app holding its own WebSocket gets it back closed, since the browser closes sockets on the way into the cache.

One thing goes with the interrupt: a runtime's finalizers, meaning ManagedResource releases and Subscription and Mount teardowns, no longer get a best-effort run when the tab closes or the page navigates away. Nothing promised they would, and upstream calls that interrupt best-effort. An app that flushed state from a release should flush it as the state changes, or from a `pagehide` Subscription.

The DevTools bridge no longer announces a disconnect on `beforeunload` either. It reported a live app as gone after a download-link click, and the MCP relay ignored that app until the next reload. A page that really goes away closes its Vite HMR socket, and the plugin already prunes the runtime on that close. Because the freeze into the back/forward cache closes that socket too, the bridge now re-announces the connection on a restore, so a resumed app comes back visible to the DevTools MCP tools instead of staying pruned.

`foldkit` no longer imports `@effect/platform-browser`, so it is dropped from the package's dependencies and from its peer dependencies. Installing `foldkit` no longer asks for it. Apps still need it at the pinned version wherever they use it directly: `@foldkit/devtools` declares it as a peer dependency, and Effect's browser services such as `BrowserKeyValueStore` and `BrowserCrypto` come from it. `@foldkit/vite-plugin` adds `effect/Runtime` to the namespaces it force-includes in Vite's dependency optimizer, so a dev server prebundles what the compiled runtime now references.
