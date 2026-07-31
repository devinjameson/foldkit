---
'@foldkit/ui': minor
---

Export `Checkbox.labelId` and `Checkbox.descriptionId`

The checkbox derived `${id}-label` and `${id}-description` from module-private consts, so a consumer that needed to reference the label or description element, to point `aria-details` at it, to style it, or to find it in a test, had to re-declare the convention and hope it did not drift. `Fieldset` already exports its equivalents (`legendId`, `descriptionId`); the checkbox now matches. No behaviour change.
