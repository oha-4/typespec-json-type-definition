import { createTypeSpecLibrary, paramMessage, type JSONSchemaType } from "@typespec/compiler";

/** Options accepted by the JSON Type Definition emitter. */
export interface JsonTypeDefinitionEmitterOptions {
  /**
   * Name of the emitted file (relative to the emitter output directory).
   * @default "schema.jtd.json"
   */
  "output-file"?: string;

  /**
   * Number of spaces used to indent the emitted JSON. Use `0` for a single
   * minified line.
   * @default 2
   */
  "indent"?: number;

  /**
   * When `true`, emit `additionalProperties: true` on every "properties" form
   * schema so that unknown members are permitted.
   * @default false
   */
  "additional-properties"?: boolean;

  /**
   * When `true`, copy TypeSpec `@doc` strings into JTD `metadata.description`.
   * @default true
   */
  "include-doc"?: boolean;
}

const EmitterOptionsSchema: JSONSchemaType<JsonTypeDefinitionEmitterOptions> = {
  type: "object",
  additionalProperties: false,
  properties: {
    "output-file": { type: "string", nullable: true },
    "indent": { type: "integer", nullable: true, minimum: 0 },
    "additional-properties": { type: "boolean", nullable: true },
    "include-doc": { type: "boolean", nullable: true },
  },
  required: [],
};

export const $lib = createTypeSpecLibrary({
  name: "typespec-json-type-definition",
  diagnostics: {
    "unsupported-scalar": {
      severity: "warning",
      messages: {
        default: paramMessage`Scalar '${"name"}' has no JSON Type Definition equivalent; emitting as '${"fallback"}'.`,
      },
    },
    "non-string-enum": {
      severity: "warning",
      messages: {
        default: paramMessage`Enum '${"name"}' has non-string members; JSON Type Definition enums are string-only. Emitting member names.`,
      },
    },
    "unsupported-union": {
      severity: "warning",
      messages: {
        default: paramMessage`Union '${"name"}' cannot be expressed in JSON Type Definition; emitting an empty (any) schema.`,
      },
    },
    "unsupported-type": {
      severity: "warning",
      messages: {
        default: paramMessage`Type '${"name"}' is not supported by the JSON Type Definition emitter; emitting an empty (any) schema.`,
      },
    },
    "anonymous-discriminator-variant": {
      severity: "warning",
      messages: {
        default: paramMessage`Variant of discriminated union '${"name"}' is not a model and was skipped.`,
      },
    },
  },
  emitter: {
    options: EmitterOptionsSchema,
  },
});

export const { reportDiagnostic, createDiagnostic } = $lib;
