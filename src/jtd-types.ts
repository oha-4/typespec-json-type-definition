/**
 * TypeScript representations of the JSON Type Definition (RFC 8927) schema forms.
 *
 * A JTD schema is one of eight forms. Every form may additionally carry the
 * shared `nullable`, `metadata`, and (on the root) `definitions` members.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc8927
 */

/** The set of primitive type names allowed by the JTD "type" form. */
export type JtdType =
  | "boolean"
  | "string"
  | "timestamp"
  | "float32"
  | "float64"
  | "int8"
  | "uint8"
  | "int16"
  | "uint16"
  | "int32"
  | "uint32";

/** Members shared by every JTD schema form. */
export interface JtdShared {
  nullable?: boolean;
  metadata?: Record<string, unknown>;
  /** Only meaningful on the root schema. */
  definitions?: Record<string, JtdSchema>;
}

/** The "empty" form: matches any instance. */
export interface JtdEmptyForm extends JtdShared {}

/** The "type" form: matches a single primitive type. */
export interface JtdTypeForm extends JtdShared {
  type: JtdType;
}

/** The "enum" form: matches one of a fixed set of strings. */
export interface JtdEnumForm extends JtdShared {
  enum: string[];
}

/** The "elements" form: matches a homogeneous array. */
export interface JtdElementsForm extends JtdShared {
  elements: JtdSchema;
}

/** The "properties" form: matches an object with known members. */
export interface JtdPropertiesForm extends JtdShared {
  properties?: Record<string, JtdSchema>;
  optionalProperties?: Record<string, JtdSchema>;
  additionalProperties?: boolean;
}

/** The "values" form: matches a dictionary with homogeneous values. */
export interface JtdValuesForm extends JtdShared {
  values: JtdSchema;
}

/** The "discriminator" form: a tagged union of "properties" form schemas. */
export interface JtdDiscriminatorForm extends JtdShared {
  discriminator: string;
  mapping: Record<string, JtdPropertiesForm>;
}

/** The "ref" form: a reference into the root `definitions`. */
export interface JtdRefForm extends JtdShared {
  ref: string;
}

/** Any JSON Type Definition schema. */
export type JtdSchema =
  | JtdEmptyForm
  | JtdTypeForm
  | JtdEnumForm
  | JtdElementsForm
  | JtdPropertiesForm
  | JtdValuesForm
  | JtdDiscriminatorForm
  | JtdRefForm;

/** The root document produced by the emitter. */
export type JtdRootSchema = JtdSchema & { definitions?: Record<string, JtdSchema> };
