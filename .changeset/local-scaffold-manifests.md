---
'create-foldkit-app': patch
---

Accept an absolute `CREATE_FOLDKIT_APP_DEPENDENCY_MANIFESTS_DIRECTORY` for repository verification. The SSR and SSG scaffold gate now generates from the example manifests in the checkout under test instead of the moving `main` branch.
