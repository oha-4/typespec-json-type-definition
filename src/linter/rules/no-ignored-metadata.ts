import {
  createRule,
  getDeprecated,
  paramMessage,
  type Enum,
  type Model,
  type ModelProperty,
  type Scalar,
  type Union,
} from "@typespec/compiler";
import { isInUserCode } from "../utils.js";

/** A type that can carry the metadata decorators this rule checks. */
type MetadataTarget = Model | ModelProperty | Enum | Union | Scalar;

/** Metadata decorators the emitter does not carry into JTD output. */
const DROPPED_METADATA = new Set(["@example", "@deprecated", "@secret"]);

/**
 * Warns about metadata decorators the emitter does not reflect in JTD output
 * (`@doc` is the exception — it maps to `metadata.description`). The diagnostic
 * is reported on the decorator itself.
 */
export const noIgnoredMetadataRule = createRule({
  name: "no-ignored-metadata",
  severity: "warning",
  description: "Disallow metadata decorators that JSON Type Definition output omits.",
  messages: {
    default: paramMessage`The ${"decorator"} decorator is not reflected in JSON Type Definition output and will be ignored.`,
  },
  create(context) {
    const check = (type: MetadataTarget) => {
      if (!isInUserCode(context.program, type)) {
        return;
      }
      let sawDeprecated = false;
      for (const decorator of type.decorators) {
        const name = decorator.definition?.name;
        if (name && DROPPED_METADATA.has(name)) {
          if (name === "@deprecated") {
            sawDeprecated = true;
          }
          context.reportDiagnostic({ target: decorator.node ?? type, format: { decorator: name } });
        }
      }
      // The `#deprecated` directive has no decorator node to point at.
      if (!sawDeprecated && getDeprecated(context.program, type) !== undefined) {
        context.reportDiagnostic({ target: type, format: { decorator: "@deprecated" } });
      }
    };

    return { model: check, modelProperty: check, enum: check, union: check, scalar: check };
  },
});
