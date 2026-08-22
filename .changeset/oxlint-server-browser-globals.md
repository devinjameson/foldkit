---
'@foldkit/oxlint-plugin': minor
---

Add `foldkit/no-nonportable-server-globals` to both presets. The rule catches common browser-only globals in `entry.server.ts`, `entry.server.tsx`, TypeScript files under a `server` directory, and `prerender.ts`. Colocated files ending in `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` are excluded.

The curated list covers `document`, `window`, `navigator`, `localStorage`, `sessionStorage`, `history`, `location`, `alert`, `confirm`, `prompt`, `requestAnimationFrame`, `cancelAnimationFrame`, `requestIdleCallback`, `cancelIdleCallback`, `getComputedStyle`, `matchMedia`, `customElements`, `screen`, `IntersectionObserver`, `ResizeObserver`, and `MutationObserver`. The same names are caught when read through a static `globalThis` property or destructured directly from `globalThis`.

Local bindings, parameters, and type-only `typeof` queries remain valid. `Request`, `Response`, `Headers`, `fetch`, and `URL` remain available for host code. The Foldkit-owned rule composes with any `no-restricted-globals` policy in the consuming project instead of replacing it.

This is a portability guardrail, not an exhaustive list of browser APIs or a security boundary. Lint may newly fail when a recognized server file reads one of the listed globals at runtime.
