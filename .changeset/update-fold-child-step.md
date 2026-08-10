---
'foldkit': minor
---

Add `Update.foldChildStep`, the `Update.foldChild` variant for a child entry point that takes nothing but the child Model, such as `Dialog.close` or a Submodel's `informRouteChanged` that derives everything from its own state. It returns the `Update.Step` itself rather than a dual `Update.Fold`, so the call site composes with `Update.combine` without inventing an input the child does not take. Reading, writing, Command lifting, the no-op on a `None` from `read`, and `foldOutMessage` all behave exactly as they do in `foldChild`, down to the optional second parameter `foldOutMessage` receives, an `Update.FoldContext` carrying `liftCommand` and `liftCommands` bound to the config's `toParentMessage`.
