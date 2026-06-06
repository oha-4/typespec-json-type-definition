import {
  createRule,
  isArrayModelType,
  isRecordModelType,
  paramMessage,
  type Program,
  type Type,
} from "@typespec/compiler";
import { classifyScalar } from "../../scalar-map.js";
import { isInUserCode } from "../utils.js";

interface Degraded {
  name: string;
  fallback: string;
}

/** Find a scalar that JTD cannot represent, looking through arrays and records. */
function degradedScalar(program: Program, type: Type): Degraded | undefined {
  if (type.kind === "Scalar") {
    const classification = classifyScalar(type);
    if (classification.kind === "lossy") {
      return { name: type.name, fallback: classification.type };
    }
    if (classification.kind === "unknown") {
      return { name: type.name, fallback: "string" };
    }
    return undefined;
  }
  if (
    type.kind === "Model" &&
    (isArrayModelType(program, type) || isRecordModelType(program, type))
  ) {
    const inner = type.indexer?.value;
    return inner ? degradedScalar(program, inner) : undefined;
  }
  return undefined;
}

/**
 * Warns when a property uses a numeric scalar (int64, decimal, …) or a custom
 * scalar with no built-in base — JTD has no equivalent, so the emitter falls
 * back to `string`.
 */
export const noUnsupportedScalarRule = createRule({
  name: "no-unsupported-scalar",
  severity: "warning",
  description: "Disallow scalars that JSON Type Definition cannot represent.",
  messages: {
    default: paramMessage`Scalar '${"name"}' has no JSON Type Definition equivalent and will be emitted as '${"fallback"}'.`,
  },
  create(context) {
    return {
      modelProperty: (property) => {
        if (!isInUserCode(context.program, property)) {
          return;
        }
        const degraded = degradedScalar(context.program, property.type);
        if (degraded) {
          context.reportDiagnostic({
            target: property,
            format: { name: degraded.name, fallback: degraded.fallback },
          });
        }
      },
    };
  },
});
