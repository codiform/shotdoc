# Tasks

## 1. Parsing

- [ ] 1.1 Add `trim` to the screenshot step type and parser (`src/parse/types.ts`, `src/parse/steps.ts`), storing each side as pixels or a percentage, and verify with tests in `test/parse/steps.test.ts` covering every scenario of "Trim syntax", including unquoted `60%` in a flow mapping

## 2. Capture

- [ ] 2.1 Add a pure function in `src/run/region.ts` that applies a trim to a box, and verify with unit tests in `test/region.test.ts` for pixels, percentages, several sides and nothing left
- [ ] 2.2 Apply the trim to the target's box on both capture paths in `src/run/capture.ts` and fail the step when nothing is left; verify with a new fixture and `test/run/trim.test.ts` covering the scenarios of "Trimming the target" and "A trim must leave part of the target"
- [ ] 2.3 Verify in `test/run/trim.test.ts` that an included element and an annotation in the trimmed area stay whole, and that padding is added past the cut

## 3. Documentation

- [ ] 3.1 Describe `trim` under Screenshots in `README.md` with a valid example, add it to the Steps table, say that padding applies past a cut and that includes and annotations are never cut, and verify with a new check in `test/readme.test.ts`

## 4. Checks

- [ ] 4.1 Run `npm run format`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run smoke:package` and verify all pass
