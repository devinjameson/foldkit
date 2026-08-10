---
'foldkit': minor
---

Accept a data-last `write` in `Update.refresh`, `Update.foldChild`, and `Update.foldChildStep`. The setter half of the lens is now `Update.Write<Model, Value>`, a union of the data-first form (`(model, next) => evo(model, { field: () => next })`) and the data-last form (`(next) => (model) => ...`), and the fold dispatches on the supplied function's arity. Every existing data-first `write` keeps working unchanged, including the ones whose parameters are inferred rather than annotated.

The data-last form has a real cost at the call site. TypeScript resolves a contextual signature from a union only when exactly one constituent survives the arity filter, which a two-parameter `write` does and a one-parameter `write` does not, so a data-last `write` gets no contextual parameter types and must annotate both the value and the Model. That in turn denies `evo`'s data-last overload the contextual object type it needs to check its keys, so a data-last `write` is longer than the data-first one it would replace, not shorter. Prefer the data-first form.
