---
'foldkit': patch
---

Stop an HMR reload from running the `flags` Effect when it restores a Model.

Flags resolve before `init`, and the runtime resolved them ahead of the HMR restore decision. A reload that successfully restores a preserved Model skips `init` entirely, so the flags value was computed and then discarded. The resolution now sits behind that decision, so a restored Model never runs `flags` at all. A reload that cannot read the preserved Model still falls back to `init` and resolves them exactly as before.

This shows up two ways on a restore, both development-only, because a production build has no HMR path. A `flags` Effect that performs a side effect of its own, seeding a store or writing a session id, no longer performs it on every reload. A `flags` Effect that requires services no longer forces the `resources` Layer to build, so a Layer holding a connection stops reconnecting on every save. Subscriptions whose pipelines run for the application's lifetime still build the Layer at startup either way.
