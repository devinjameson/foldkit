# Release Package

This project uses [changesets](https://github.com/changesets/changesets) for versioning and releases.

## Adding a Changeset

When you make a change that should be released, run:

```bash
pnpm changeset
```

This will prompt you to:

1. Select which packages are affected (foldkit, create-foldkit-app, @foldkit/vite-plugin)
2. Choose the bump type (patch/minor/major)
3. Write a summary of the change

Commit the generated changeset file with your changes.

**Note:** The project formatter converts double quotes to single quotes in changeset YAML frontmatter. Use single quotes when writing changesets: `'foldkit': minor`.

## Version Guidelines

- **patch** - Bug fixes, documentation updates, internal refactors
- **minor** - New features, non-breaking API additions
- **major** - Breaking changes to public APIs

## Release Process

Releases happen automatically via GitHub Actions:

1. Push changes with changeset files to main
2. GitHub Action creates a "Version Packages" PR
3. Merge that PR to trigger:
   - Version bumps in package.json files
   - CHANGELOG.md updates
   - npm publishing (via trusted publishing/OIDC)
   - GitHub release creation

## Manual Release (if needed)

If automation fails, you can release manually:

```bash
pnpm version-packages  # Apply changesets to versions and changelogs
pnpm release           # Build all packages and publish to npm
```

Note: Manual publishing requires npm login with appropriate permissions.
