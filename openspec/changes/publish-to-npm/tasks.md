# Tasks

## 1. Package metadata and license

- [x] 1.1 Add `LICENSE` (MIT, "Copyright (c) 2026 Codiform") and in `package.json` set `license: MIT`, `repository` (`git+https://github.com/codiform/shotdoc.git`), `homepage`, `bugs`, `author` (`Codiform`), `keywords`, `engines.node` `>=22`, and the scripts `prepack` (build) and `prepublishOnly` (tests); verify `npm pack --dry-run` lists `LICENSE` and `package.json` shows the fields, and `npm pkg get license engines.node` prints `MIT` and `>=22`
- [ ] 1.2 Raise the Node floor in the README Prerequisites to 22 and make CI test Node 22, 24 and 26 in `.github/workflows/ci.yml`; verify the README text and the matrix by reading them, and that the CI run on the pull request shows three green jobs

## 2. Guarding the package

- [x] 2.1 Add `test/package.test.ts`: `npm pack --dry-run --json --ignore-scripts` lists only paths under `dist/` or `README.md`, `package.json`, `LICENSE`; `LICENSE` is present; the packed `package.json` declares `MIT`, a repository and `engines.node` `>=22`; and a file `.shotdoc/auth.json` created in the project directory is not in the list; verify `npx vitest run test/package.test.ts` passes, and fails when `files` is temporarily widened to include `examples`
- [x] 2.2 Add `scripts/smoke-package.mjs` and `npm run smoke:package`: pack into a temporary directory, install the tarball into an empty project (with `playwright` at the repository's installed version), then run the installed `shotdoc --help` (status 0), a document with an unknown step (non-zero, names the step), and a document that visits a `file://` page and takes a screenshot (built Markdown and PNG written); verify `npm run smoke:package` exits 0 locally, and exits non-zero when `dist/cli.js` lacks its shebang or `bin` is wrong
- [ ] 2.3 Run the smoke test in CI after the build step in `.github/workflows/ci.yml`; verify the step appears in the workflow and passes on the pull request, noting the extra time per job and keeping it on every Node version only if it stays under about a minute

## 3. Documentation

- [x] 3.1 README: a status note at the top (early release, usable, not yet stable, minor versions may break), an Install section (`npm install --save-dev shotdoc` or `npx shotdoc`), the Chromium command next to the Node version, and the repository-only text (`npm run build:examples`, the login section's remark about it) removed; verify by reading the README top to bottom as a package reader, and `npx vitest run test/readme.test.ts` passes with a new check for the status note and the Install section
- [x] 3.2 Add `CONTRIBUTING.md` (set-up, the scripts, `build:examples`, the OpenSpec workflow in two lines, how to run the smoke test) and `RELEASING.md` (checks before a release, the first manual `npm publish` with 2FA, tagging `vX.Y.Z`, deprecating a bad release, and that trusted publishing is configured on npmjs.com after the package exists, pointing at npm's documentation); verify each file's commands run as written, and that README links to neither a missing file nor `openspec/`

## 4. Final checks

- [x] 4.1 Run `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run smoke:package`, `npm publish --dry-run` and `openspec validate publish-to-npm --strict`; verify they pass, `npm publish --dry-run` shows `shotdoc@0.1.0` with only the intended files, and walk each scenario in the spec to confirm it has a test or a check, listing any gap

## Workflow follow-up

- The author runs the first `npm publish` (2FA) after the work-project trial or when ready, then tags `v0.1.0` and creates the GitHub release.
- After the first publish: configure trusted publishing on npmjs.com and add a release workflow (a separate change).
- Archive this change after review, adding the `package-distribution` capability.
