---
'@foldkit/markdown': patch
---

Show the imports in every README snippet. The setup, render, islands, and `parseMarkdown` examples used `defineConfig`, `tailwindcss`, `foldkit`, `h`, `S`, and `islandAttributes` without showing where they came from. The shared island module is now named, so the Vite config and view snippets import from it concretely, and the two view fragments are wrapped in functions so `h` has a visible origin. Documentation only, no API changes.
