---
'foldkit': minor
---

Breaking: give the short names in `Route.Transition` to the tag-taking helpers. `entered` and `exited` now take a route tag and return that route narrowed to it, the behavior previously spelled `enteredRoute` and `exitedRoute`. The forms that answer for whichever route a transition entered or left are now `enteredAny` and `exitedAny`.

The tag-taking forms carry the common case: a transition helper is almost always asked about one named route, and the union-dispatch forms only come out when several routes have entry Commands. Every tag-taking helper is now the bare verb, so `entered`, `exited`, and `stayed` read the same and take the same arguments. `stayed` is unchanged and gains no `stayedAny` counterpart: without a tag its two sides could not narrow to the same route variant together, so matching on one would leave the other typed as the whole union.

Migration is a rename at each call site:

```ts
// Before
Transition.enteredRoute(transition, 'Person')
Transition.exitedRoute(transition, 'Person')
Transition.entered(transition)
Transition.exited(transition)

// After
Transition.entered(transition, 'Person')
Transition.exited(transition, 'Person')
Transition.enteredAny(transition)
Transition.exitedAny(transition)
```

The names `Transition.entered` and `Transition.exited` survive the rename with new meanings, but an unmigrated call cannot pass silently: the tag-taking forms require a second argument, so an old one-argument call fails to compile. `stayed`, `isEntering`, `make`, `coldLoad`, and the `Transition` type are unchanged.
