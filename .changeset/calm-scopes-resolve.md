---
'@foldkit/oxlint-plugin': minor
'@foldkit/ui': minor
---

Resolve imported Foldkit, UI, Effect, and child Message APIs through Oxlint's scope manager. Rules now recognize aliased imports, ignore local shadows, and distinguish Submodel Message payloads from unrelated `message` fields without requiring TypeScript parser services.

This can introduce lint failures where an alias previously hid parent-owned construction of a child Message. Expose an update capability from the child and invoke it through `Update.foldChild` or `Update.foldChildStep` instead.

Expose Animation `show` and `hide` update capabilities so parents can drive visibility through `Update.foldChildStep` without constructing child Messages.
