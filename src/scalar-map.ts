import type { Scalar } from "@typespec/compiler";
import type { JtdType } from "./jtd-types.js";

/** Scalars that map cleanly onto a JTD primitive type. */
export const DIRECT_SCALAR_MAP: Record<string, JtdType> = {
  boolean: "boolean",
  string: "string",
  url: "string",
  bytes: "string",
  int8: "int8",
  int16: "int16",
  int32: "int32",
  uint8: "uint8",
  uint16: "uint16",
  uint32: "uint32",
  float32: "float32",
  float64: "float64",
  float: "float64",
  numeric: "float64",
  utcDateTime: "timestamp",
  offsetDateTime: "timestamp",
  plainDate: "string",
  plainTime: "string",
  duration: "string",
};

/**
 * Scalars with no precise JTD equivalent. They are emitted as `string` (the
 * JSON-safe representation).
 */
export const LOSSY_SCALAR_MAP: Record<string, JtdType> = {
  int64: "string",
  uint64: "string",
  integer: "string",
  safeint: "string",
  decimal: "string",
  decimal128: "string",
};

/** The outcome of mapping a TypeSpec scalar onto JTD. */
export type ScalarClassification =
  | { kind: "direct"; type: JtdType }
  | { kind: "lossy"; type: JtdType }
  | { kind: "unknown" };

/**
 * Classify a scalar by walking its `extends` chain to the nearest built-in:
 * `direct` (clean mapping), `lossy` (degraded to `string`), or `unknown`
 * (no built-in base — also degraded to `string` by the emitter).
 */
export function classifyScalar(scalar: Scalar): ScalarClassification {
  let current: Scalar | undefined = scalar;
  while (current) {
    const direct = DIRECT_SCALAR_MAP[current.name];
    if (direct) {
      return { kind: "direct", type: direct };
    }
    const lossy = LOSSY_SCALAR_MAP[current.name];
    if (lossy) {
      return { kind: "lossy", type: lossy };
    }
    current = current.baseScalar;
  }
  return { kind: "unknown" };
}
