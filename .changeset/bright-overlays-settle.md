---
'foldkit': minor
---

Add `Story.Command.resolveAllExact` and `Scene.Command.resolveAllExact` for asserting that every expected Command was dispatched while preserving the carry-forward behavior of `resolveAll`. Both batch resolver APIs now type-check each result Message against its Command, so previously accepted mismatched pairs must be corrected. Resolve `Dom.inertOthers` selectors after the pending render commits so portaled modal content remains interactive, and invalidate pending inert work when an overlay closes before that commit.
