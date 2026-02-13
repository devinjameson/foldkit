# Claude Development Notes

This file contains preferences and conventions for Claude when working on this codebase.

## Project Conventions

- This is a foldkit project — a framework built on Effect-TS. Always use Schema types (not plain TypeScript types), full names like `Message` (not `Msg`), and `withReturnType` (not `as const` or type casting). Follow the model-as-union and OutMessage patterns used throughout the codebase.
- foldkit is tightly coupled to the Effect ecosystem. Do not suggest solutions outside of Effect-TS. The project already has a `create-foldkit-app` scaffolding tool — check existing features before suggesting new ones.

## Code Quality Standards

Before writing code, read the exemplar files to internalize the level of care expected:

Library internals (when working in `packages/foldkit/src/`):

- `packages/foldkit/src/runtime/runtime.ts` — orchestration, state management, error recovery
- `packages/foldkit/src/parser.ts` — bidirectional combinators, type-safe composition

Application architecture (when working in `packages/website/`, examples, or apps built with foldkit):

- `examples/typing-game/client/src/` — model-as-union, update/message patterns, view decomposition, commands

Match the quality and thoughtfulness of these files. The principles below apply broadly, but calibrate to the right context — library design when building foldkit internals, application architecture when building with foldkit:

- Every name should eliminate ambiguity. Prefix Option-typed values with `maybe` (e.g. `maybeCurrentVNode`, `maybeSession`). Name functions by their precise effect (e.g. `enqueueMessage` not `addMessage`). A reader should never need to check a type signature to understand what a name refers to.
- Each function should operate at a single abstraction level. Orchestrators delegate to focused helpers — they don't mix coordination with implementation. If a function reads like it's doing two things, extract one.
- Encode state in discriminated unions, not booleans or nullable fields. Use `Idle | Loading | Error | Ok` instead of `isLoading: boolean`. Use `EnterUsername | SelectAction | EnterRoomId` instead of `step: number`. Make impossible states unrepresentable.
- Name messages as past-tense events describing what happened (`UsernameFormSubmitted`, `RoomCreated`, `KeyPressed`), not imperative commands. The update function decides what to do — messages are facts.
- Use `Option` instead of `null` or `undefined`. Match explicitly with `Option.match` or chain with `Option.map`/`Option.flatMap`. No `if (x != null)` checks. Prefer `Option.match` over `Option.map` + `Option.getOrElse` — if you're unwrapping at the end, just match.
- Errors in commands should become messages via `Effect.catchAll(() => Effect.succeed(ErrorMessage.make(...)))`. Side effects should never crash the app.
- Extract complex update handlers or view sections into their own files when they grow beyond a few cases. Don't let logic pile up.
- Prefer curried, data-last functions that compose in `pipe` chains.
- Every line should serve a purpose. No dead code, no empty catch blocks, no placeholder types, no defensive code for impossible cases.

## Code Style Conventions

### Array Checks

- Always use `Array.isEmptyArray(foo)` instead of `foo.length === 0`
- Use `Array.isNonEmptyArray(foo)` for non-empty checks
- When handling both empty and non-empty cases, prefer `Array.match` over `isEmptyArray`/`isNonEmptyArray` or .length checks

### Effect-TS Patterns

- Prefer `pipe()` for multi-step data flow. Never use `pipe` with a single operation — call the function directly instead: `Option.match(value, {...})` not `pipe(value, Option.match({...}))`.
- Use `Effect.gen()` for imperative-style async operations
- Use curried functions for better composition
- Always use Effect.Match instead of switch
- Prefer Effect module functions over native methods when available — e.g. `Array.map`, `Array.filter`, `Option.map`, `String.startsWith` from Effect instead of their native equivalents. Exception: native `.map`, `.filter`, etc. are fine when calling directly on a named variable (e.g. `commands.map(Effect.map(...))`) — use Effect's `Array.map` in `pipe` chains where the curried, data-last form composes naturally.

### Message Layout

Message definitions follow a strict four-group layout, whether in a dedicated message file or a message block within a larger file (like main.ts). Each group is separated by a blank line:

```ts
const A = ts('A')
const B = ts('B', { value: S.String })

const Message = S.Union(A, B)

type A = typeof A.Type
type B = typeof B.Type

type Message = typeof Message.Type
```

1. **Values** — all `ts()` declarations, no blank lines between them
2. **Union** — `S.Union(...)` of all values
3. **Individual types** — `type X = typeof X.Type` for every value, no blank lines between them
4. **Message type** — `type Message = typeof Message.Type`, separated from individual types

Always create types for all message values, not just the ones currently used externally.

### General Preferences

- Never abbreviate names. Use full, descriptive names everywhere — variables, types, functions, parameters. e.g. `signature` not `sig`, `cart` not `c`, `Message` not `Msg`.
- Avoid `let`. Use `const` and prefer immutable patterns. Only use `let` when mutation is truly unavoidable.
- Always use braces for control flow. `if (foo) { return true }` not `if (foo) return true`.
- Use `is*` for boolean naming e.g. `isPlaying`, `isValid`
- Don't add comments. If the code is not clear enough and you are adding
  comments to explain or improve clairty, instead refactor it to make it easier to
  understand or use better names.
- When editing code, follow existing patterns in the codebase exactly. Before writing new code, read 2-3 existing files that do similar things and match their style for naming, spacing, imports, and patterns. Never use placeholder types like `{_tag: string}`.
- Use capitalized string literals for Schema literal types: `S.Literal('Horizontal', 'Vertical')` not `S.Literal('horizontal', 'vertical')`.

### Commits and Releases

- Do not co-author or mention Claude in commit messages
- Do not mention Claude in release notes

## Editing Rules

- When making multi-file edits or refactors, apply changes to ALL relevant files — not just a subset. After refactoring, verify that spacing, margins, and visual formatting haven't regressed from the original.

## Communication

- When I ask a question or make a comment that sounds rhetorical, opinion-based, or conversational (e.g., 'what do you think about X?', 'im asking you'), respond with discussion — not code edits. Only make code changes when explicitly asked to.
- When I leave CLAUDE-prefixed comments in code, those are instructions for you. Search for them explicitly and address them. Do not remove or skip them.
