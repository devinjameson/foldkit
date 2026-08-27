---
'@foldkit/oxlint-plugin': minor
---

Add `foldkit/no-empty-to-parent-out-message` to the recommended and all presets. The rule flags an inline `toParentOutMessage` mapper that directly returns `undefined`. That mapper forwards nothing to the parent, so the property should be omitted.

The rule fixes straightforward object literals. It reports without a fix when comments, spreads, dynamic computed keys, or duplicate `toParentOutMessage` properties make removal ambiguous. It does not inspect async functions, generators, getters, setters, or mappers referenced by name.

The existing `foldkit/no-empty-commands-array` rule now follows the same autofix safeguards. In particular, it still reports `commands: []` when the same object has a dynamic computed property, but it leaves the edit to the author because the computed property might also be named `commands` at runtime.
