import { getLocationContext, type Program, type Type } from "@typespec/compiler";

/**
 * True when a type is declared in the user's own project (not the compiler
 * standard library or an imported dependency). Linter rules use this to avoid
 * flagging built-in declarations.
 */
export function isInUserCode(program: Program, type: Type): boolean {
  return getLocationContext(program, type).type === "project";
}
