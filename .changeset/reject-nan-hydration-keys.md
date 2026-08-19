---
'foldkit': patch
---

Reject `NaN` element keys in hydratable server output because they cannot identify the same element across renders. Hydration key and view-identity markers are now documented as public, non-cryptographic fingerprints rather than one-way digests.
