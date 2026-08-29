---
'@foldkit/oxlint-plugin': minor
'create-foldkit-app': patch
---

Add `foldkit/no-impure-call-at-decision-time`, which flags direct time and randomness calls unless they appear inside a recognized deferred Effect or lifecycle execution callback. The rule reports a call whether it appears directly in Command args or is assigned to a local variable first. It respects shadowed globals, stays off in tests, runtime entry files, and host server files, and is enabled by the recommended preset used in newly scaffolded apps.

This can introduce lint failures in existing applications that use the recommended or all preset. Move reported calls into an Effect or lifecycle execution callback, then return generated values through Messages. Consumers can temporarily disable the rule while migrating.
