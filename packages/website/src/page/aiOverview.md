# AI

## Overview

Most frameworks give AI tools too much freedom. State can live anywhere, effects can happen anywhere, and there’s no canonical structure to follow. The result is generated code that works but doesn’t hold up.

Foldkit’s architecture changes this. The Elm Architecture enforces a rigid, yet expressive structure where every piece has a canonical shape and function. Side effects are encapsulated in exactly six places: Commands, Mount Effects, flags, Subscription streams, Resources, and ManagedResources. Every Message routes back through update. The same constraints that make your code correct make it machine-legible.

An AI that understands this loop can reason about the entire program as a state machine. It can generate structurally valid code, not just syntactically valid code. It can scaffold Messages and know exactly where they wire through. It can extract [Submodel](/core/submodel) and get the [OutMessage](/core/submodel#surfacing-facts) pattern right.

This isn’t a bolt-on. It’s a consequence of the architecture.

## Subtree Setup

For the best experience, vendor the Foldkit repository into your project as a git subtree:

```sh
git subtree add --prefix=repos/foldkit https://github.com/foldkit/foldkit.git main --squash
```

This gives the AI access to the Foldkit source code, the examples, and this documentation site: real patterns it can learn from and apply to your code. Unlike a submodule, a subtree is checked into your repository, so a fresh clone (your teammate, a CI runner, a cloud agent) has the source on disk immediately. The starter template includes an `AGENTS.md` with Foldkit conventions and a `.ignore` file that keeps the vendored source out of your editor’s file tree.

To pull the latest source, examples, and docs into the subtree:

```sh
git subtree pull --prefix=repos/foldkit https://github.com/foldkit/foldkit.git main --squash
```

## Skills Plugin

Foldkit ships a [skills plugin](/ai/skills) for Claude Code that encodes Foldkit’s conventions, patterns, and quality standards into agent workflows. The skills reference the actual example code in the Foldkit repository, so the generated output stays in sync with the framework as it evolves.

## DevTools MCP

Skills generate code. The [DevTools MCP server](/ai/mcp) lets agents observe and interact with code that’s already running. Agents can read the current Model, list and inspect Message history, rewind the UI to any past Model, and dispatch Messages into the runtime.
