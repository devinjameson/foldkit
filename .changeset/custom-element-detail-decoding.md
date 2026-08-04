---
'foldkit': minor
---

Decode a CustomEvent's `detail` against the Schema its `CustomElement.define` binding declares.

The `events` record already described each event's payload with Schema, but the declaration was type-level only: the runtime passed `event.detail` straight to your callback without checking it. A third-party element that changed its payload shape across a version bump satisfied the compiler and fed an unchecked value into update. The runtime now decodes `detail` before the callback runs, so the value you receive matches what you declared and undeclared fields are dropped.

A `detail` the Schema rejects is reported on the console and dispatches no Message, which keeps a Message built from a payload you never declared out of update. An event that carries no payload is still declared as `S.Struct({})`; the DOM leaves `detail` as `null` on such an event, and the runtime decodes that as an empty detail.

Two typed surfaces move with it. A Schema that requires decoding services can no longer describe an event, because the decode runs synchronously inside the DOM event handler where there is no context to draw from; the `events` record is now constrained to service-free Schemas, exported as `CustomElement.EventSchema`. The `Scene.emitCustomElementEvent` step takes its `detail` on the declared Schema's encoded side, matching what a real element puts on the event before the runtime decodes it. Both are identical to what they accepted before for Schemas whose encoded and decoded shapes agree, which covers every plain struct of primitives.
