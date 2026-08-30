# Roadmap

## Current Goal

Foldkit is pre-1.0, and the current goal is a production-ready 1.0. Everything in flight serves that release. Larger directions wait until the core is stable.

Day-to-day work is tracked at ticket granularity in a private tracker, where priorities can change without making this page stale. This page records the durable plan: the work that gates 1.0, features already available behind an experimental boundary, and directions that may follow. [GitHub issues](https://github.com/foldkit/foldkit/issues) are the public place for bugs and feature requests.

## The Path to 1.0

1.0 is a stability commitment, not a feature milestone. It means the public API is locked under semver, real applications have put the framework under pressure, and the claims in these docs have published evidence behind them. The remaining work is grouped into these blocks, roughly in order:

- **Framework capability:** finish the surface that applications cannot be built without. This work is in progress.
- **Framework quality:** close correctness gaps before downstream work depends on them. That includes coverage for newer primitives and consistent patterns across UI components and example applications.
- **Real-world stress tests:** build example applications in the domains early adopters are likely to explore. Treat every framework gap they expose as a framework bug.
- **Benchmarks:** rendering comparisons are already published on the [Performance](/faq/performance) page. The remaining work is reproducible evidence for TypeScript compilation and Runtime throughput, held to the same standard.
- **Audits and developer experience:** audit Foldkit UI against WCAG with real screen readers, add axe-core regression checks to CI, and improve Runtime and type-level errors when an API is misused.
- **Documentation:** publish a page for every core concept, an accessibility section for every UI component, and an end-to-end tutorial that builds a non-trivial application.
- **Release:** lock the public API, publish the semver commitment, empty the bug backlog, write the 0.x to 1.0 migration guide, and cut a burn-in release before tagging 1.0.

## Experimental Server Rendering

Build-time static generation and per-request server rendering are available today behind `foldkit/experimental`. Both use `Server.renderToString` and the same explicit hydration handoff through `Runtime.hydrate`.

The [build-time SSG](/core/server-rendering#build-time-ssg) and [request-time SSR](/core/server-rendering#request-time-ssr) sections cover each deployment model. The experimental boundary allows this surface to change before 1.0 without weakening the stability commitment for the core API.

## Directions After 1.0

These are areas for exploration, not commitments:

- **Commands on the server:** a Command whose Effect runs on the server, allowing an application to reach a database or private service without a separate API layer. The client would still dispatch a Message and wait for the result.
- **Rendering beyond the DOM:** the Elm Architecture does not depend on a browser. A terminal renderer is the first candidate for another target.
- **Libraries outside core:** core remains the architecture: the Runtime, routing, and lifecycle primitives. Higher-level concerns are likely to ship as libraries around Foldkit, as Foldkit UI already does.

## Settled Boundaries

Two decisions will survive 1.0.

Foldkit will not split the view into server and client halves in the style of React Server Components. A Foldkit view remains one function of one Model. The server-client boundary stays at data and hydration, not inside the view tree. There are no `'use client'` or `'use server'` annotations and no second data-fetching model.

Foldkit will not adopt JSX. [Why no JSX?](/faq/why-no-jsx) explains the type-system constraint behind that decision.

## Following the Roadmap

Releases land continuously, and every change is recorded in the [changelog](https://github.com/foldkit/foldkit/blob/main/packages/foldkit/CHANGELOG.md). Bugs and feature requests live in [GitHub issues](https://github.com/foldkit/foldkit/issues). For questions and discussion, join the [Discord](https://discord.gg/kav8VNxqGm).
