import {
  getDiscriminatedUnion,
  getDiscriminator,
  getDoc,
  isArrayModelType,
  isRecordModelType,
  isTemplateDeclaration,
  navigateProgram,
  type DiscriminatedUnion,
  type Enum,
  type Model,
  type ModelProperty,
  type Program,
  type Scalar,
  type Type,
  type Union,
} from "@typespec/compiler";
import type {
  JtdDiscriminatorForm,
  JtdPropertiesForm,
  JtdRootSchema,
  JtdSchema,
} from "./jtd-types.js";
import { reportDiagnostic, type JsonTypeDefinitionEmitterOptions } from "./lib.js";
import { classifyScalar } from "./scalar-map.js";

interface ResolvedOptions {
  additionalProperties: boolean;
  includeDoc: boolean;
}

/**
 * Walks a TypeSpec program and produces a single JSON Type Definition document
 * whose `definitions` map holds one entry per user-declared model, enum, and
 * named union.
 */
export class JtdTransform {
  readonly #program: Program;
  readonly #options: ResolvedOptions;
  /** Declared types eligible to be referenced via the JTD "ref" form. */
  readonly #definitionNames = new Map<Type, string>();
  readonly #definitions: Record<string, JtdSchema> = {};

  constructor(program: Program, options: JsonTypeDefinitionEmitterOptions) {
    this.#program = program;
    this.#options = {
      additionalProperties: options["additional-properties"] ?? false,
      includeDoc: options["include-doc"] ?? true,
    };
  }

  /** Run the transform and return the root JTD document. */
  emit(): JtdRootSchema {
    this.#collectDeclarations();
    for (const [type, name] of this.#definitionNames) {
      this.#definitions[name] = this.#declarationToSchema(type);
    }
    const root: JtdRootSchema = {};
    if (Object.keys(this.#definitions).length > 0) {
      root.definitions = this.#definitions;
    }
    return root;
  }

  // -- declaration collection -------------------------------------------------

  #collectDeclarations(): void {
    const consider = (type: Model | Enum | Union): void => {
      if (!this.#isEmittableDeclaration(type)) {
        return;
      }
      const name = this.#definitionNameFor(type);
      this.#definitionNames.set(type, name);
    };

    navigateProgram(this.#program, {
      model: (m) => consider(m),
      enum: (e) => consider(e),
      union: (u) => consider(u),
    });
  }

  #isEmittableDeclaration(type: Model | Enum | Union): boolean {
    if (!type.name) {
      return false;
    }
    if (this.#isInTypeSpecNamespace(type)) {
      return false;
    }
    if ((type.kind === "Model" || type.kind === "Union") && isTemplateDeclaration(type)) {
      return false;
    }
    if (
      type.kind === "Model" &&
      (isArrayModelType(this.#program, type) || isRecordModelType(this.#program, type))
    ) {
      return false;
    }
    return true;
  }

  #definitionNameFor(type: Model | Enum | Union): string {
    const base = type.name ?? "Anonymous";
    if (!this.#definitionNames.size) {
      return base;
    }
    // Disambiguate the rare case of two declarations sharing a name across
    // namespaces by appending a counter.
    let candidate = base;
    let counter = 1;
    const taken = new Set(this.#definitionNames.values());
    while (taken.has(candidate)) {
      candidate = `${base}_${counter++}`;
    }
    return candidate;
  }

  #isInTypeSpecNamespace(type: Type): boolean {
    let ns = "namespace" in type ? type.namespace : undefined;
    let root: string | undefined;
    while (ns?.name) {
      root = ns.name;
      ns = ns.namespace;
    }
    return root === "TypeSpec";
  }

  // -- schema generation ------------------------------------------------------

  /** Produce the inline schema body for a declared type. */
  #declarationToSchema(type: Type): JtdSchema {
    switch (type.kind) {
      case "Model":
        return this.#modelToSchema(type);
      case "Enum":
        return this.#enumToSchema(type);
      case "Union":
        return this.#unionToSchema(type);
      case "Scalar":
        return this.#scalarToSchema(type);
      default:
        return this.#valueToSchema(type);
    }
  }

  /**
   * Resolve a type used in value position: a ref for declared types, else
   * inline. `target` is the node a degradation diagnostic should point at —
   * the user's property/usage, not the (often built-in) leaf type itself.
   */
  #valueToSchema(type: Type, target: Type = type): JtdSchema {
    const refName = this.#definitionNames.get(type);
    if (refName) {
      return { ref: refName };
    }

    switch (type.kind) {
      case "Model":
        return this.#modelToSchema(type, target);
      case "Enum":
        return this.#enumToSchema(type);
      case "Union":
        return this.#unionToSchema(type, target);
      case "Scalar":
        return this.#scalarToSchema(type, target);
      case "ModelProperty":
        return this.#valueToSchema(type.type, type);
      case "String":
        return { type: "string" };
      case "Boolean":
        return { type: "boolean" };
      case "Number":
        return { type: Number.isInteger(type.value) ? "int32" : "float64" };
      case "Intrinsic":
        if (type.name === "null") {
          return { nullable: true };
        }
        return this.#unsupportedType(type, target);
      default:
        return this.#unsupportedType(type, target);
    }
  }

  #modelToSchema(model: Model, target: Type = model): JtdSchema {
    if (isArrayModelType(this.#program, model)) {
      // biome-ignore lint/style/noNonNullAssertion: isArrayModelType guarantees an indexer
      const element = model.indexer!.value;
      return this.#withDoc(model, { elements: this.#valueToSchema(element, target) });
    }
    if (isRecordModelType(this.#program, model)) {
      // biome-ignore lint/style/noNonNullAssertion: isRecordModelType guarantees an indexer
      const value = model.indexer!.value;
      return this.#withDoc(model, { values: this.#valueToSchema(value, target) });
    }

    const discriminator = getDiscriminator(this.#program, model);
    if (discriminator && model.derivedModels.length > 0) {
      return this.#withDoc(
        model,
        this.#discriminatorForm(discriminator.propertyName, model.derivedModels),
      );
    }

    return this.#withDoc(model, this.#propertiesForm(this.#collectProperties(model)));
  }

  /** Gather a model's own properties merged with those inherited from `extends`. */
  #collectProperties(model: Model): Map<string, ModelProperty> {
    const properties = new Map<string, ModelProperty>();
    if (model.baseModel) {
      for (const [name, prop] of this.#collectProperties(model.baseModel)) {
        properties.set(name, prop);
      }
    }
    for (const [name, prop] of model.properties) {
      properties.set(name, prop);
    }
    return properties;
  }

  #propertiesForm(properties: Map<string, ModelProperty>, skip?: string): JtdPropertiesForm {
    const form: JtdPropertiesForm = {};
    for (const [name, prop] of properties) {
      if (name === skip) {
        continue;
      }
      const schema = this.#withDoc(prop, this.#valueToSchema(prop.type, prop));
      if (prop.optional) {
        form.optionalProperties ??= {};
        form.optionalProperties[name] = schema;
      } else {
        form.properties ??= {};
        form.properties[name] = schema;
      }
    }
    return this.#withAdditionalProperties(form);
  }

  /**
   * Discriminator form for the `@discriminator` inheritance pattern: a base
   * model whose derived models each carry the tag property inline.
   */
  #discriminatorForm(propertyName: string, variants: readonly Model[]): JtdDiscriminatorForm {
    const mapping: Record<string, JtdPropertiesForm> = {};
    for (const variant of variants) {
      const key = this.#discriminatorValue(variant, propertyName) ?? variant.name;
      mapping[key] = this.#propertiesForm(this.#collectProperties(variant), propertyName);
    }
    return { discriminator: propertyName, mapping };
  }

  /** Discriminator form for the union `@discriminated` decorator. */
  #discriminatedUnionForm(union: DiscriminatedUnion): JtdDiscriminatorForm {
    const { envelope, discriminatorPropertyName, envelopePropertyName } = union.options;
    const mapping: Record<string, JtdPropertiesForm> = {};
    for (const [key, variant] of union.variants) {
      if (envelope === "none") {
        if (variant.kind === "Model") {
          mapping[key] = this.#propertiesForm(
            this.#collectProperties(variant),
            discriminatorPropertyName,
          );
        } else {
          reportDiagnostic(this.#program, {
            code: "anonymous-discriminator-variant",
            format: { name: union.type.name ?? "<anonymous>" },
            target: variant,
          });
          mapping[key] = this.#withAdditionalProperties({});
        }
      } else {
        // "object" envelope: the payload lives under `envelopePropertyName`.
        mapping[key] = this.#withAdditionalProperties({
          properties: { [envelopePropertyName]: this.#valueToSchema(variant) },
        });
      }
    }
    return { discriminator: discriminatorPropertyName, mapping };
  }

  #discriminatorValue(model: Model, propertyName: string): string | undefined {
    const prop = this.#collectProperties(model).get(propertyName);
    if (prop && prop.type.kind === "String") {
      return prop.type.value;
    }
    return undefined;
  }

  #withAdditionalProperties(form: JtdPropertiesForm): JtdPropertiesForm {
    if (this.#options.additionalProperties) {
      form.additionalProperties = true;
    }
    return form;
  }

  #enumToSchema(enumType: Enum): JtdSchema {
    const values: string[] = [];
    let hasNonString = false;
    for (const member of enumType.members.values()) {
      if (typeof member.value === "number") {
        hasNonString = true;
        values.push(member.name);
      } else if (typeof member.value === "string") {
        values.push(member.value);
      } else {
        values.push(member.name);
      }
    }
    if (hasNonString) {
      reportDiagnostic(this.#program, {
        code: "non-string-enum",
        format: { name: enumType.name },
        target: enumType,
      });
    }
    return this.#withDoc(enumType, { enum: values });
  }

  #unionToSchema(union: Union, target: Type = union): JtdSchema {
    const [discriminated] = getDiscriminatedUnion(this.#program, union);
    if (discriminated) {
      return this.#withDoc(union, this.#discriminatedUnionForm(discriminated));
    }

    let nullable = false;
    const variants: Type[] = [];
    for (const variant of union.variants.values()) {
      if (variant.type.kind === "Intrinsic" && variant.type.name === "null") {
        nullable = true;
      } else {
        variants.push(variant.type);
      }
    }

    // `T | null` collapses to T with nullable set.
    if (variants.length === 1) {
      // biome-ignore lint/style/noNonNullAssertion: length === 1 guarantees variants[0]
      const schema = this.#valueToSchema(variants[0]!, target);
      if (nullable) {
        schema.nullable = true;
      }
      return this.#withDoc(union, schema);
    }

    // A union of string literals becomes a JTD enum.
    if (variants.length > 0 && variants.every((v) => v.kind === "String")) {
      const schema: JtdSchema = {
        enum: variants.map((v) => (v as Extract<Type, { kind: "String" }>).value),
      };
      if (nullable) {
        schema.nullable = true;
      }
      return this.#withDoc(union, schema);
    }

    reportDiagnostic(this.#program, {
      code: "unsupported-union",
      format: { name: union.name ?? "<anonymous>" },
      target: union,
    });
    return nullable ? { nullable: true } : {};
  }

  #scalarToSchema(scalar: Scalar, target: Type = scalar): JtdSchema {
    // Docs intentionally come from the declaration or property that uses a
    // scalar, never from the (often built-in) scalar leaf itself.
    return this.#resolveScalar(scalar, target);
  }

  #resolveScalar(scalar: Scalar, target: Type): JtdSchema {
    const classification = classifyScalar(scalar);
    if (classification.kind === "direct") {
      return { type: classification.type };
    }
    const fallback = classification.kind === "lossy" ? classification.type : "string";
    // Point the warning at the usage (a property), not the scalar declaration —
    // which for built-ins like `int64` lives in the compiler's standard library.
    reportDiagnostic(this.#program, {
      code: "unsupported-scalar",
      format: { name: scalar.name, fallback },
      target,
    });
    return { type: fallback };
  }

  #unsupportedType(type: Type, target: Type = type): JtdSchema {
    const name = "name" in type && typeof type.name === "string" ? type.name : type.kind;
    reportDiagnostic(this.#program, {
      code: "unsupported-type",
      format: { name },
      target,
    });
    return {};
  }

  #withDoc<T extends JtdSchema>(type: Type, schema: T): T {
    if (!this.#options.includeDoc) {
      return schema;
    }
    const doc = getDoc(this.#program, type);
    if (doc) {
      schema.metadata = { ...schema.metadata, description: doc };
    }
    return schema;
  }
}
