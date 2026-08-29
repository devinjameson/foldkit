---
'foldkit': minor
---

Accept `ChildAttribute` in a custom element's attribute array.

An `ElementBuilder` minted by `CustomElement.define` typed its attributes as `ReadonlyArray<Attribute<Message>>`, while every html element builder accepts `ReadonlyArray<Attribute<Message> | ChildAttribute>`. Spreading a Submodel's published `childAttributes` group into `h.div` typechecked, but spreading the same group into a defined custom element was rejected, even though the runtime routes a `ChildAttribute` through its originating Submodel's boundary regardless of the element's tag. Wrappers that forward caller attributes into a custom element inherited the narrowing, so their own attribute parameters could not accept published groups either.

The builder's call signature now accepts the union, matching the html element builders. Nothing changes at runtime.
