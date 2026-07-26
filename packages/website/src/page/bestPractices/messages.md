# Messages

## Messages as Events

Messages describe what happened, not what to do. Name them as verb-first, past-tense events where the prefix acts as a category marker: `Clicked*` for button presses, `Updated*` for input changes, `Succeeded*`/`Failed*` for Command results that can meaningfully fail, `Completed*` for fire-and-forget Command acknowledgments, `Got*` for child module results via the [OutMessage](/core/submodel#surfacing-facts) pattern. For example, `ClickedFormSubmit` and `RemovedCartItem` rather than imperative Commands like `SubmitForm` or `RemoveFromCart`.

### Good Message Names

- `ClickedAddToCart`
- `UpdatedSearchInput`
- `SucceededFetchUser`

### Avoid These

- `SetCartItems`
- `UpdateSearchText`
- `MutateUserState`

The `update` function decides how to handle a Message. The Message itself is just a fact about what occurred.

### Every Message Carries Meaning

Never use a generic `NoOp` Message. Every Message should describe what happened, even for fire-and-forget Commands where the update function is a no-op. For example, when a focus Command completes, use `CompletedFocusItems`. When scroll is locked, use `CompletedLockScroll`. When an internal navigation finishes, use `CompletedNavigateInternal`.

Notice that this mirrors how you name Commands. Commands have two names: the function name (camelCase: `lockScroll`, `focusItems`, `showDialog`) and the Command `name` field (PascalCase: `LockScroll`, `FocusItems`, `ShowDialog`). Both are verb-first imperatives: instructions to the runtime. The resulting Message keeps the same verb-first order with a prefix: `CompletedLockScroll`, `CompletedFocusItems`, `CompletedShowDialog`. Verb-first naming aligns with Command names, making Command→Message pairs instantly recognizable: Command `FocusItems` → Message `CompletedFocusItems`, Command `LockScroll` → Message `CompletedLockScroll`.

This turns the DevTools timeline from a wall of identical `NoOp` entries into a readable narrative: `Opened` → `CompletedFocusItems`, `CompletedLockScroll`, `CompletedInertOthers`. Every line tells you what happened in your application.

Command names are often more specific than the Messages they produce. Several Commands (`NavigateInternal`, `RedirectToLogin`, `ReplaceSearchUrl`) all produce `CompletedNavigateInternal`. The Message is intentionally generic because update handles all internal navigations the same way. The Command name preserves the context that the Message discards: not just that a navigation happened, but why.
