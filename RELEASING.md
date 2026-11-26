# Releasing

shotdoc is published to npm as `shotdoc`. It stays below 1.0.0 until the project calls it stable, and the README says so.

## Before a release

1. Be on `main`, up to date, with a clean working tree.
2. Run the checks:

   ```sh
   npm run format
   npm run lint
   npm run typecheck
   npm test
   npm run smoke:package
   ```

3. Look at what would be published:

   ```sh
   npm publish --dry-run
   ```

   It should name the version you expect and list only `dist/`, `README.md`, `package.json` and `LICENSE`.

## Publishing

Publishing needs an npm account that can publish `shotdoc`, with two-factor authentication.

1. Set the version. For the first release, `package.json` already says `0.1.0`. After that, `npm version patch` (or `minor`) updates `package.json` and creates a `vX.Y.Z` commit and tag, both only on your machine until you push them (step 3).
2. Publish:

   ```sh
   npm publish
   ```

   npm asks for a one-time password. It runs `prepublishOnly` (the tests) first, so a failing test stops the publish before anything is uploaded, and then `prepack`, which compiles, so the package is never stale.
3. Make sure the published commit and its tag are on GitHub. After `npm version`, push both:

   ```sh
   git push origin main --follow-tags
   ```

   If `main` does not accept direct pushes, push the version commit through a pull request and tag the commit that was published. For the first release, `npm version` was not used, so tag it yourself:

   ```sh
   git tag v0.1.0
   git push origin v0.1.0
   ```

4. Create a GitHub release for the tag, with the notes for that version.
5. Check the package page on npmjs.com, including that the README's links work.

## A bad release

A published version cannot be republished or edited. Publish a fixed version, then mark the bad one:

```sh
npm deprecate shotdoc@0.1.0 "Broken: use 0.1.1"
```

## Publishing from CI

Trusted publishing lets a GitHub Actions workflow publish without a stored token. It is configured on npmjs.com for a package that already exists, so the first release is manual. Follow npm's documentation on trusted publishing for the current steps, as they change; this file deliberately does not repeat them. Adding a release workflow is a separate change.
