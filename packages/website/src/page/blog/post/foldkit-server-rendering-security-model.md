---
title: Foldkit Server Rendering Security Model
description: Trust boundaries, hydration ownership, build ids, refusal containment, host responsibilities, and the limits of Foldkit's experimental server-rendering contract.
date: 2026-08-18
---

Server rendering crosses boundaries that a client-only application never has to cross. A server turns a Model into an HTML string. A browser parser turns that string into a DOM. A client bundle loaded later then decides whether it can take ownership of nodes it did not create.

Foldkit treats that transition as a protocol. The server publishes HTML and handoff data. The browser checks that data before it takes ownership of the DOM. Matching DOM is adopted in place, local disagreements are patched or rebuilt, and an invalid handoff is refused.

This guide explains the security model behind that protocol. It covers what Foldkit checks, what the application and host still own, and where the boundary ends. The API remains experimental under `foldkit/experimental/server` because these contracts still need production experience.

```diagram
request → host → server entry → renderToString
           │          │               │
        target      Flags        HTML + public handoff
                                        │
                                        ▼
                                 cache/CDN → browser

browser checks before DOM ownership:
  matching            → adopt → live app
  local disagreement  → patch or rebuild → live app
  invalid handoff     → refusal
```

## The trust model

Foldkit assumes that the application code, server entry, HTML template, client bundle, and deployment configuration are trusted. If an attacker can replace the client bundle or edit the template, hydration markers cannot restore that trust. They are comparison data, not signatures.

The request is not trusted. A visitor may control its URL, headers, cookies, and body. The server entry must authenticate the visitor, authorize the operation, validate request data, and decide what may become Flags. A Flags Schema checks the shape of the value that crosses the handoff. It does not decide whether the visitor was allowed to receive that value.

Cached HTML is also not assumed to be current. A page may outlive the deployment that rendered it. Foldkit can detect one important stale-page case, but cache policy and deployment ordering remain part of the security model.

The public boundary is visible in the [`renderPage(Request)` server entry](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/examples/ssr/src/entry.server.ts) and the [production SSR host](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/examples/ssr/server/main.ts). The entry owns application policy. The host owns delivery.

## Serialization

Ordinary Foldkit builders keep data separate from markup. Text is escaped as text. Attribute values are escaped inside quoted attributes. Invalid tag and attribute names are rejected. In text, attributes, comments, and raw-text content, values that cannot survive UTF-8 encoding and HTML parsing unchanged, such as NUL and unpaired surrogate code units, are rejected instead of silently changing.

Typed `h.Href`, `h.Src`, `h.Action`, and `h.Formaction` also neutralize `javascript:` and `vbscript:` schemes, including schemes hidden with control characters. This is a sink-specific guard, not a complete application URL policy. For example, `data:` URLs remain available. Validate or allowlist URLs when their source is untrusted and the application needs a narrower policy.

The serializer then checks browser parse equivalence. HTML, SVG, MathML, raw-text elements, form controls, Custom Elements, and document-level parser states do not all follow the same rules. Foldkit refuses markup when the browser would drop, split, move, or reinterpret the application tree. Template insertion performs another structural check in the context where the root will appear.

[`serialize.ts`](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/experimental/server/serialize.ts) contains the escaping and element-specific rules. [`server.test.ts`](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/experimental/server/server.test.ts) exercises parser equivalence in both scripting modes, and [`template.test.ts`](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/experimental/server/template.test.ts) covers insertion into the page shell.

### Raw HTML and raw attributes

`h.InnerHTML` is a trust declaration. Foldkit emits its value as markup. It rejects scripts, live `<base>` elements, document-structure mutations, raw-text breakouts, and other cases that would make the server and browser disagree. Those refusals do not make arbitrary HTML safe. They protect the handoff protocol, not the provenance of the markup.

A raw `h.Attribute` is the corresponding escape hatch for attributes. Foldkit still escapes its value inside the quoted attribute, but it does not apply the semantics of a typed builder, including typed URL sanitization. SVG and MathML sometimes require raw attributes because their DOM properties do not reflect like HTML properties. Values passed through either escape hatch must already be trusted or sanitized for that exact sink.

`h.Srcdoc` is another HTML sink. Foldkit escapes the outer attribute correctly, then the browser parses its value as a nested document. Treat that value as trusted HTML and apply an iframe sandbox policy when the embedded document should not share the parent page's capabilities. An ordinary `h.script` element likewise contains application code, not data Foldkit sanitizes.

`h.Style` keeps a value inside one CSS declaration. It does not make attacker-controlled CSS safe. A CSS value can still request a remote resource or obscure the interface. Apply an application policy before passing untrusted values to it.

The boundary has regression coverage for [typed URL builders](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/experimental/server/serialize.test.ts#L673-L698), [scripts and raw-text breakouts](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/experimental/server/serialize.test.ts#L453-L519), and [`h.InnerHTML` that changes the surrounding document](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/experimental/server/server.test.ts#L1231-L1400).

## Public handoff data

A hydratable page carries protocol data in its HTML:

- `data-foldkit-app` identifies the application root.
- `data-foldkit-build` identifies the deployment that rendered the page.
- `data-foldkit-flags` associates the JSON Flags payload with that application.
- `data-foldkit-key` and `data-foldkit-identity` let hydration compare logical VNode ownership before adopting an element.

All five are public. The Flags payload is public JSON in the page source. Flags are not a place for access tokens, credentials, or data the visitor is not allowed to read.

For a hydratable render, Foldkit Schema-encodes the Flags, serializes them as JSON, and escapes `<` as `\u003c` so a request-derived string cannot close the `application/json` script element. The server parses and Schema-decodes that exact JSON before `init`. The browser repeats the parse and decode before its own `init`. If server encoding or decoding fails, rendering fails before a page is produced. If browser decoding fails, hydration is refused. When both succeed, both `init` calls receive the same public value.

Keys and view identities are represented by digests so the original value or source path does not appear directly. The digest is still only an equality token. A reader who can guess a low-entropy key can hash candidates and compare them. Do not treat a marker as encryption, authentication, or a one-way commitment.

The [server encoding round trip](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/experimental/server/server.ts#L1224-L1279) and [browser decoding path](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/runtime/runtime.ts#L2085-L2110) enforce the Flags boundary. The marker construction lives in [`hydrationMarkers.ts`](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/hydrationMarkers.ts). Server regressions assert that raw keys and source identities do not appear in the rendered page in [`serialize.test.ts`](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/experimental/server/serialize.test.ts#L589-L617).

## Hydration ownership

The server and browser call the same `init` and view with the same Flags. Hydration compares the browser-parsed DOM with the first client VNode tree. When they agree, Foldkit adopts the existing elements. Their identity, focus, scroll position, media state, and other browser-owned state can survive while listeners and Mounts attach.

Adoption does not mean every byte of the original HTML must match. It means the parsed DOM represents the same application state and ownership. HTML attributes, DOM properties, and default form state can reflect one value in different ways. Foldkit compares the effective state it knows how to model.

The Model owns controlled form values. Text entered before hydration yields to a declared controlled value. An uncontrolled control keeps browser state when its DOM is adopted. Custom Elements keep state the view does not claim, but a view-owned light DOM subtree may require replacing the host so a fresh render and hydration follow the same lifecycle.

An attribute or property mismatch is normally patched on the adopted element. An incompatible structure, tag, namespace, key, or view identity rebuilds the affected subtree from its nearest safe parent. Rebuilding loses the old nodes and their browser state. That is recovery from a local disagreement, not a refusal of the whole handoff.

[`hydrate.ts`](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/hydrate.ts) implements adoption and mismatch recovery. Its [hydration regressions](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/hydrate.test.ts) cover DOM identity, keyed and view-owned subtrees, forms, raw HTML, SVG, MathML, and Custom Elements. The [packed-consumer gate](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/scripts/check-packed-ssr-consumer.ts) installs packed npm tarballs in a standalone project and repeats the critical path in Chromium, Firefox, and Playwright WebKit.

## Build skew and stale HTML

The build id does not make hydration correct. It makes hydration refuse when it would otherwise be incorrect.

The server stamps a deployment id on the root, and the client bundle carries the same id. Hydration compares them before reading the Flags payload or running `init`. A mismatch stops code from one deployment taking ownership of a page produced by another.

Imagine an old page has `<input name="email">` exactly where the new build puts `<input name="ssn">`. The tree may look compatible even though the field now means something else. Preserving a value entered before startup would attach old user state to the new meaning. View identity cannot reliably catch this because imported constants, configuration, and caller arguments can change without changing the view function's identity.

The id must be public, nonempty, shared by the client and server builds, and unique to one deployment. It must not contain a secret. Two deployments may share an id only when their code and every input that can affect rendered output are identical. Reusing one otherwise suppresses the protection without producing a warning.

The check has a limit. Cached old HTML usually points to its old content-hashed client bundle. Old HTML and old JavaScript carry the same id, so hydration accepts them. If the old asset is gone, the client never starts and Foldkit cannot refuse. Build ids catch mixed deployments. They do not replace cache invalidation, atomic deployment, or retaining old immutable assets long enough for cached pages to load.

The comparison occurs in [`runtime.ts`](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/runtime/runtime.ts#L699-L726) and again at the adoption boundary in [`hydrate.ts`](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/hydrate.ts#L1008-L1032). [`buildToken.ts`](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/vite-plugin-foldkit/src/buildToken.ts) compiles the deployment-supplied value into application code. The packed-consumer gate serves one build's HTML with another build's client and asserts that no DOM state crosses the boundary.

## Hydration refusal

Two things happen. Startup stops, and the page is put out of reach.

A build mismatch stops before Foldkit accesses the Flags payload text. A missing, duplicated, malformed, or Schema-incompatible Flags payload also stops before `init`. The refused boot starts no Command, Subscription, or ManagedResource. There is no application Model and no application recovery hook to call.

Foldkit marks the document body `inert`, `aria-hidden`, and `data-foldkit-refused`. It opens a nondismissable modal shield, moves focus to that shield, and prevents native keyboard activation in the same document after earlier capture listeners have run. The existing application subtree stays connected. Foldkit does not wrap or move it, close author dialogs, or reload embedded documents. Avoiding those mutations prevents refusal itself from reconnecting Custom Elements or reloading iframes.

Containment starts only when the current client detects the refusal. It cannot undo anything that happened earlier. The HTML parser may already have fetched resources or run scripts. A Custom Element may already have connected. A visitor may have interacted with served controls before the client loaded.

Containment is not a script sandbox. Timers, stale scripts, capture listeners, programmatic form submission, and browser-generated global events may still run. An iframe owns another document, so input inside it does not cross the parent document's guards. A script can also open new top-layer content after containment begins.

The containment implementation is in [`runtime.ts`](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/runtime/runtime.ts#L750-L871). The [packed browser gate](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/scripts/check-packed-ssr-consumer.ts#L1680-L2111) checks links, forms, focus, dialogs, Custom Element lifecycle counts, iframe document identity, and stale-build refusal across the three Playwright engines.

## The host boundary

`foldkit/experimental/server` provides low-level host primitives. It does not make every HTTP server safe by construction. The production host still decides which request reaches the application, which response can be cached, and which browser security policy applies.

| Concern              | Foldkit primitive                                       | Host responsibility                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request target       | `resolveRequestUrl`                                     | Resolve against a configured origin. Do not derive trust from a client-controlled `Host` header. Reject off-origin, credential-bearing, or unparseable targets.                                          |
| Assets and pages     | `resolvesToIndexHtml`, `classifyRequest`, `acceptsHtml` | Route the application template to rendering. Serve other built assets before page fallback. On a static miss, return 404 for an asset-like request and render a page fallback only when it accepts HTML. |
| HTTP methods         | `isHostSettledMethod`                                   | Let application methods, including `OPTIONS`, reach the server entry. Define CORS in application code. Answer methods the Web `Request` boundary cannot represent.                                       |
| Cache variation      | `varyWith`, `varyWithAccept`                            | Preserve every field used for content negotiation. Use `private`, `no-store`, or an exact shared-cache policy when Flags depend on a visitor.                                                            |
| Template and headers | `toResponse`, `injectIntoTemplate`                      | Keep the template trusted. Set CSP, HSTS, cookie attributes, framing policy, referrer policy, and any platform-specific headers.                                                                         |

An SSR route personalized from a cookie must not enter a shared cache as a public page. An SSG file has no response object, so the static host or CDN must add its headers. A Vite development response is not proof that a production proxy, serverless platform, or CDN applies the same policy.

The primitives and their unit tests live in [`host.ts`](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/experimental/server/host.ts) and [`host.test.ts`](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/packages/foldkit/src/experimental/server/host.test.ts). The [SSR example host](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/examples/ssr/server/main.ts) shows how the pieces fit together. [`check-host-parity.ts`](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/scripts/check-host-parity.ts) compares development and production behavior for the same server entry.

## Deployment

Server rendering turns a deployment into one protocol release. The client bundle, server bundle, template, public assets, build id, and package versions have to agree.

Build the client and server with one nonsecret deployment id. Pin the exact Foldkit and Vite plugin versions used by the deployment. Publish packages before deploying a website or playground that installs them. Verify registry visibility before the site build begins. Keep content-hashed assets immutable, and avoid serving HTML from one deployment beside assets from another.

Observe refusals. Every refused boot reports a `[foldkit]` error, and `data-foldkit-refused` remains on the body for monitoring or styling. A rise after a deployment usually points to cache skew, a service worker, a partial rollout, an invalid Flags payload, or an ambiguous or missing root stamp.

Foldkit's own sequence is documented in [`RELEASING.md`](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/RELEASING.md). The [release workflow](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/.github/workflows/release.yml) publishes packages before it calls the [website deployment workflow](https://github.com/foldkit/foldkit/blob/6c71a9017907ad780c9a546b4c891c5d0626c942/.github/workflows/deploy-website.yml), which verifies published versions and smokes the live SSR and SSG playgrounds.

## What the model does not promise

The boundary is deliberately narrower than a general browser-security system:

- The build id and hydration markers do not authenticate HTML or JavaScript.
- Flags encoding does not authorize access to the encoded data.
- `h.InnerHTML` and raw attributes do not sanitize untrusted values.
- Containment does not stop stale or hostile scripts that already run in the page's origin.
- Foldkit cannot refuse when the client bundle never loads.
- Custom Element callback code is trusted. Hydration resamples retained element and text state after callbacks, but it does not sandbox the callback or rescan arbitrary document structure changed outside the host.
- One page-owning application per document is the supported arrangement. Distinct runtime ids do not divide document metadata, navigation listeners, or other global ownership safely.
- The browser matrix runs Chromium, Firefox, and Playwright WebKit. It is not a substitute for testing real Safari and iOS Safari before the API leaves `experimental`.
- The host remains responsible for authentication, authorization, CORS, cache policy, cookies, CSP, TLS termination, resource limits, logging, and incident response.

Regression tests cover the parser, hydration, lifecycle, and host cases linked above. They cannot prove that no browser difference or application-specific integration bug remains. That residual risk is one reason the API is experimental.

## Application review checklist

Before deploying a Foldkit SSR or SSG application:

- Validate the request before deriving Flags. Put no secret or unauthorized value in Flags.
- Prefer typed builders. Treat `h.InnerHTML`, `h.Srcdoc`, executable script content, raw attributes, and untrusted CSS values as trusted-code boundaries.
- Generate one public build id per deployment and pass it to both builds.
- Pin exact framework and plugin versions, then test an upgrade against the built host.
- Configure the host origin explicitly. Route the application template to rendering, serve other assets before page fallback, and return 404 for missing assets.
- Set CORS, cache, cookie, CSP, and other response policies for the actual production host.
- Test served HTML with JavaScript disabled, matching hydration with DOM identity assertions, local mismatch rebuilding, and stale-build refusal.
- Smoke the deployed SSR or SSG route after publication. Watch `[foldkit]` errors and `data-foldkit-refused` in production.

The [Server Rendering reference](/core/server-rendering) covers the APIs and supported markup in detail. The model to keep in mind is smaller: the server publishes a public handoff, the browser checks it before taking ownership, and the host remains part of the system.
