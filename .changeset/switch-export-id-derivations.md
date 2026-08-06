---
'@foldkit/ui': minor
---

Export `Switch.labelId` and `Switch.descriptionId`

Switch derived `${id}-label` and `${id}-description` from module-private consts, so a consumer that needed to reference the label or description element, to point `aria-details` at it, to style it, or to find it in a test, had to re-declare the convention and hope it did not drift. `Checkbox`, `Fieldset`, `Dialog`, `Select`, `Textarea`, `Input`, and `Popover` already export their equivalents; Switch now matches. No behavior change.
