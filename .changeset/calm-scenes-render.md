---
'foldkit': minor
---

Make negated Scene property, state, accessible-name, and accessible-description assertions require their target element to exist. Use `toBeAbsent()` or `not.toExist()` when absence is the intended assertion.

Accessible-name and accessible-description queries now exclude descendants hidden with `aria-hidden`, the `hidden` attribute, `display: none`, or `visibility: hidden`. Hidden elements directly referenced by `aria-labelledby` or `aria-describedby` continue to contribute their full subtree text.
