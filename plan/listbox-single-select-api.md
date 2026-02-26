# Listbox: Single-Select API

The Listbox uses `selectedItems: S.Array(S.String)` for both single and multi-select. In single-select mode, this is a type lie — the invariant is "exactly zero or one item" but the type allows any number. Consumers must wrap/unwrap through `ReadonlyArray<string>` even when their domain is `Option<string>`.

## Problem

In the query-sync example, this creates unnecessary glue:

```ts
// Option → [string] to set listbox selection
const paramToSelection = param =>
  Option.match(param, {
    onNone: () => [''],
    onSome: value => [value],
  })

// [string] → Option to read listbox selection back
const selectionToParam = (selectedItems, schema) =>
  pipe(
    Array.head(selectedItems),
    Option.flatMap(optionFromNonEmpty),
    Option.filter(S.is(schema)),
  )
```

Both functions exist only to bridge `Option<A>` (the domain) and `ReadonlyArray<string>` (the Listbox). With a single-select API that speaks `Option<string>`, this glue disappears.

## Proposed Change

Split the selection model so single-select uses `Option<string>`:

- **Model:** `selectedItems: S.Array(S.String)` → `selectedItem: S.OptionFromSelf(S.String)` for single-select
- **InitConfig:** `selectedItems?: ReadonlyArray<string>` → `selectedItem?: string` for single-select
- **SelectedItem message:** Already carries a single `item: string` — no change needed
- **Update (select handler):** Currently branches on `isMultiple` to decide toggle vs replace — split into two code paths

## Approach Options

**A. Two separate public APIs** — `Ui.Listbox` (single) and `Ui.Listbox.Multi` (multi). Shared internals, distinct Model/init/update/view types. Cleanest consumer experience, but duplicates the public surface.

**B. Discriminated union on the model** — `Selection = S.Union(Single({ selectedItem }), Multiple({ selectedItems }))`. One component, but consumers match on the selection mode when reading.

**C. Keep one API, add `selectedItem` accessor** — `Ui.Listbox.selectedItem(model): Option<string>` that reads `Array.head(model.selectedItems)`. Least invasive but still stores an array internally — the type is honest at the accessor level but not the model level.

**Recommendation:** Option A. It follows the CLAUDE.md principle of encoding state in discriminated unions. The `isMultiple: boolean` on the model is already a code smell — it determines runtime behavior through a flag instead of the type. Two APIs makes impossible states unrepresentable: a single-select Listbox can't accidentally hold multiple selections.

## Impact

- `packages/foldkit/src/ui/listbox/index.ts` — extract shared internals (keyboard nav, ARIA, transitions, focus) into a private module, expose `Listbox` and `Listbox.Multi` publicly
- `packages/website/src/page/foldkitUi/listbox.ts` — update demos
- `examples/query-sync/` — `paramToSelection` / `selectionToParam` collapse to direct `Option` usage
