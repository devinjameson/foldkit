# Releasing

Package-dependent website deployments begin only after an actual package
publication. `release.yml` reads the `published` output from Changesets and
calls `deploy-website.yml` only when publication succeeded. It passes the
published commit as the authorization point. The deployment selects the latest
eligible descendant on `main`, freezes that SHA, and verifies that every
package source tree still matches its published tag. A release workflow that
only creates or updates the Version Packages pull request cannot authorize a
deployment.

Website-only pushes still deploy directly. Before they do, the deployment
planner checks every package the website bundles against the release tag for
the exact version in its manifest. This is deliberately based on the whole tree,
not only the latest push. If an earlier commit left package work unpublished, a
later website-only commit cannot accidentally carry that work to production.

## The sequence

1. **Merge the Version Packages pull request.** The resulting release commit
   runs `release.yml`. Changesets builds and publishes the versioned tarballs.

2. **Authorize a deployment target.** A successful publish calls the reusable
   website deployment with the release commit SHA. The workflow selects the
   latest eligible `main` descendant and freezes it as the target. The release
   commit must be its ancestor, and each package tree must match its exact
   release tag before the deployment job can start.

3. **Wait for registry visibility.** `check:published-versions --wait` checks
   every version the playground manifests name. It then runs normal npm installs
   for both the previous Foldkit and plugin release lines and the newly
   published lines. Neither install uses `--legacy-peer-deps` or another peer
   override.

4. **Build what visitors receive.** The deployment writes the exact transformed
   SSG playground to a disposable project, installs its generated manifest, and
   runs its own `npm run build`. The normal example, website, and prerender
   builds follow.

5. **Deploy and smoke production.** Vercel deploys the site to production. A
   gate first waits until `foldkit.dev` serves the frozen target's build id. A
   Chromium run then opens the live SSR and SSG playgrounds, waits through npm
   installation and Vite startup, and exercises one hydrated interaction in
   each preview. Website-only deployments pass through the same production
   smoke.

If registry propagation, peer resolution, the transformed SSG project, the
production deploy, or either live playground fails, the workflow is red at the
boundary that failed. The live smoke necessarily happens after production has
been updated, so a failure there requires a follow-up deployment rather than
preventing the completed upload.

## Why the order matters

Deploying a release-backed website before npm sees its packages ships manifests that
fail with `ETARGET`. Publishing a peer-floor change as a patch can break an old
caret range without anyone redeploying the site. The playground manifests pin
exact versions, and the plugin peer-floor release takes a new minor line, so the
site moves only when a release-backed deployment moves it.
