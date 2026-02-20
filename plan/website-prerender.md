# Website Prerendering

## Problem

foldkit.dev is an SPA. Crawlers (Google, Twitter, Slack, Discord) see an empty HTML shell, which breaks SEO and social card previews. Prerender.io solves this but costs $49/mo — overkill for a small docs site with known routes.

## Solution

A build-time prerender script that runs after `vite build`. It launches a headless browser, visits each known route, captures the rendered HTML, and writes it to disk as static files. Crawlers get fully rendered HTML; real users get the SPA experience as usual.

## Build Pipeline

```
pnpm docs → vite build → prerender script → deploy
```

The prerender step slots between the existing build and deploy. The `build` script in `packages/website/package.json` becomes:

```
vite build && node prerender.mjs
```

## How It Works

1. Start a local static server serving `dist/`
2. Launch a headless browser (Playwright)
3. For each known route:
   a. Navigate to `http://localhost:PORT/<route>`
   b. Wait for content to render (poll for `#root` having children, or a `window.__PRERENDER_READY` flag)
   c. Grab the full `document.documentElement.outerHTML`
   d. Write it to `dist/<route>/index.html`
4. Shut down browser and server

## Output Structure

Before prerender:

```
dist/
  index.html          (SPA shell)
  assets/
```

After prerender:

```
dist/
  index.html                        (prerendered /)
  why-foldkit/index.html            (prerendered /why-foldkit)
  coming-from-react/index.html      (prerendered /coming-from-react)
  getting-started/index.html        (prerendered /getting-started)
  architecture-and-concepts/index.html
  routing-and-navigation/index.html
  project-organization/index.html
  advanced-patterns/index.html
  best-practices/index.html
  example-apps/index.html
  api/index.html
  assets/
```

## Route List

Hardcoded array sourced from `packages/website/src/route.ts`:

- `/`
- `/why-foldkit`
- `/coming-from-react`
- `/getting-started`
- `/architecture-and-concepts`
- `/routing-and-navigation`
- `/project-organization`
- `/advanced-patterns`
- `/best-practices`
- `/example-apps`
- `/api`

## Key Details

### Render Signal

The script needs to know when foldkit is done rendering. Options:

- **Option A:** Poll for `document.querySelector("#root").children.length > 0`
- **Option B:** Have the app set `window.__PRERENDER_READY = true` after initial render, script polls for it

Option A is simpler and avoids touching app code. Option B is more reliable for pages with async data (like `/api` which loads TypeDoc output).

### Theme

Force light mode during prerender for consistent crawler output. Can be done by setting `localStorage` theme preference before navigation or via a query param the app checks.

### Meta Tags

`document.title` is already set per route by foldkit, so it gets captured in the prerendered HTML automatically. Open Graph tags could be injected per page by the prerender script after capture, or handled in app code.

### The `/api` Route

Heaviest page (TypeDoc-generated API reference). Data is baked in at build time via the Vite virtual module, so it prerenders fine — may just need a longer wait timeout.

### Not Hydration

Foldkit doesn't have hydration. When the SPA JS loads, it replaces the prerendered DOM with a fresh render. This is fine because:

- Crawlers don't execute JS — they see the static HTML (the whole point)
- Real users get instant content paint from the prerendered HTML, then the SPA takes over
- The content is identical (same app, same route), so the visual swap is imperceptible
- True hydration is a separate future concern

## Dependencies

- `playwright` (dev dependency in `packages/website`)
- A simple static file server (Node's built-in `http` + `fs`, or `sirv`)

## Scope

- ~40-50 lines of code
- Lives entirely in `packages/website/` (build concern, not framework concern)
- No changes to foldkit core
- Replaces prerender.io ($49/mo → $0/mo)
- Gets deleted if/when foldkit gains real SSG support
