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
- **minor**: New features, non-breaking API additions
- **major**: Breaking changes to public APIs

## For Maintainers

When changesets are merged to main, a "Version Packages" PR is automatically created. Merging that PR will:

1. Update package versions
2. Update CHANGELOG.md files
3. Publish to npm
4. Create GitHub releases
