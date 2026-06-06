import { createRule, paramMessage } from "@typespec/compiler";
import { isInUserCode } from "../utils.js";

/**
 * Warns about enums with numeric members. JTD enums are string-only, so the
 * emitter falls back to the member *names* and the numeric values are lost.
 */
export const noNumericEnumRule = createRule({
  name: "no-numeric-enum",
  severity: "warning",
  description: "Disallow numeric enum members, which JSON Type Definition cannot represent.",
  messages: {
    default: paramMessage`Enum '${"name"}' has numeric members; JSON Type Definition enums are string-only, so the member names are emitted and the values are lost.`,
  },
  create(context) {
    return {
      enum: (enumType) => {
        if (!isInUserCode(context.program, enumType)) {
          return;
        }
        const hasNumericMember = [...enumType.members.values()].some(
          (member) => typeof member.value === "number",
        );
        if (hasNumericMember) {
          context.reportDiagnostic({ target: enumType, format: { name: enumType.name } });
        }
      },
    };
  },
});
