# Claude Development Notes

This file contains preferences and conventions for Claude when working on this codebase.

## Code Style Conventions

### Array Checks

- Always use `Array.isEmptyArray(foo)` instead of `foo.length === 0`
- Use `Array.isNonEmptyArray(foo)` for non-empty checks
- When handling both empty and non-empty cases, prefer `Array.match` over `isEmptyArray`/`isNonEmptyArray` or .length checks

### Effect-TS Patterns

- Prefer `pipe()` for data flow
- Use `Effect.gen()` for imperative-style async operations
- Use curried functions for better composition
- Always use Effect.Match instead of switch

### General Preferences

- Use `is*` for boolean naming e.g. `isPlaying`, `isValid`
- Don't add comments. If the code is not clear enough and you are adding
  comments to explain or improve clairty, instead refactor it to make it easier to
  understand or use better names.
