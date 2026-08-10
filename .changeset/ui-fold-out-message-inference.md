---
'@foldkit/ui': patch
---

Drop the redundant function-type annotation from the component internals' `fold<Child>OutMessage` consts. `M.type<X.OutMessage>()` names the OutMessage and `M.withReturnType<Update.Step<Model, Message>>()` names the Step, so the standalone annotation restated both. Calendar, Popover, Menu, Combobox, and Listbox folds now bind the pipe directly. The Dialog and Toast leave-animation folds keep their annotation, since they take the fold's `Update.FoldContext` as a second parameter and nothing else types it. Internal refactor with no API or behavior change.
