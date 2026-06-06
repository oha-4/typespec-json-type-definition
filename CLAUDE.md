# CLAUDE.md

Guidance for working in this repo. For user-facing docs see [README.md](./README.md).

## What this is

A **TypeSpec emitter** that turns TypeSpec models/enums/unions into a single
**JSON Type Definition** (JTD, RFC 8927) document, plus a **linter** that flags
constructs JTD cannot represent. ESM-only, TypeScript, published to npm as
`typespec-json-type-definition`.

## Toolchain

Versions are pinned in [`.tool-versions`](./.tool-versions) (Node 24.16.0,
pinact 4.0.0) and managed by [mise](https://mise.jdx.dev/) / asdf. Use the
Node provided there — don't assume a system Node. `engines` requires Node
`>=22`; CI runs the test matrix on Node 22 and 24.

## Commands

```bash
npm run build        # tsc -> dist/ (with sourcemaps + d.ts)
npm test             # build, then vitest run
npm run coverage     # build, then vitest run --coverage (thresholds enforced)
npm run lint         # tsc --noEmit (type check only)
npm run format       # biome check --write . && tsp format samples/**/*.tsp
npm run format:check # what CI checks; must pass before committing
npm run clean        # rm -rf dist coverage tsp-output samples/output
```

Run the real emitter end-to-end against the sample:

```bash
cd samples && npx tsp compile . --config tspconfig.yaml   # writes output/showcase.jtd.json
```

## Architecture

```
src/
  index.ts        Public entry. Exports $lib, $onEmit, $linter, JtdTransform, JTD types.
  emitter.ts      $onEmit: runs JtdTransform, serializes JSON, writes the file.
  transform.ts    JtdTransform: the core. Walks the program -> JTD root with `definitions`.
  lib.ts          $lib (createTypeSpecLibrary): emitter options schema, diagnostics, `libraryName`.
  scalar-map.ts   Scalar -> JTD classification. SHARED single source of truth.
  jtd-types.ts    TypeScript types for the 8 JTD forms (type-only; excluded from coverage).
  linter.ts       $linter (defineLinter): rules + `recommended` / `all` rulesets.
  linter/rules/   One file per rule.
  linter/utils.ts isInUserCode() — skip std-lib / dependency types via getLocationContext.
  testing/index.ts Test library (createTestLibrary) so tests can load this package.
test/
  test-host.ts    Helpers: compile(), emitJtd(), emitJtdSchema(), emitJtdFile().
```

### Emitter vs. linter — the key distinction

This is the most important thing to understand before changing diagnostics:

- **Emitter diagnostics** (`reportDiagnostic` inside `$onEmit`/transform) only
  fire during `tsp compile`. The language server compiles with `noEmit`, and
  the compiler does **not load emitters under `noEmit`** — so emitter warnings
  never show live in the editor.
- **Linter rules** (`createRule`, registered on `$linter`) run in the checker
  pass, which the language server **does** run. They are how warnings show up
  live in VS Code. The linter is opt-in via the user's `tspconfig.yaml`
  (`linter.extends: [typespec-json-type-definition/recommended | all]`).

So: editor-time advice goes in a linter rule; output-correctness checks stay in
the emitter. Both currently coexist by design. `$linter` is discovered by the
compiler via `esmExports.$linter`, so it **must** be re-exported from
`src/index.ts`.

Two rulesets: `recommended` (output is silently wrong/widened) and `all`
(extends recommended; also flags silently-dropped constraints/metadata/ops).

## Conventions & gotchas

- **Scalar mapping lives only in `scalar-map.ts`** (`classifyScalar`). The
  emitter and `no-unsupported-scalar` both use it — don't duplicate the table.
- **Linter diagnostic targets:** for decorator-caused issues, report on the
  decorator node (`decorator.node`, matched via `decorator.definition.name`
  like `@maxLength`) so the squiggle lands on the decorator, not the whole
  property. Type-caused issues (bad scalar/union/tuple) target the
  property/usage.
- **Emitter diagnostic targets:** degradation warnings (`unsupported-scalar`,
  `unsupported-type`) must point at the _usage_ (the property/value position),
  not the leaf type — built-in scalars like `int64` are declared in the
  compiler std-lib, so targeting the declaration would land the squiggle in
  `node_modules`. `#valueToSchema` threads a `target` down for this; pass the
  most user-relevant node when you add a new degradation path.
- **Guard every linter rule with `isInUserCode`** so std-lib and dependency
  declarations aren't flagged.
- **Tests drive `src` directly** (`compile()` to get a `Program`, then run
  `JtdTransform`/`$onEmit` from `src`), not through the compiler's emit path.
  This keeps v8 coverage mapped to source. Coverage thresholds are enforced in
  `vitest.config.ts` — keep them green. Linter rules are tested with
  `createLinterRuleTester`.
- **`@types/node` is pinned to the lowest supported Node (22)** on purpose; it
  tracks the runtime. Dependabot ignores its major bumps. Don't bump it to
  chase the latest.
- **Formatting:** Biome (`biome.json`, lineWidth 100) formats JS/TS/JSON;
  `tsp format` handles `samples/**/*.tsp`. Biome does not format Markdown or
  YAML, so those are no longer auto-formatted. `format:check` runs `biome ci`
  (the check-only CI command); `format` runs `biome check --write`. The linter
  stays `tsc --noEmit` — Biome's own linter is disabled in `biome.json`. Always
  run `npm run format` before committing or CI's `format:check` will fail.

## CI / release

- All GitHub Actions are **pinned to full commit SHAs** with a `# vX.Y.Z`
  comment. `pinact` enforces this (`.github/pinact.yml`, `min_age` 7 days). When
  adding/updating an action, pin the SHA and run
  `pinact run --check --verify -c .github/pinact.yml`.
- `pinact.yml` only runs on changes under `.github/`.
- **Release** (`release.yml`) triggers on `v*.*.*` tags, uses npm **Trusted
  Publishing (OIDC)** — no `NPM_TOKEN` — and fails if the tag doesn't match
  `package.json`'s `version`. Bump the version and tag to publish.

## Adding a linter rule

1. Create `src/linter/rules/<name>.ts` with `createRule({ name, severity:
"warning", description, messages, create })`; guard with `isInUserCode`.
2. Register it in `src/linter.ts` (the `rules` array and the right ruleset —
   `recommended` for output-breaking, `all`/informational otherwise).
3. Add a test in `test/linter.test.ts` using `createLinterRuleTester`
   (`toEmitDiagnostics` / `toBeValid`), and update the ruleset assertions.
4. Document it in the README linter table.
