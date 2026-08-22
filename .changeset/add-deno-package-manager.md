---
'create-foldkit-app': minor
---

Add `deno` as a package-manager choice for spa, ssg, and ssr scaffolds. Deno projects install and run through `deno install`/`deno task`, and the ssr scaffold uses `@effect/platform-deno`'s native `DenoHttpServer` instead of `@effect/platform-node`.

The ssr scaffold's request handling moves to `server/handler.ts`, leaving `server/main.ts` with only the platform wiring that serves it. A Deno scaffold replaces that wiring and nothing else, so both hosts answer requests through one set of rules rather than each carrying its own copy. The ssg scaffold runs its prerender script directly under `deno run` and needs no separate `tsx`.
