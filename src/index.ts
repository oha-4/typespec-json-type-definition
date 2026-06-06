/**
 * typespec-json-type-definition
 *
 * A TypeSpec emitter that turns TypeSpec models, enums, and unions into a
 * JSON Type Definition (RFC 8927) document.
 */
export { $lib } from "./lib.js";
export type { JsonTypeDefinitionEmitterOptions } from "./lib.js";
export { $onEmit } from "./emitter.js";
export { $linter } from "./linter.js";
export { JtdTransform } from "./transform.js";
export type * from "./jtd-types.js";
