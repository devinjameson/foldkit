---
'foldkit': minor
'@foldkit/ui': patch
'create-foldkit-app': patch
---

Rename the Scene and Story `with` step to `given`.

`Scene.with` and `Story.with` are now `Scene.given` and `Story.given`. Story's exported `WithStep` type is now `Story.GivenStep`. Scene's equivalent stays module-private, as it was before; `Scene.SceneStep` is the exported step type there.

`with` is a reserved word, so it could never be a named import binding. The module worked around that internally by defining `with_` and exporting it as `with`, which kept `Story.with` readable at the cost of forcing `import { with as with_ }` on anyone importing the steps by name. `given` has no such problem, reads the same in both call styles, and names what the step does: it establishes the precondition the rest of the chain runs against. It also lines up with the Given/When/Then vocabulary the steps already follow, since a story is `given`, then `message`, then `model`.

## Migration

Rename the step at every call site.

```ts
// before
Story.story(update, Story.with(model), Story.message(Clicked()))
Scene.scene({ update, view }, Scene.with(model), Scene.click(role('button')))

// after
Story.story(update, Story.given(model), Story.message(Clicked()))
Scene.scene({ update, view }, Scene.given(model), Scene.click(role('button')))
```

If you referenced the step type, rename it too:

```ts
// before
const step: Story.WithStep<Model> = Story.with(model)
// after
const step: Story.GivenStep<Model> = Story.given(model)
```

## Importing the steps by name

Because `given` is a legal binding, a test file can now import the steps it uses instead of the whole namespace, which removes the prefix from every call site:

```ts
import { Command, given, message, model, story } from 'foldkit/story'

test('restarting resets the score', () => {
  story(
    update,
    given(playingModel),
    message(PressedKey({ key: 'r' })),
    model(model => {
      expect(model.points).toBe(0)
    }),
    Command.expectHas(GenerateApplePosition),
  )
})
```

A test file normally needs only one of the two testing modules, so this reads well in practice. When one file tests both a story and a scene, keep the namespace imports so `Story.given` and `Scene.given` stay distinguishable.
