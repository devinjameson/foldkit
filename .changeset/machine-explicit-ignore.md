---
'foldkit': minor
---

Add `Machine.ignore()` for explicitly declaring that a guard list should ignore its Message when every preceding `when` guard declines. `Machine.step` reports this outcome as `ExplicitlyIgnored`, and static analysis reports later Edges as `ShadowedByIgnore`.

This adds an `Ignore` variant to `Machine.GuardedEdge` and variants to `Machine.IgnoredReason` and `Machine.DeadTransitionReason`. Update exhaustive matches over those unions to handle `Ignore`, `ExplicitlyIgnored`, and `ShadowedByIgnore`.
