---
'@foldkit/markdown': patch
---

Memoize `decodeDocument` on a `WeakMap` keyed by the wire object, so decoding the same compiled markdown module again returns the document from the first decode. A module's wire object is immutable build output and the decode is deterministic, so a cached document can never disagree with a fresh one, and each entry is collected along with the module holding its key. Calling `decodeDocument` from a view no longer re-decodes on every render, and consumers no longer need a cache of their own.
