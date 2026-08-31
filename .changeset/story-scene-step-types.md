---
'foldkit': minor
---

Preserve Message and OutMessage type safety across Story and Scene steps.

`Story.message`, `Story.expectOutMessage`, `Scene.Subscription.emit`, `Scene.expectOutMessage`, and `Scene.expectOutMessages` are now typed data steps rather than callable simulation transforms. Story and Scene validate those values against the Message and OutMessage types of the update under test, including narrow variants of a wider union.

## Migration

Passing these steps directly to `story` or `scene` is unchanged. Any code that treated one of these returned steps as a function must migrate, including direct invocation, storing it as a simulation transform, or composition through Effect's `flow` or another helper in either Story or Scene.

Use the new `Story.steps` API for a reusable Story sequence. It accepts the same steps as `story`, preserves their Model, Message, and OutMessage constraints, and can itself be passed anywhere a Story step is accepted.

Scene has no grouped-step API. Pass `Subscription.emit` and OutMessage assertion steps as separate arguments to `scene`; do not compose them as functions.

Before:

```ts
import { flow } from 'effect'
import { given, message } from 'foldkit/story'

const givenIncremented = flow(given({ count: 0 }), message(ClickedIncrement()))
```

After:

```ts
import { given, message, steps } from 'foldkit/story'

const givenIncremented = steps(given({ count: 0 }), message(ClickedIncrement()))
```

Remove the `flow` import when it was used only to group Story steps. This is not a general deprecation of Effect's `flow`; continue to use it for ordinary function composition outside the Story step API.
