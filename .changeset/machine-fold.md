---
'foldkit': minor
---

Add `Machine.fold`, a dual helper that folds a Machine state field into its enclosing Model.

The helper supports both data-first update calls and data-last `Update.Step` composition. Contextual Machines read their required context from the enclosing Model for each transition.
