---
'foldkit': minor
---

Let `Subscription.aggregate` and `ManagedResource.aggregate` read their types off the records they are given, so the Model, Message, and Effect services no longer have to be written out.

```ts
const subscriptions = Subscription.aggregate(
  homeSubscriptions,
  roomSubscriptions,
)

const managedResources = ManagedResource.aggregate(
  playgroundManagedResources,
  notePlayerManagedResources,
)
```

The Model of the first record is the one every later record is checked against, so a record from another Model universe fails at its own argument position rather than blaming the first record. Message and services widen to the union across all records, which is what lets a record needing an Effect service sit beside records needing none. A record built from `Subscription.persistent` entries carries no Model of its own and joins any aggregate.

The result now keeps each record's keys and each entry's exact type: dependency types and schemas, `keepAliveEquivalence` variants, the `GatedDependencies` shape a gated `Subscription.lift` produces, and the arity of each Managed Resource `onAcquired` handler. `Subscription.aggregate` previously erased all of that behind an index signature.

The curried `aggregate<Model, Message, Services>()` form still works and still checks the same way. Reach for it when a record has to be typed before its entries exist, such as a value annotated at a module boundary, or when either behavior below matters.

Two edges of the inferred form are worth knowing, both consequences of reading the Model off the records rather than being told it:

- Argument order matters. A record declared over a narrow slice of the Model has to come after the record that establishes the full one, because the first record is the reference. `aggregate(wide, narrow)` compiles where `aggregate(narrow, wide)` does not. The curried form accepts either, since the Model is declared rather than derived.
- The result no longer carries an index signature, so `record[someStringVariable]` on an aggregated record is now an error. Indexing by a literal key works, and assigning the result to a `Subscriptions<Model, Message>` annotation restores the old shape.
