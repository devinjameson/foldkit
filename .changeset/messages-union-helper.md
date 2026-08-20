---
'foldkit': minor
---

Add `messages` to `foldkit/message`, which declares a whole Message union from one record of fields per variant instead of naming each variant once as a constructor and again in the union list.

The result is a `Schema.TaggedUnion`, so it decodes, nests in a Model, and carries `cases`, `guards`, and `isAnyOf`. Each variant hangs off it as a callable constructor that is itself a schema, which is what `Command.define` needs for its `messages` list. Matching is unaffected, since the values are ordinary tagged objects that `Match` handles as before, including `M.tag` over several tags and `M.tags` with an `M.orElse` fallback.

`m` is unchanged. Reach for it for a single variant, and for a variant shared across two unions, such as a Submodel OutMessage built from some of its own Messages.

```typescript
export const Message = messages({
  ClickedReset: {},
  ChangedCount: { count: S.Number },
})
export type Message = typeof Message.Type

Message.ClickedReset() // { _tag: 'ClickedReset' }
Message.ChangedCount({ count: 1 }) // { _tag: 'ChangedCount', count: 1 }
```
