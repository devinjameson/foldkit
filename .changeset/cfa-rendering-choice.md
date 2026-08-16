---
'create-foldkit-app': minor
---

Add a rendering choice to scaffolding: pass `--rendering spa|ssg|ssr`, or omit it to choose in the interactive picker, where SPA is the default and keeps the example selection. SSG scaffolds a routed app with a server entry, a prerender script, and a build that writes every route as hydratable static HTML. SSR scaffolds a cookie-driven app with a server entry and an Effect `HttpServer` host started with `start`. Both hydrate through the same client entry contract the examples use.
