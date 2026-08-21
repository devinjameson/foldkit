---
'foldkit': patch
'@foldkit/vite-plugin': patch
---

Speed up callable tagged constructors whose type-side fields can be copied directly, such as primitives, literals, and unions of those identity types. Structs, Arrays, child Messages, checked fields, contextual fields, opaque schemas, oneOf unions, schemas that redefine `_tag`, and other composite fields continue through Schema validation. In a warmed Node 22.22.3 benchmark on Effect 4.0.0-rc.109, `ClickedReset()` fell from 177.8 ns to 30.5 ns per call and `ClickedItem({ id })` fell from 257.5 ns to 73.7 ns per call.

The Vite plugin now includes SchemaAST in its forced Effect prebundle for this runtime dependency.

The fast path assumes typed object inputs whose provided payload fields are own data properties. Primitive inputs, payload accessors, and inherited payload fields fall back to Schema validation. Both paths ignore an inherited `_tag`. Calls that bypass TypeScript can now construct eligible variants with wrong primitive field types or missing required fields. Stateful accessor Proxy traps are outside the fast-path equivalence boundary. Decode untrusted input through the Schema as before.
