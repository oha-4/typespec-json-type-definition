import { createRule } from "@typespec/compiler";
import { isInUserCode } from "../utils.js";

/**
 * Warns about tuple types. JTD's `elements` form describes homogeneous arrays
 * only, so a tuple is emitted as an empty (any) schema.
 */
export const noTupleRule = createRule({
  name: "no-tuple",
  severity: "warning",
  description: "Disallow tuples, which JSON Type Definition cannot represent.",
  messages: {
    default:
      "JSON Type Definition has no tuple type; this will be emitted as an empty (any) schema. Use a homogeneous array or a model instead.",
  },
  create(context) {
    return {
      tuple: (tuple) => {
        if (isInUserCode(context.program, tuple)) {
          context.reportDiagnostic({ target: tuple });
        }
      },
    };
  },
});
