# Changesets

This project uses [changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

## For Contributors

When you make a change that should be noted in the changelog, run:

```bash
pnpm changeset
```

This will prompt you to:

1. Select which packages are affected
2. Choose the bump type (major/minor/patch)
3. Write a summary of the change

A markdown file will be created in `.changeset/` - commit this with your PR.

## Version Guidelines

- **patch**: Bug fixes, documentation updates, internal refactors
- **minor**: New features and public breaking changes while Foldkit is pre-1.0
- **major**: Reserved for the eventual 1.0 release and post-1.0 breaking changes

## For Maintainers

When changesets are merged to main, a "Version Packages" PR is automatically created. Merging that PR will:

1. Update package versions
2. Update CHANGELOG.md files
3. Publish to npm
4. Create GitHub releases

The release workflow coalesces rapid merges and publishes a canary snapshot for
the newest main commit. Every public package in the snapshot uses the same
version, which includes the full Git commit. This keeps internal peer
dependencies aligned when testing the snapshot in another project.

For a new project, run the canary scaffolder:

```bash
pnpm create foldkit-app@canary
```

The canary scaffolder reads examples from its encoded Git commit and installs
the exact shared version of every Foldkit package the project needs.

For an existing project, resolve the channel version once and install that
exact version for each Foldkit package the project uses. For example:

```bash
CANARY_VERSION="$(npm view create-foldkit-app@canary version)"
pnpm add "foldkit@$CANARY_VERSION" "@foldkit/ui@$CANARY_VERSION" "@foldkit/vite-plugin@$CANARY_VERSION"
```

Do not install `foldkit@canary` directly. `create-foldkit-app` is the only
moving canary channel. The other packages use snapshot-specific tags and must
be installed at the resolved exact version.

`create-foldkit-app@canary` moves only after npm confirms every package in the
snapshot is available. If publication stops partway through, the previous
canary remains advertised. Canary publishing does not change any package's
`latest` npm tag.
