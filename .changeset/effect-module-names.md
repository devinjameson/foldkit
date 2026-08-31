---
'@foldkit/oxlint-plugin': minor
---

Add the recommended `foldkit/prefer-effect-module-names` rule. It reports PascalCase modules imported from `effect` under abbreviated or trailing-underscore aliases and safely fixes aliases when the exported name is available. Qualify a same-named JavaScript or TypeScript global through `globalThis`. An explicit conflict alias such as `Order as EffectOrder` remains valid when an existing local or public binding must keep the module name.

Projects that want to keep Effect module aliases can disable the rule:

```json
{
  "rules": {
    "foldkit/prefer-effect-module-names": "off"
  }
}
```
