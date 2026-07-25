# Skills

## Overview

Foldkit ships a `foldkit-skills` plugin that provides agent skills tailored to the Foldkit architecture. These skills encode the conventions, patterns, and quality standards that make Foldkit apps well-factored and maintainable.

The skills work with `Claude Code`, `Codex`, the ChatGPT desktop app, and `OpenCode`. Each skill is a directory with a `SKILL.md` file, the format they all read.

## Installation

### Claude Code

Add the Foldkit marketplace, then install the plugin:

```text
/plugin marketplace add foldkit/foldkit
```

```text
/plugin install foldkit-skills@foldkit
```

### Codex and ChatGPT

Codex discovers repo-local skills from `.agents/skills/`. Vendor the Foldkit repository as a git subtree (see the [AI overview](/ai/overview)) so the sources are on disk, then copy or symlink the skill directories from `repos/foldkit/skills/` into `.agents/skills/` in your project. Invoke a skill by name, for example `$generate-program`.

The ChatGPT desktop app surfaces the skills in its picker from the `agents/openai.yaml` descriptor shipped alongside each `SKILL.md` (display name, short description, and default prompt). Follow the [ChatGPT skills guide](https://learn.chatgpt.com/docs/build-skills) to register them.

### OpenCode

[OpenCode](https://opencode.ai/docs/skills/) discovers skills from `.opencode/skills/`, `.claude/skills/`, and `.agents/skills/`, walking up from the working directory to the git root. It reads the `SKILL.md` frontmatter directly and ignores the ChatGPT `agents/openai.yaml` descriptor.

Copy or symlink the skills from the vendored subtree (`repos/foldkit/skills/`) into one of those directories. OpenCode also reads `AGENTS.md`, so the conventions the starter template ships already apply.

## Available Skills

### foldkit

```text
/foldkit-skills:foldkit
```

Always-on framing for working in a Foldkit codebase. Auto-loads when Foldkit context is detected (imports, files, or prompt mentions) and sets the agent's posture: pattern-match against Foldkit's own apps (the examples, the website, the typing-game), treat the architecture as non-negotiable, use what the Foldkit and Effect stack already ships before reaching for outside libraries, and prefer the canonical source over memory. Points the agent at the vendored foldkit subtree for the conventions, source code, and examples themselves.

### generate-program

```text
/foldkit-skills:generate-program
```

Generate a complete, idiomatic Foldkit application from a natural language description. Produces correct-by-construction apps with proper Model schemas, Message naming, Commands with error handling, and Foldkit UI component integration.

### audit-program

```text
/foldkit-skills:audit-program
```

Audit an existing Foldkit program against the architecture, conventions, and quality bar. Surfaces structural issues, naming drift, accessibility gaps, dead code, and idiom violations as a structured BLOCKERS / QUALITY / NICE-TO-HAVE report. Read-only by default; fixes are opt-in and require explicit approval per item or batch.

More skills are in development, including message scaffolding and Submodel extraction.
