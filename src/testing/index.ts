import { createTestLibrary, findTestPackageRoot } from "@typespec/compiler/testing";

/**
 * Test library used to load this emitter inside a TypeSpec test host.
 *
 * @example
 * ```ts
 * const host = await createTestHost({ libraries: [JsonTypeDefinitionTestLibrary] });
 * ```
 */
export const JsonTypeDefinitionTestLibrary = createTestLibrary({
  name: "typespec-json-type-definition",
  packageRoot: await findTestPackageRoot(import.meta.url),
});
