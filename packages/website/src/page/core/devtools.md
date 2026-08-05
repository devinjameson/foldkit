# DevTools

## Overview

Foldkit has a DevTools overlay that displays every Message flowing through your app and lets you inspect the Model, Message, Commands, and Mounts at any point in time. It renders inside a shadow DOM so it won’t interfere with your styles or layout.

You can see it in action right now. Look for the tab on the bottom right edge of this page.

Open the panel and you’ll see a scrolling list of every Message dispatched so far, newest at the bottom. Click any row to inspect it. Four tabs swap the inspector content: `Model` shows the full state tree (with changed paths highlighted), `Message` shows the payload, `Commands` lists the Commands returned by the update, and `Mounts` shows which Mounts started or were torn down during that render. A `Live` badge tells you whether you’re looking at the latest state or a past snapshot; clicking a row in time-travel mode pauses the app and `Resume` returns to live. A `Clear` button drops history without restarting the app.

:::Info{label="AI agent integration"}
Foldkit also exposes DevTools to AI agents over the Model Context Protocol. See the [DevTools MCP](/ai/mcp) page for setup.
:::

DevTools are enabled by default in development. Recording and the MCP bridge live in the core runtime. The in-browser overlay ships separately in `@foldkit/devtools`, and `@foldkit/vite-plugin` mounts it automatically during development when the package is installed as a development dependency. Production builds omit it without any application-level environment check.

A `devTools` object on `makeApplication` is needed only for configuration or MCP dispatch. To include the overlay in production, list `@foldkit/devtools` in regular `dependencies` and set `show: 'Always'`. No overlay import is needed.

::Snippet{name="devtoolsBasic" label="Configuring DevTools"}

## Configuration

The `devTools` field accepts an object with the following optional properties, or `false` to disable DevTools entirely.

### show

`'Development'` (the default) enables DevTools only in development. `'Always'` enables them in all environments, including production.

### position

Controls where the badge and panel appear on screen. One of `'BottomRight'` (default), `'BottomLeft'`, `'TopRight'`, or `'TopLeft'`.

### mode

`'TimeTravel'` (the default) enables full time-travel debugging. Clicking a Message row pauses the app and re-renders it exactly as it looked at that point in time. User interaction is blocked while paused, but Subscriptions continue running in the background and new rows keep appearing in the panel. Click Resume to jump back to the live state.

`'Inspect'` lets you browse state snapshots without pausing the app, which is useful when showing DevTools to visitors in production or staging environments.

You can also pass `{ development, production }` to select a different mode per environment. This is the recommended pattern when `show: 'Always'` keeps DevTools available in production: keep `'TimeTravel'` for local debugging and ship `'Inspect'` to your users so clicking a row never pauses their app.

::Snippet{name="devtoolsInspect" label="TimeTravel locally, Inspect in production"}

### banner

An optional string displayed as a banner at the top of the panel. Useful for welcoming visitors or leaving a note for your team.

### Message

The application’s `Message` Schema. Required only for AI agent integration: when set and the running app is connected to the [DevTools MCP](/ai/mcp) server, agents can dispatch Messages into the live runtime. The Schema decodes inbound dispatch payloads at the bridge boundary and rejects mismatches with a clean error. Omit this field to disable agent dispatch entirely.

### excludeFromHistory {#exclude-from-history}

A list of Message `_tag` values whose dispatches should not be recorded in DevTools history. The Messages still drive `update` and the runtime as usual; they just don’t appear in the history panel and don’t pay the per-Message diff cost. Reach for this when an animation-frame Subscription, pointer-move handler, scroll listener, or other high-frequency dispatcher would otherwise flood history with entries that all look the same.

When `excludeFromHistory` is set, DevTools also switches to a per-entry snapshot strategy so time-travel jumps to recorded entries reflect the real live state at the moment they were recorded. Without this, replay would walk only the kept Messages and miss any cumulative state the excluded ones would have produced. The "Live" model view stays in sync as well: excluded Messages still update the latest-model snapshot, they just don’t append a history entry or compute a diff.

::Snippet{name="devtoolsExcludeFromHistory" label="Excluding high-frequency Messages from history"}

### maxEntries {#max-entries}

Maximum number of recorded Messages retained in history before the oldest is evicted. Defaults to `100`. Clamped to the range `20` to `500`: smaller values keep the panel snappy under high message rates, larger values give you more scroll-back. Each retained entry is one append + diff in the regular case, or one append + full Model snapshot when `excludeFromHistory` is active, so memory cost scales with both `maxEntries` and your Model size.

::Snippet{name="devtoolsMaxEntries" label="Raising the DevTools history cap"}

### keyframeInterval {#keyframe-interval}

Number of recorded Messages between full Model snapshots. Defaults to `31`. Time-travel to an index replays `update` forward from the nearest earlier keyframe, so this is a memory and time tradeoff: smaller values store more snapshots and shorten the replay each jump walks, down to `1` where every jump is a constant-time snapshot lookup with no replay. Reach for a denser interval when your app has a heavy `update` and time-travel jumps feel sluggish. Clamped to a minimum of `1`, and forced to `1` automatically when `excludeFromHistory` is active, since excluded Messages are never replayed.

::Snippet{name="devtoolsKeyframeInterval" label="Snapshotting every entry for constant-time jumps"}
