---
'foldkit': patch
---

Document `createKeyedLazy`'s key contract. The TSDoc now states that a key should be the identifier that already gives the rendered thing its DOM identity, so the memo and the DOM invalidate together, and that entries are never evicted, so keys are expected to be bounded. For example: an entity registry, a route table, a fixed set of call sites. It also names the upgrade path for an unbounded key space, which is a variant that drops keys absent from the latest render pass rather than a cap on this one.
