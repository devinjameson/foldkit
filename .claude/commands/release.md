# Release Package

Release a package to npm with version bump, git tag, and GitHub release.

## Workflow

1. **Select package** - Ask which publishable package to release:
   - `foldkit` (packages/foldkit)
   - `create-foldkit-app` (packages/create-foldkit-app)
   - `@foldkit/vite-plugin` (packages/vite-plugin-foldkit)

2. **Select version bump** - Ask for bump type:
   - `patch` (bug fixes)
   - `minor` (new features)
   - `major` (breaking changes)

3. **Bump version** - Update the package.json version field

4. **Build package** - Run the package's build script

5. **Commit** - Create a commit with message: `release: <package>@<version>`

6. **Tag** - Create git tag using these formats:
   - For `foldkit`: `v<version>` (e.g., `v1.0.0`)
   - For other packages: `<package>@<version>` (e.g., `create-foldkit-app@1.0.0`)

7. **Push** - Push commit and tag to origin

8. **GitHub Release** - Create a GitHub release from the tag using `gh release create`

9. **Publish to npm** - Use 1Password CLI for OTP:
   `npm publish --otp=$(op item get "npm" --otp)`

## Important Notes

- Ensure working directory is clean before releasing
- The package must build successfully before publishing
- OTP is fetched automatically via 1Password CLI (`op`)
- Do NOT use `--prerelease` flag for GitHub releases (even for canary versions)
