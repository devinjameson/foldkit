---
'foldkit': patch
---

`CustomElement.define` now rejects a tag that contains characters outside the custom-element name grammar, not only a tag missing its required hyphen. A name such as `My-Element` or one carrying markup characters throws at define time, matching what `customElements.define` accepts in the browser.
