---
'@foldkit/devtools': patch
---

Keep the DevTools overlay out of an application's View Transitions. An application using the runtime's `viewTransition` option previously animated its own DevTools: the overlay host sat in the page the browser snapshots, so the badge and panel faded out and back in on every transition. The host now spans the viewport and carries a `view-transition-name`, which lifts it into its own snapshot pair, and those snapshots are pinned so the overlay holds still while the page animates underneath it. The host is `pointer-events: none` so its viewport-spanning box cannot swallow clicks meant for the application, and everything the shadow root renders opts back in.
