import { createRule, getDiscriminatedUnion, type Program, type Union } from "@typespec/compiler";
import { isInUserCode } from "../utils.js";

/**
 * A union maps to JTD only when it is one of:
 * - a discriminated union (`@discriminated` / `@discriminator`)
 * - `T | null` (a single non-null variant, becomes `nullable`)
 * - a union of string literals (becomes an `enum`)
 */
function isRepresentable(program: Program, union: Union): boolean {
  const [discriminated] = getDiscriminatedUnion(program, union);
  if (discriminated) {
    return true;
  }

  const nonNull = [...union.variants.values()]
    .map((v) => v.type)
    .filter((t) => !(t.kind === "Intrinsic" && t.name === "null"));

  if (nonNull.length <= 1) {
    return true;
  }
  return nonNull.every((t) => t.kind === "String");
}

/**
 * Warns about unions that JTD cannot express. Such a union is emitted as an
 * empty (any) schema, silently widening the contract.
 */
export const noUnsupportedUnionRule = createRule({
  name: "no-unsupported-union",
  severity: "warning",
  description: "Disallow unions that JSON Type Definition cannot represent.",
  messages: {
    default:
      "This union cannot be expressed in JSON Type Definition (only `T | null`, unions of string literals, and discriminated unions are supported) and will be emitted as an empty schema.",
  },
  create(context) {
    return {
      union: (union) => {
        if (!isInUserCode(context.program, union)) {
          return;
        }
        if (!isRepresentable(context.program, union)) {
          context.reportDiagnostic({ target: union });
        }
      },
    };
  },
});
