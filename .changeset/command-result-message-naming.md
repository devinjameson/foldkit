---
'@foldkit/ui': minor
'@foldkit/devtools': patch
'create-foldkit-app': patch
'foldkit': patch
---

Breaking: align Command result pairs with the effects they represent.

The convention already said `Completed*` mirrors the Command name verb-first, but it was written as a rule for fire-and-forget acknowledgments, so Commands that resolved to a value drifted into conjugating their own verb instead: `DetermineStartTime` produced `DeterminedStartTime`, `GenerateCardId` produced `GeneratedCardId`, `SaveTodos` produced `SavedTodos`. Those names read like facts that arrived on their own, which hides the Command→Message pair in a DevTools timeline and in Story and Scene tests.

A payload does not change the rule. A Command whose result cannot meaningfully fail names that result `Completed<Command>` and carries the value as the payload. `Succeeded*`/`Failed*` still cover Commands that can fail. The one exception is a Message with more than one cause: when several Commands resolve to the same Message, or a Command synthesizes a Message another source also emits, name it for the fact. `EndedAnimation` stays as it is because both the `WaitForAnimationSettled` Command and each component's `DetectMovementOrAnimationEnd` race produce it.

Derive the result only after checking that the Command itself names the effect its `execute` body performs. Timer Commands that only wait now say so instead of claiming the later Model transition.

## Migration

Renamed Command result pairs on `@foldkit/ui`:

| Component     | Command                                | Message                                                 |
| ------------- | -------------------------------------- | ------------------------------------------------------- |
| `Animation`   | `RequestFrame` → `WaitForPaint`        | `AdvancedAnimationFrame` → `CompletedWaitForPaint`      |
| `DragAndDrop` | `ResolveKeyboardMove`                  | `ResolvedKeyboardMove` → `CompletedResolveKeyboardMove` |
| `Listbox`     | `DelayClearSearch`                     | `ClearedSearch` → `CompletedDelayClearSearch`           |
| `Menu`        | `DelayClearSearch`                     | `ClearedSearch` → `CompletedDelayClearSearch`           |
| `Toast`       | `DismissAfter` → `WaitBeforeDismissal` | `ElapsedDuration` → `CompletedWaitBeforeDismissal`      |
| `Tooltip`     | `ShowAfterDelay` → `WaitBeforeShowing` | `ElapsedShowDelay` → `CompletedWaitBeforeShowing`       |

Apps reference these when they resolve a component Command in a Story or Scene test, or match on a component Message they forwarded through `Got*`. Update both names in those call sites when the Command changed.
