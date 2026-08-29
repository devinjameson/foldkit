---
'@foldkit/ui': minor
---

`ShowDialog` now reports whether the dialog opened. It produces `SucceededShowDialog` when the show completes and `FailedShowDialog` when the dialog element is already gone by the time the show runs. `CompletedShowDialog` is renamed to `SucceededShowDialog`. Update any test that resolves `ShowDialog`:

```ts
// Before
Command.resolve(Dialog.ShowDialog, DialogMessage.CompletedShowDialog())

// After
Command.resolve(Dialog.ShowDialog, DialogMessage.SucceededShowDialog())
```

A failed show now releases the scroll lock that the Command took, and `update` closes the Model on `FailedShowDialog`. Before this change, the page stayed locked with no dialog open. The Model also still said the dialog was open. The same dialog could then render again with no lock and no focus trap. If another overlay was open, closing the dialog released that overlay's lock, and the page under it could scroll. `ShowDialog` also releases the lock when the Command is interrupted while it waits for the commit.

`CloseDialog` now releases the dialog's resources when the element is already gone by the time the close runs. Before this change, a close with no element was ignored and the lock was never released.

`CloseDialog` also unlocks page scroll only when the close released the resources that `ShowDialog` installed. A close that runs before the show has finished leaves the lock alone. When the show then fails, it releases the lock itself. When the show succeeds, `update` closes the dialog again. Without the check on the close result, a close that ran before the show finished would release the lock, and the failed show would release it again. With another overlay open, the page under that overlay could then scroll.
