---
'foldkit': patch
'@foldkit/ui': patch
'@foldkit/devtools': patch
'create-foldkit-app': patch
'@foldkit/vite-plugin': patch
'@foldkit/devtools-mcp': patch
'@foldkit/markdown': patch
---

Use full Effect module names in published source, examples, templates, and documentation. JavaScript and TypeScript globals that share an Effect module name are now qualified through `globalThis`.
