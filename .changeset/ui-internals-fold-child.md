---
'@foldkit/ui': patch
---

Fold child Submodels inside component internals with `Update.foldChild`. Dialog, Popover, Menu, DatePicker, Listbox, Combobox, and Toast now build their child folds from the helper instead of hand-writing `Command.mapMessages` plus an OutMessage match. The Dialog and Toast leave-animation folds take the fold's `Update.FoldContext` and lift the overridable leave Command with `liftCommand`. Internal refactor with no API or behavior change.
