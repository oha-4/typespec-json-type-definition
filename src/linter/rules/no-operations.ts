import { createRule } from "@typespec/compiler";
import { isInUserCode } from "../utils.js";

/**
 * Warns about operations. JSON Type Definition describes JSON data only — it
 * has no concept of operations/services — so `op`s are not emitted at all.
 */
export const noOperationsRule = createRule({
  name: "no-operations",
  severity: "warning",
  description: "Disallow operations, which the JSON Type Definition emitter does not emit.",
  messages: {
    default:
      "Operations are not represented in JSON Type Definition output; this operation will be ignored by the emitter.",
  },
  create(context) {
    return {
      operation: (operation) => {
        if (isInUserCode(context.program, operation)) {
          context.reportDiagnostic({ target: operation });
        }
      },
    };
  },
});
