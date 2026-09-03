---
'foldkit': minor
---

Machine Edge handlers now return one `Update.Return`-shaped record with `model` and optional `commands` fields. This replaces the separate Model builder and Commands callback arguments on `to` and `when`, keeps transition outputs consistent with Foldkit update functions, and lets one derivation feed both the next state and its Commands. Migrate by returning `{ model, commands }` from the existing handler and removing the separate Commands callback.
