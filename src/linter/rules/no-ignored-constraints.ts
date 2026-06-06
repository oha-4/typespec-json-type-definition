import { createRule, paramMessage, type ModelProperty, type Scalar } from "@typespec/compiler";
import { isInUserCode } from "../utils.js";

/** A type that can carry constraint/encoding decorators. */
type ConstraintTarget = Scalar | ModelProperty;

/** Constraint/encoding decorators that have no representation in JTD. */
const DROPPED_CONSTRAINTS = new Set([
  "@minValue",
  "@maxValue",
  "@minValueExclusive",
  "@maxValueExclusive",
  "@minLength",
  "@maxLength",
  "@pattern",
  "@format",
  "@minItems",
  "@maxItems",
  "@encode",
]);

/**
 * Warns when a model property or scalar carries validation/encoding decorators.
 * JSON Type Definition describes shape only, so these are silently dropped. The
 * diagnostic is reported on the decorator itself (or the property for a
 * dropped `= default` value).
 */
export const noIgnoredConstraintsRule = createRule({
  name: "no-ignored-constraints",
  severity: "warning",
  description: "Disallow validation constraints, which JSON Type Definition drops.",
  messages: {
    default: paramMessage`The ${"constraint"} constraint cannot be expressed in JSON Type Definition and will be ignored.`,
  },
  create(context) {
    const check = (type: ConstraintTarget) => {
      if (!isInUserCode(context.program, type)) {
        return;
      }
      for (const decorator of type.decorators) {
        const name = decorator.definition?.name;
        if (name && DROPPED_CONSTRAINTS.has(name)) {
          context.reportDiagnostic({
            target: decorator.node ?? type,
            format: { constraint: name },
          });
        }
      }
      if (type.kind === "ModelProperty" && type.defaultValue !== undefined) {
        context.reportDiagnostic({ target: type, format: { constraint: "@default" } });
      }
    };

    return { modelProperty: check, scalar: check };
  },
});
