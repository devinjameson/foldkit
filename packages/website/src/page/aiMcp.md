# DevTools MCP Server

## Overview

Foldkit ships `@foldkit/devtools-mcp`, an MCP server that exposes a running Foldkit app to AI agents. Agents can read the current Model, list and inspect Message history, rewind the UI to any past Model, and dispatch Messages into the runtime.

It complements [agent skills](/ai/overview). Skills generate code; the MCP server lets agents observe and interact with code that’s already running.

The MCP server pairs with [DevTools](/core/devtools). DevTools shows Message history and Model snapshots in a panel for humans; the MCP server exposes the same data and controls to AI agents.

## Setup

Projects scaffolded with [create-foldkit-app](/get-started/getting-started) already ship with the MCP server pre-wired. Open the project in your AI agent and the tools appear under the `foldkit-devtools` server. Skip the rest of this section.

For existing projects, run the init command in your project root. It writes a `.mcp.json` that any MCP-aware AI agent (Claude Code, Codex, Cursor, Windsurf) will pick up:

```sh
npx @foldkit/devtools-mcp init
```

For faster startup, install the MCP server as a devDependency. Otherwise `npx` fetches it on each AI agent restart:

```sh
npm install -D @foldkit/devtools-mcp
```

In `vite.config.ts`, pass `devToolsMcpPort` to the Foldkit plugin so it opens the WebSocket relay:

::Snippet{name="aiMcpViteConfig" label="Vite config snippet"}

In your `Runtime.makeApplication` call, pass your `Message` Schema. The runtime decodes every dispatched Message against it before reaching your update function:

::Snippet{name="aiMcpApplicationConfig" label="application config snippet"}

Restart your dev server, then restart your AI agent. The `foldkit_*` tools are now available under the `foldkit-devtools` server.

The browser bridge runs inside your app, so the MCP server only sees a runtime while the app is open in a browser tab. Close the tab and the runtime disappears from `foldkit_list_runtimes`.

## Tools

Each tool accepts an optional `runtime_id`. When omitted, the most recently connected runtime is used.

| Tool                            | Description                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `foldkit_list_runtimes`         | Returns metadata for every connected browser tab. Agents call this first to discover which runtime to target.                                                                                                                                                                                                                                                                                                                                    |
| `foldkit_get_model`             | Snapshots the current Model. Accepts an optional `path` to narrow to a subtree and `expand` to control summarization.                                                                                                                                                                                                                                                                                                                            |
| `foldkit_get_model_at`          | Snapshots a historical Model after a given history entry. Pass `index: N - 1` to read the Model before message `N`. Same `path`/`expand` semantics as `foldkit_get_model`. Indices outside the readable range are rejected with the valid bounds. For the initial Model, use `foldkit_get_init`.                                                                                                                                                 |
| `foldkit_get_init`              | Reads the recorded initial Model and the names of Commands returned from the application's `init` function. Equivalent to selecting the synthetic `init` row in the DevTools panel.                                                                                                                                                                                                                                                              |
| `foldkit_get_runtime_state`     | Snapshots the runtime's DevTools state: history bounds, current paused/live status, and whether init is recorded. Useful for understanding what `foldkit_list_messages` and `foldkit_get_message` will see.                                                                                                                                                                                                                                      |
| `foldkit_list_messages`         | Lists Message history entries. Each entry carries the Message body, Command names triggered, timestamp, an `isModelChanged` flag, the diff path lists, and any extracted Submodel chain. Filter server-side with `changed_paths_match` (dot-string patterns against each entry’s changed Model paths, `*` matches one segment), read the latest entries with `from_end`, and paginate forward with `since_index`.                                |
| `foldkit_count_messages_by_tag` | Counts retained history entries by Message tag, without payloads, sorted by count descending. A cheap reconnaissance call before paging through history: it surfaces the high-frequency Messages worth filtering out, and with `changed_paths_match` it answers which Message tags touch a Model subtree.                                                                                                                                        |
| `foldkit_diff_models`           | Diffs the Models at two history indices server-side, returning path-level changes with summarized before and after values. Each side is `Present` with the value, or `Absent` when the path does not exist on that side. Pass `changed_paths_match` to narrow the diff to a subtree.                                                                                                                                                             |
| `foldkit_get_message`           | Reads one entry at a given index. To inspect the Model around the entry, call `foldkit_get_model_at` with `index - 1` (before) and `index` (after). Use `foldkit_get_init` for the synthetic init entry at index `-1`.                                                                                                                                                                                                                           |
| `foldkit_list_keyframes`        | Returns the indices Foldkit can replay back to. Index `-1` is the initial Model.                                                                                                                                                                                                                                                                                                                                                                 |
| `foldkit_replay_to_keyframe`    | Time-travels the runtime to a previous state. The runtime is paused at that snapshot until `foldkit_resume` is called.                                                                                                                                                                                                                                                                                                                           |
| `foldkit_resume`                | Resumes normal execution after a replay.                                                                                                                                                                                                                                                                                                                                                                                                         |
| `foldkit_get_message_schema`    | Describes the runtime's Message Schema so agents can construct valid Messages without reading the application source. With no arguments, returns a small variant index. With `variant_tag` set to a dot-separated path of variant tags (e.g. `GotChildMessage.Opened`), narrows the JSON Schema along the chain and collapses deeper unions to summary placeholders. Returns `None` when the runtime hasn't configured `DevToolsConfig.Message`. |
| `foldkit_dispatch_message`      | Dispatches a Message into the runtime as if your application produced it. The runtime decodes the payload against your Schema and returns a clean error if it does not match.                                                                                                                                                                                                                                                                    |
| `foldkit_dispatch_messages`     | Dispatches an ordered batch of 1 to 100 Messages in one call, first to last. The runtime validates every payload before dispatching any of them, so one invalid entry rejects the whole batch with its zero-based position and nothing is dispatched. Successful responses report the predicted history index for each Message.                                                                                                                  |

## How It Works

The browser bridge runs alongside DevTools in your app and subscribes to the DevTools store. The Vite plugin opens a WebSocket server on `devToolsMcpPort` and relays traffic between browsers and MCP clients. The MCP server runs as a Node child process spawned by your AI agent, connects to the relay, and exposes the typed tools.

Multiple browser tabs can be connected at once and each is addressable by its connection id. When a tab closes (gracefully or not) the plugin prunes it from the live runtime list, so the agent’s default to most recently connected always points at a live tab.

Messages flow as Effect Schema values end to end. Foldkit defines the wire protocol and every layer validates at its boundary. To dispatch, agents call `foldkit_get_message_schema` to discover the runtime’s `Message` Schema (variant index first, then a dot-path through the Submodel chain for one variant’s payload shape), construct the matching payload, and pass it to `foldkit_dispatch_message`; the runtime decodes it and returns a clean error if the shape does not match. To stage state that takes several Messages, `foldkit_dispatch_messages` dispatches an ordered batch in one call, validating the whole batch before dispatching any of it.

When the dev server restarts, the MCP server’s WebSocket client reconnects automatically with exponential backoff. No agent restart required.

## Notes

The MCP bridge shares its lifecycle with DevTools. The default enables both in dev. Setting `devTools: false` in your program config disables the bridge along with DevTools. The runtime becomes invisible to MCP.

Without `Message` in your DevToolsConfig, dispatch is rejected. The other tools (read-only) work without it.

The relay only runs at dev time. Production builds never include the relay or the bridge, regardless of any `show` setting.
