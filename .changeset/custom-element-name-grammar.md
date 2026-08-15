---
'foldkit': patch
---

`CustomElement.define` now validates a tag beyond the hyphen requirement. A name carrying characters outside a conservative custom-element name grammar, such as `My-Element` or one with markup characters, throws at define time, as do the specification's reserved names such as `annotation-xml` and `font-face`. The accepted set is a conservative subset of the full custom-element grammar rather than an exact match for every name the browser allows.
