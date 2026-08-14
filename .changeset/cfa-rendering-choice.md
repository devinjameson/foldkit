---
'create-foldkit-app': minor
---

Add a rendering choice to scaffolding: `--rendering spa|ssg|ssr` (or the interactive prompt). SPA stays the default and keeps the example picker. SSG scaffolds a routed app with a server entry, a prerender script, and a build that writes every route as hydratable static HTML. SSR scaffolds a cookie-driven app with a server entry and an Effect `HttpServer` host started with `start`. Both hydrate through the same client entry contract the examples use.
