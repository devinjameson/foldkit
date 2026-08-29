---
'foldkit': minor
---

Add `FieldValidation.match`, a module-level exhaustive matcher for `Field` states. It follows the `AsyncData.match` shape: data-first with the field or data-last for pipelines, handlers `onNotValidated`, `onValidating`, and `onValid` receiving the state's `value`, and `onInvalid` receiving `{ value, errors }`.

```typescript
FieldValidation.match(model.email, {
  onNotValidated: () => 'border-gray-300',
  onValidating: () => 'border-blue-300',
  onValid: () => 'border-green-500',
  onInvalid: () => 'border-red-500',
})
```
