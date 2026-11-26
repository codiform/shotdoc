# Design

## Context

See proposal.md for why. `package.json` already has `bin` (`dist/cli.js`, which keeps its shebang through `tsc`), `files: ["dist"]` and `engines: >=20`. `npm pack --dry-run` shows 24 files and about 31 kB: `dist/`, the README and `package.json`. Both `shotdoc` and `@codiform/shotdoc` are unused on the registry. CI (`.github/workflows/ci.yml`) runs lint, typecheck, build, a Chromium install and the tests on Node 20 and 22. The README's Prerequisites already say to install Chromium. `build:examples` and the login section mention a repository-only script.

## Goals / Non-Goals

**Goals:**
- A tarball that is provably the intended content and provably runs when installed.
- A packing and publishing path that cannot ship stale output.
- Nothing about the first release depends on a CI secret or token.

**Non-Goals:**
- Automating publishing, versioning or a changelog.
- Any change under `src/`.

## Decisions

**Unscoped name, version 0.1.0 on the `latest` tag.** `npx shotdoc` is simpler than `npx @codiform/shotdoc`, the name is free and worth claiming now, and the org can be added as a maintainer. A `next` tag or a `-beta` suffix would hide the package from a plain install, which is more than "early release" needs; the 0.x version and a README note carry the message. A `^0.1.0` range only matches 0.1.x, so a minor bump cannot reach anyone unasked. *Alternative:* scoped. Rejected: longer to type, and there is no collision to avoid.

**Allowlist by `files`, guarded by a test.** `files: ["dist"]` already restricts the tarball; npm always adds `README.md`, `package.json` and `LICENSE`. `test/package.test.ts` runs `npm pack --dry-run --json --ignore-scripts` (so it does not build) and checks every packed path against that allowlist, and that `LICENSE` is present. Because it checks the list and not `dist/`'s contents, it passes whether or not `dist/` exists. *Alternative:* trust `files`. Rejected: a stray `files` edit or a symlink would go unnoticed, and a saved session is the one thing that must never ship.

**Smoke test of the installed tarball.** `scripts/smoke-package.mjs` packs into a temporary directory, installs the tarball into an empty project there, and runs the installed `shotdoc`: `--help`, a build of a document with an unknown step (non-zero, names the step), and a build of a document that visits a `file://` page and takes a screenshot, so no network is needed. The temporary project's `playwright` is installed at the version the repository itself uses, so the Chromium already installed for the tests matches. CI runs it after the build; `npm run smoke:package` runs it locally. *Alternative:* only test the repository checkout. Rejected: it cannot see a missing file, a wrong `bin` path or an undeclared dependency.

**Build on pack, test on publish.** `prepack` runs `npm run build`, so every `npm pack` (including the trial tarball) is freshly compiled; `prepublishOnly` runs `npm test`, so a failing test stops a publish before upload. `prepublishOnly` is not run by `npm pack`, which keeps the trial cheap.

**Node 22 floor, CI on 22, 24 and 26.** Node 20 is past end of life. 22 is the floor, 24 and 26 are the later LTS lines (26 is the one the author develops on). The floor will move to 24 when Node 22 reaches end of life in April 2027, which is one more reason to stay on 0.x until then.

**License and holder.** MIT, "Copyright (c) 2026 Codiform". MIT is accepted by company policies that reject a public-domain dedication, and the project has little patent exposure that Apache-2.0's grant would address.

**README and contributor docs.** The npm page is the README, so it gets a status note at the top, an Install section (`npm install --save-dev shotdoc`, or `npx shotdoc`), and the Chromium step with the Node version in one place. Text that only matters inside the repository (`npm run build:examples`) moves to a new `CONTRIBUTING.md`. Relative links on the npm page resolve through the `repository` field.

**Manual first publish, `RELEASING.md`.** The first publish is `npm publish` by the author with 2FA, followed by a `v0.1.0` tag. Trusted publishing from GitHub Actions (OIDC, no token, `--provenance`) is configured on npmjs.com after the package exists; `RELEASING.md` says so and points at npm's documentation for the current steps, which this change does not verify. *Alternative:* publish from CI with a stored token from the start. Rejected: a long-lived token for the very first release is the weakest option.

## Risks / Trade-offs

- [The smoke test installs `playwright` from the registry, a network step] → pin to the repository's version so no new browser build is needed; the registry is already needed by `npm ci` in CI.
- [A temporary project's `npm install` is slow, adding time to every CI job] → run the smoke test in each matrix job only if it stays under about a minute; otherwise run it on one Node version.
- [A package page that shows the README's relative links wrongly] → `repository` is set; checked by reading the packed `package.json` in a test.
- [Name taken between now and the first publish] → publish soon after the trial's go-ahead; the name was free when planned.
- [Node 26 jobs break on a Playwright or dependency issue] → they are in the matrix to find that early; drop the line only with a reason.

## Migration Plan

Additive: no source changes. Order: metadata, license, test and smoke script, CI matrix, README and docs, then a dry run. Rollback before publishing is reverting the commit. A published version cannot be republished: a bad release is superseded by the next patch and marked with `npm deprecate`.

## Open Questions

- The `author` field is set to "Codiform" with no email, to avoid putting a personal address on a public page; the author can change it before the first publish without affecting anything else.
