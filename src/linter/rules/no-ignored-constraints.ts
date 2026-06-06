import {
  createRule,
  getEncode,
  getFormat,
  getMaxItems,
  getMaxLength,
  getMaxValue,
  getMaxValueExclusive,
  getMinItems,
  getMinLength,
  getMinValue,
  getMinValueExclusive,
  getPattern,
  paramMessage,
  type ModelProperty,
  type Program,
  type Scalar,
} from "@typespec/compiler";
import { isInUserCode } from "../utils.js";

/** A type that can carry constraint/encoding decorators. */
type ConstraintTarget = Scalar | ModelProperty;

/** Constraint decorators that have no representation in JSON Type Definition. */
const CONSTRAINT_CHECKS: Array<[string, (program: Program, target: ConstraintTarget) => unknown]> =
  [
    ["@minValue", getMinValue],
    ["@maxValue", getMaxValue],
    ["@minValueExclusive", getMinValueExclusive],
    ["@maxValueExclusive", getMaxValueExclusive],
    ["@minLength", getMinLength],
    ["@maxLength", getMaxLength],
    ["@pattern", getPattern],
    ["@format", getFormat],
    ["@minItems", getMinItems],
    ["@maxItems", getMaxItems],
    ["@encode", getEncode],
  ];

function droppedConstraints(program: Program, type: ConstraintTarget): string[] {
  return CONSTRAINT_CHECKS.filter(([, get]) => get(program, type) !== undefined).map(
    ([name]) => name,
  );
}

/**
 * Warns when a model property or scalar carries validation/encoding decorators.
 * JSON Type Definition describes shape only, so these are silently dropped.
 */
export const noIgnoredConstraintsRule = createRule({
  name: "no-ignored-constraints",
  severity: "warning",
  description: "Disallow validation constraints, which JSON Type Definition drops.",
  messages: {
    default: paramMessage`The constraint(s) ${"constraints"} cannot be expressed in JSON Type Definition and will be ignored.`,
  },
  create(context) {
    const report = (type: ConstraintTarget, extra: string[] = []) => {
      if (!isInUserCode(context.program, type)) {
        return;
      }
      const constraints = [...droppedConstraints(context.program, type), ...extra];
      if (constraints.length > 0) {
        context.reportDiagnostic({ target: type, format: { constraints: constraints.join(", ") } });
      }
    };

    return {
      modelProperty: (property) =>
        report(property, property.defaultValue !== undefined ? ["@default"] : []),
      scalar: (scalar) => report(scalar),
    };
  },
});
