---
'foldkit': minor
---

Add opt-in, Schema-typed read-only context to experimental Machines. Declare `context` in the first `Machine.define` stage to require it as the third argument to `transition` and `step`, expose it as the third guard parameter, and include it in `EdgeInput`.

Context-free Machines retain their existing two-argument call signatures and Edge input shape. Use context for per-dispatch reads from data outside the Machine state; keep state-owned snapshots in the state and continue using Messages for values that should be observable facts.
