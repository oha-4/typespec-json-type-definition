import { defineLinter } from "@typespec/compiler";
import { libraryName } from "./lib.js";
import { noIgnoredConstraintsRule } from "./linter/rules/no-ignored-constraints.js";
import { noIgnoredMetadataRule } from "./linter/rules/no-ignored-metadata.js";
import { noNumericEnumRule } from "./linter/rules/no-numeric-enum.js";
import { noOperationsRule } from "./linter/rules/no-operations.js";
import { noTupleRule } from "./linter/rules/no-tuple.js";
import { noUnsupportedScalarRule } from "./linter/rules/no-unsupported-scalar.js";
import { noUnsupportedUnionRule } from "./linter/rules/no-unsupported-union.js";

const ref = (name: string) => `${libraryName}/${name}` as const;

/** Rules for constructs whose JTD output is silently wrong or widened. */
const degradationRules = [
  noUnsupportedScalarRule,
  noUnsupportedUnionRule,
  noTupleRule,
  noNumericEnumRule,
];

/** Rules for constructs that are silently dropped (advisory; opt-in). */
const informationalRules = [noIgnoredConstraintsRule, noOperationsRule, noIgnoredMetadataRule];

/**
 * Linter discovered by the TypeSpec language server. Enable a ruleset in
 * tspconfig.yaml to get live editor warnings:
 *
 * ```yaml
 * linter:
 *   extends:
 *     - typespec-json-type-definition/recommended # degradations only
 *     # or: typespec-json-type-definition/all      # + dropped constraints/metadata/operations
 * ```
 */
export const $linter = defineLinter({
  rules: [...degradationRules, ...informationalRules],
  ruleSets: {
    recommended: {
      enable: {
        [ref(noUnsupportedScalarRule.name)]: true,
        [ref(noUnsupportedUnionRule.name)]: true,
        [ref(noTupleRule.name)]: true,
        [ref(noNumericEnumRule.name)]: true,
      },
    },
    all: {
      extends: [ref("recommended")],
      enable: {
        [ref(noIgnoredConstraintsRule.name)]: true,
        [ref(noOperationsRule.name)]: true,
        [ref(noIgnoredMetadataRule.name)]: true,
      },
    },
  },
});
