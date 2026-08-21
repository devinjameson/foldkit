---
'foldkit': patch
---

Let a consumer export a program whose type comes from `makeElement` or `makeApplication`.

`MakeRuntimeReturn` has a hidden field that carries Flags, Resources and Kind. Its key was a `unique symbol` that Foldkit did not export. TypeScript had to write that key into the `.d.ts` file, but it had no name for it, so it failed with `TS4023: ... has or is using name 'RuntimeBootTypeId' ... but cannot be named`. This hit any package that builds a program in one module and exports it, as soon as that package turned on declaration emit.

The key is now a normal property, `'~foldkit/RuntimeBoot'`. Consumers need to do nothing. The field is still internal and still has no runtime representation.
