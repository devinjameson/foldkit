# Releasing

Foldkit uploads and promotes a release in separate steps. Uploads use npm
trusted publishing and provenance. Promotion uses an interactive npm session
with 2FA because npm trusted-publishing OIDC does not authorize `npm dist-tag`.

The split prevents `latest` from moving while only part of the public package
set exists. It also keeps a long-lived npm token out of GitHub Actions.

## Stable packages

1. Merge the Version Packages pull request.

2. Wait for the Release workflow's stable job. The coherent uploader discovers
   every public package from the pnpm workspace manifests. It builds and packs
   every untagged release version, then uploads them one at a time under the
   commit-specific non-consumer tag such as
   `foldkit-stable-upload-0123456789ab`. A rerun skips a matching version that
   npm already has and rejects one whose registry integrity differs.

3. Check that the stable job passed. The last upload is not enough. The job
   fetches the complete public package set from npm and checks each internal
   dependency and peer range against the versions in this release. Changesets
   receives its `New tag:` output only after that complete check passes.

4. Check out the release commit and sign in to npm with 2FA. Run:

   ```sh
   pnpm release:promote
   ```

   The command repeats the complete registry check and reads every current
   `latest` manifest before moving any tag. It computes a promotion path where
   every intermediate mixture of old and new tags satisfies all internal
   dependency and peer ranges. It prefers `create-foldkit-app` first because
   that self-contained CLI already uses the exact uploaded versions. If no safe
   path exists, the command stops without changing a tag. Publish an overlap
   release whose ranges accept both snapshots, or keep consumers on exact
   versions until npm supports atomic multi-package promotion.

   If a command or network request fails after promotion starts, run the same
   command again. Tags already on the intended version are skipped. A tag on a
   newer version stops the command before any tag is moved backward.

5. Finalize the release with the command printed by `release:promote`:

   ```sh
   gh workflow run release.yml -f published_commit=$(git rev-parse HEAD)
   ```

   The dispatch verifies every registry version and every `latest` tag from
   scratch. Only then can the production website deployment start.

## Package canaries

The Release workflow also builds a canary for every package-affecting push to
`main`. Every public package receives a prerelease version containing the
commit SHA, for example `0.148.2-canary.0123456789ab`. Internal package
references are rewritten to those exact versions before packing.

Canaries use a commit-specific non-consumer tag such as
`foldkit-canary-upload-0123456789ab` only for upload. The workflow does not
advertise a moving npm `canary` tag. After the complete registry check passes,
the workflow summary prints every exact package version and the exact
`create-foldkit-app` command. Rerunning a commit uses the same versions and
skips artifacts that already match.

## create-foldkit-app inputs

`create-foldkit-app` carries its scaffold sources in the package tarball. The
build copies every supported example, the rendering overlays, and a release
manifest into `dist/templates`. The manifest records the source commit and the
complete public package version map.

The CLI reads those bundled files at runtime. It does not fetch example files
from GitHub `main`, and it does not resolve Foldkit packages through npm
`latest`. A stable CLI therefore scaffolds its own released sources and exact
package versions. A canary CLI does the same with its commit-addressed package
snapshot.

The repository-only
`CREATE_FOLDKIT_APP_DEPENDENCY_MANIFESTS_DIRECTORY` override remains available
for scaffold verification. It can replace the bundled example manifests under
test, but it does not replace the CLI's release version map.

## New public package names

The coherent uploader refuses any package name npm has never published. npm can
assign `latest` during a first publication even when a different upload tag was
requested. That behavior would expose the new package before the complete
snapshot passed verification.

Bootstrap a new package name before adding its non-private manifest to the
workspace release set. Publish the intended initial stable version manually
with an interactive npm account and 2FA, accepting that this deliberate first
release establishes `latest`. Then configure `release.yml` as the package's
trusted publisher and add its public manifest to the workspace. Do not let a
canary workflow perform the first publication. Discovery will include the new
package automatically, and the omission gate will prevent a partial coherent
set.

## Authentication constraints

npm's trusted-publishing documentation limits OIDC authentication to
`npm publish` and `npm stage publish`. It does not authorize `npm dist-tag` or
interactive staged approval. See:

- <https://docs.npmjs.com/trusted-publishers/>
- <https://docs.npmjs.com/cli/commands/npm-dist-tag/>
- <https://docs.npmjs.com/staged-publishing/>

Do not add an npm token to automate promotion without a separate security
decision. Package upload must continue through the trusted `release.yml`
workflow so npm generates provenance for each public tarball.

## Website deployment

The production website does not deploy when the quarantine upload finishes.
The finalization dispatch first proves that every intended version is on npm
and every `latest` tag points to it. The existing website gate then checks the
playground versions, normal npm peer resolution, package-source release tags,
the generated SSG project, and the live SSR and SSG playgrounds before the
deployment completes.

Website-only pushes still use the normal production deployment workflow. Its
package-source authorization prevents unreleased package work from reaching
the site.
