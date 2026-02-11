# Foldkit UI — Website Page + Tabs Component

## Context

Foldkit UI will be a port of Headless UI to foldkit — accessible, unstyled UI components as TEA modules (Model/Message/update/view). The components live inside the `foldkit` package itself at `foldkit/ui/*`, so users get UI building blocks with zero extra dependencies.

This first commit:

1. Adds a "Foldkit UI" showcase page to the website (new route, sidebar link)
2. Lists all planned components with "Coming Soon" badges
3. Implements the **Tabs** component as the first working module with a live demo

## Tabs Component — `packages/foldkit/src/ui/tabs.ts`

**Model**: `{ activeIndex: number }`

**Message**: `TabSelected({ index: number })`

**init**: `(activeIndex = 0) => Model`

**update**: Pure `(Model, Message) => Model` — no commands needed for a stateless UI component.

**view** API:

```ts
Tabs.view({
  model: model.tabs,
  toMessage: (msg) => TabsDemoMessage.make({ inner: msg }),
  tabs: [
    { label: 'Preview', content: previewPanel },
    { label: 'Code', content: codePanel },
  ],
  id: 'tabs-demo',
})
```

The view calls `html<Msg>()` internally to get element/attribute constructors typed to the consumer's message. The `id` param is required for deterministic ARIA linking (`aria-controls`, `aria-labelledby`).

**Keyboard**: ArrowLeft/Right to navigate, Home/End to jump, wraps around. Uses `OnKeyDown` (already in foldkit html module).

**ARIA**: `role="tablist"`, `role="tab"` with `aria-selected`/`aria-controls`, `role="tabpanel"` with `aria-labelledby`. Uses `Attribute()` escape hatch for `aria-controls` and `aria-labelledby`.

## Planned Components (Coming Soon sections)

Tabs, Disclosure, Dialog, Menu, Listbox, Combobox, Popover, Switch, Radio Group

## Files

### New files (4)

| File                                     | Purpose                                             |
| ---------------------------------------- | --------------------------------------------------- |
| `packages/foldkit/src/ui/tabs.ts`        | Tabs Model, Message, init, update, view             |
| `packages/foldkit/src/ui/index.ts`       | `export * as Tabs from './tabs'`                    |
| `packages/foldkit/src/ui/tabs.test.ts`   | Unit tests for init and update                      |
| `packages/website/src/page/foldkitUi.ts` | Showcase page with Tabs demo + Coming Soon sections |

### Modified files (7)

| File                                                  | Change                                                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `packages/foldkit/package.json`                       | Add `"./ui"` and `"./ui/tabs"` to exports                                                                         |
| `packages/foldkit/src/index.ts`                       | Add `export * as Ui from './ui'`                                                                                  |
| `packages/website/src/route.ts`                       | Add `FoldkitUiRoute`, router at `/ui`, add to parser                                                              |
| `packages/website/src/page/index.ts`                  | Add `export * as FoldkitUi from './foldkitUi'`                                                                    |
| `packages/website/src/main.ts`                        | Add `tabsDemo: Tabs.Model` to Model, `TabsDemoMessage` to Message, update handler, view/TOC matches, sidebar link |
| `packages/website/src/html.ts`                        | Export `section`, `Role`, `Tabindex`, `Attribute` (for page layout)                                               |
| `packages/website/src/commandStream/activeSection.ts` | Add `FoldkitUi` to TOC match                                                                                      |

## Implementation Order

1. `packages/foldkit/src/ui/tabs.ts` — core component
2. `packages/foldkit/src/ui/index.ts` — barrel export
3. `packages/foldkit/src/index.ts` — add `Ui` namespace
4. `packages/foldkit/package.json` — add exports
5. `packages/foldkit/src/ui/tabs.test.ts` — verify with `pnpm --filter foldkit test`
6. `packages/website/src/route.ts` — add route + router
7. `packages/website/src/html.ts` — add needed exports
8. `packages/website/src/page/foldkitUi.ts` — showcase page
9. `packages/website/src/page/index.ts` — re-export
10. `packages/website/src/main.ts` — wire Model/Message/update/view/sidebar/TOC
11. `packages/website/src/commandStream/activeSection.ts` — add TOC entry

## Verification

1. `pnpm --filter foldkit test` — tabs tests pass
2. `pnpm --filter foldkit build` — compiles clean
3. `pnpm --filter website build` — compiles clean
4. `pnpm --filter website dev` — navigate to `/ui`, verify:
   - Tabs demo is interactive (clicking tabs switches content)
   - Keyboard navigation works (arrow keys, Home, End)
   - All other component sections show "Coming Soon"
   - Page appears in sidebar
   - TOC sidebar shows all sections
