---
'foldkit': patch
---

Enforce one active page-owning application per document. A second `makeApplication` startup now fails before it reads HMR state, compares build ids, decodes Flags, or runs `init`. It leaves the active page unchanged. Foldkit keeps ownership until runtime cleanup finishes. Independently bundled copies that include this rule share the same claim.

Runtime startup also rejects detached containers and containers owned by another document. `makeApplication` additionally requires a connected container under the current document body light DOM, while `makeElement` continues to support connected shadow-root containers.

Embedded runtimes now report unhandled startup failures through Effect's logger instead of terminating their background fiber silently.
