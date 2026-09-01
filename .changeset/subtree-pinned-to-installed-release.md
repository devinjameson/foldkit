---
'create-foldkit-app': patch
---

Pin the recommended Foldkit subtree to the installed release instead of `main`, which can be ahead of the installed packages. The scaffolder's success message vendors `repos/foldkit` at the exact release it installs: the `foldkit@<version>` git tag for a stable release, the source commit for a canary. The `FOLDKIT.md` template derives the tag from the version in `node_modules/foldkit/package.json` at run time and points canary installs at the source commit their version names.
