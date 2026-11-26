# Contributing

## Set up

shotdoc needs Node.js 22 or later.

```sh
npm ci
npx playwright install chromium
```

The tests drive a real browser, so the Chromium install is required.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run build` | Compiles `src/` to `dist/` |
| `npm test` | Runs the tests |
| `npm run typecheck` | Type-checks without emitting |
| `npm run lint` | Checks formatting and lint rules with Biome |
| `npm run format` | Fixes what Biome can fix; do not format by hand |
| `npm run build:examples` | Compiles, then builds every `examples/*/input/*.md` |
| `npm run smoke:package` | Packs the package, installs it into an empty project, and runs the installed `shotdoc` |

Before opening a pull request, run `npm run format`, `npm run lint`, `npm run typecheck` and `npm test`.

`build:examples` carries on past a failure and exits non-zero if any example failed. The examples drive live third-party sites, so a changed image or a failure there can mean the site has drifted. An example that needs a saved login nobody has saved is skipped, not failed.

## The package

`npm run smoke:package` tests the package as a user receives it, which testing the checkout cannot: a file missing from the tarball, a wrong `bin` path, an undeclared dependency. It needs the Chromium installed above. `test/package.test.ts` checks that the tarball holds only `dist/`, `README.md`, `package.json` and `LICENSE`, so a saved session or a stray file cannot be published.

## How changes are planned

Changes are specified with [OpenSpec](https://github.com/Fission-AI/OpenSpec) in `openspec/`. A change is proposed under `openspec/changes/`, implemented from its `tasks.md`, then archived, which updates the capability specs in `openspec/specs/`.
