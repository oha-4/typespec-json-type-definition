import {
  createRule,
  getDeprecated,
  getExamples,
  isSecret,
  paramMessage,
  type Enum,
  type Model,
  type ModelProperty,
  type Program,
  type Scalar,
  type Union,
} from "@typespec/compiler";
import { isInUserCode } from "../utils.js";

/** A type that can carry the metadata decorators this rule checks. */
type MetadataTarget = Model | ModelProperty | Enum | Union | Scalar;

function droppedMetadata(program: Program, type: MetadataTarget): string[] {
  const found: string[] = [];
  if (getExamples(program, type).length > 0) {
    found.push("@example");
  }
  if (getDeprecated(program, type) !== undefined) {
    found.push("@deprecated");
  }
  if (isSecret(program, type)) {
    found.push("@secret");
  }
  return found;
}

/**
 * Warns about metadata decorators the emitter does not carry into JTD output.
 * (`@doc` is the exception — it is mapped to `metadata.description`.)
 */
export const noIgnoredMetadataRule = createRule({
  name: "no-ignored-metadata",
  severity: "warning",
  description: "Disallow metadata decorators that JSON Type Definition output omits.",
  messages: {
    default: paramMessage`The decorator(s) ${"metadata"} are not reflected in JSON Type Definition output and will be ignored.`,
  },
  create(context) {
    const report = (type: MetadataTarget) => {
      if (!isInUserCode(context.program, type)) {
        return;
      }
      const metadata = droppedMetadata(context.program, type);
      if (metadata.length > 0) {
        context.reportDiagnostic({ target: type, format: { metadata: metadata.join(", ") } });
      }
    };

    return {
      model: report,
      modelProperty: report,
      enum: report,
      union: report,
      scalar: report,
    };
  },
});
