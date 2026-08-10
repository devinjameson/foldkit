---
'@foldkit/ui': patch
---

Fold the DatePicker's Popover entry points with `Update.foldChildStep`. The hand-written `closePopover` Step and the `Opened` and `Closed` handlers now run `Popover.open` and `Popover.close` through the helper instead of calling them directly and lifting their Commands with `Command.mapMessages`, so the Popover's read, write, and Message lift are stated once and shared with the existing `Update.foldChild` config. Internal refactor with no API change.
