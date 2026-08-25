# AI

## Architecture and Source Context

AI coding agents work best in a Foldkit project when they can see both its predictable architecture and its current source.

The architecture gives every part of the program a clear role. The Model holds state. Messages record facts. update decides the next Model and which Commands to return. view describes the UI. The Runtime starts and manages outside work described by Commands, Subscriptions, Mounts, Flags, Resources, and ManagedResource entries.

An agent can follow that loop from an interaction to a Message, through update, and back to the rendered result. It can also see where a Submodel owns behavior and how an OutMessage carries a fact to its parent.

Architecture is only half of the context. APIs and conventions change, so the agent also needs a current copy of Foldkit's source, examples, and documentation.

## Vendoring the Foldkit Repository

Vendor the Foldkit repository into your project as a git subtree:

::Snippet{name="aiOverviewAddSubtree" label="vendor the Foldkit repository"}

The subtree gives an agent local access to the framework source, runnable examples, this documentation site, and the production apps built with Foldkit. Treat it as read-only reference material. Application imports should still come from the installed npm packages.

Unlike a submodule, a subtree is committed with your repository. Teammates, CI runners, and cloud agents receive the reference source with a normal clone. Projects created with `create-foldkit-app` include a `FOLDKIT.md` that points agents to these references, an `AGENTS.md` for your own instructions, and a `.ignore` file that keeps `repos/` out of the editor file tree.

Refresh the subtree when you want the latest source and examples:

::Snippet{name="aiOverviewRefreshSubtree" label="refresh the Foldkit repository"}

## Keeping FOLDKIT.md Current

`create-foldkit-app` writes `FOLDKIT.md` when it creates the project, and the conventions in it change with the framework. A stale copy can steer an agent toward APIs the installed packages no longer export.

Replace the whole file when you upgrade Foldkit. If you vendor the repository, copy `repos/foldkit/packages/create-foldkit-app/templates/base/FOLDKIT.md` over it. Otherwise take the [current template on GitHub](https://github.com/foldkit/foldkit/blob/main/packages/create-foldkit-app/templates/base/FOLDKIT.md). There is nothing to merge, because your own instructions live in `AGENTS.md`, which the upgrade leaves alone.

## Foldkit Skills

Foldkit ships [agent skills](/ai/skills) for Claude Code, Codex, the ChatGPT desktop app, and OpenCode. The skills encode repeatable workflows for building and auditing Foldkit applications. They also direct the agent to the vendored repository when the live source is more authoritative than a written guide.

## DevTools MCP

Skills and source help an agent understand the code. The [DevTools MCP server](/ai/mcp) exposes an application that is currently running. An agent can inspect the current or historical Model, query Message history, compare states, replay the UI, and dispatch Schema-validated Messages.
