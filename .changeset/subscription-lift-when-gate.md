---
'foldkit': minor
---

Add an optional `when` gate to `Subscription.lift`. It is a parent-side field on the parent's `lift` call and it receives the parent Model, so the parent holds the half of a condition the child cannot see, such as the route a page Submodel sits behind. The child neither declares nor sees the gate; it keeps holding its own half in `modelToDependencies`. Pass one predicate to gate every entry in the record, or a `Subscription.EntryGates` map keyed by entry name to gate entries individually, which leaves entries the map omits lifted ungated. A closed gate is a real teardown: the entry's Stream stops, and the child's `modelToDependencies` does not run again until the parent reopens the gate, so child state that changes behind a closed gate causes no restarts. Gating rewrites a gated entry's dependencies to `Subscription.GatedDependencies`, whose `maybeDependencies` is `None` while the gate is closed; a gated entry's `readDependencies` returns the last dependencies seen through an open gate. Ungated entries and lifts without `when` are unchanged. Lifts chain, so a record can pass through intermediate levels and pick up a gate at whichever level knows the condition.

One predicate gates the whole record. The Settings page keeps declaring its own Subscriptions, and the parent adds the route condition the page cannot answer:

```ts
const settingsSubscriptions = Subscription.lift(Settings.subscriptions)<
  Model,
  Message
>({
  toChildModel: model => model.settings,
  toParentMessage: message => GotSettingsMessage({ message }),
  when: ({ route }) => route._tag === 'Settings',
})
```

A gate map names the entries to gate. The Room page holds a WebSocket stream that should outlive navigation and a keyboard listener that should not, so naming one entry gates it and leaves the other lifted ungated:

```ts
const roomSubscriptions = Subscription.lift(Room.subscriptions)({
  toChildModel: (model: Model) => model.room,
  toParentMessage: (message: Room.Message): Message =>
    GotRoomMessage({ message }),
  when: { roomKeyboard: ({ route }) => route._tag === 'Room' },
})
```
