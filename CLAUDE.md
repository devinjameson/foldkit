# Claude Development Notes

This file contains preferences and conventions for Claude when working on this codebase.

## Code Style Conventions

### Array Checks

- Always use `Array.isEmptyArray(foo)` instead of `foo.length === 0`
- Use `Array.isNonEmptyArray(foo)` for non-empty checks
- When handling both empty and non-empty cases, prefer `Array.match` over `isEmptyArray`/`isNonEmptyArray` checks

### Effect-TS Patterns

- Prefer `pipe()` for data flow
- Use `Effect.gen()` for imperative-style async operations
- Use curried functions for better composition

## Project Structure

- Core functionality in `packages/foldkit/src/core/`
- Examples in `examples/*/src/main.ts`
- Export modules as namespaces (e.g., `export * as Route from './core/routing'`)
