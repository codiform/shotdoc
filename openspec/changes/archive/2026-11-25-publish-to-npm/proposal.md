# Proposal

## Why

shotdoc is ready for people to try, and the author wants to test a versioned, repeatable release (starting with the work-project trial) rather than a checkout. Today the package is not publishable as it stands: no license, none of the metadata npm shows, an `engines` floor of Node 20 (end of life since April 2026), no check that the packed tarball contains what it should and runs when installed, and nothing that builds before a pack or publish, so a stale `dist/` could ship.

## What Changes

- Publish as the unscoped package `shotdoc`, starting at `0.1.0`, which signals "usable, not yet stable".
- Add an MIT `LICENSE` (copyright Codiform) and the package metadata npm shows: `license`, `repository`, `homepage`, `bugs`, `author`, `keywords`.
- Raise `engines` to Node `>=22` and run CI on Node 22, 24 and 26.
- The published package contains only `dist/`, the README, `package.json` and `LICENSE`. A test enforces this, so a saved session or an example can never be packed.
- A smoke test installs the packed tarball into an empty directory and runs it: `shotdoc --help`, a failing validation, and a real build of a local page.
- `npm pack` and `npm publish` build first (`prepack`), and publish also runs the tests (`prepublishOnly`).
- README: a status note near the top, an Install section, Chromium stated up front, Node 22; contributor-only text (`build:examples`) moves to a new `CONTRIBUTING.md`.
- `RELEASING.md` documents the first manual publish (2FA) and the tag.

Out of scope: publishing from CI (trusted publishing is set up after the first manual publish exists), a changelog or version-bump tool, a scoped package name, and the actual `npm publish`, which the author runs.

## Capabilities

### New Capabilities

- `package-distribution`: what the published package contains, that it runs when installed, the metadata and Node versions it declares, and that publishing cannot ship stale output.

### Modified Capabilities

None. No existing capability's requirements change.

## Impact

- `package.json`, new `LICENSE`, `CONTRIBUTING.md`, `RELEASING.md`, `README.md`, `.github/workflows/ci.yml`.
- A new test (`test/package.test.ts`) and a smoke script (`scripts/smoke-package.mjs`).
- No source changes under `src/`; no new runtime dependency.
