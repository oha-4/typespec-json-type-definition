import type { Diagnostic, EmitContext, Program } from "@typespec/compiler";
import {
  createTestHost,
  createTestWrapper,
  expectDiagnosticEmpty,
  resolveVirtualPath,
  type BasicTestRunner,
} from "@typespec/compiler/testing";
import { $onEmit } from "../src/emitter.js";
import type { JtdRootSchema } from "../src/jtd-types.js";
import type { JsonTypeDefinitionEmitterOptions } from "../src/lib.js";
import { JsonTypeDefinitionTestLibrary } from "../src/testing/index.js";
import { JtdTransform } from "../src/transform.js";

const OUTPUT_DIR = resolveVirtualPath("tsp-output");

interface Compiled {
  runner: BasicTestRunner;
  program: Program;
}

/** Compile a TypeSpec source string and return the resulting program. */
export async function compile(code: string): Promise<Compiled> {
  const host = await createTestHost({ libraries: [JsonTypeDefinitionTestLibrary] });
  const runner = createTestWrapper(host);
  await runner.compileAndDiagnose(code, { noEmit: true });
  return { runner, program: runner.program };
}

export interface EmitResult {
  schema: JtdRootSchema;
  diagnostics: readonly Diagnostic[];
}

export interface EmitFileResult extends EmitResult {
  content: string;
}

/**
 * Run the JTD transform directly against a compiled program and return the
 * schema together with any diagnostics the transform produced.
 */
export async function emitJtd(
  code: string,
  options: JsonTypeDefinitionEmitterOptions = {},
): Promise<EmitResult> {
  const { program } = await compile(code);
  const before = program.diagnostics.length;
  const schema = new JtdTransform(program, options).emit();
  return { schema, diagnostics: program.diagnostics.slice(before) };
}

/** Compile, transform, and assert no diagnostics were produced. */
export async function emitJtdSchema(
  code: string,
  options: JsonTypeDefinitionEmitterOptions = {},
): Promise<JtdRootSchema> {
  const { schema, diagnostics } = await emitJtd(code, options);
  expectDiagnosticEmpty(diagnostics);
  return schema;
}

/**
 * Drive the full `$onEmit` entry point and return the serialized file content
 * exactly as it would be written to disk.
 */
export async function emitJtdFile(
  code: string,
  options: JsonTypeDefinitionEmitterOptions = {},
): Promise<EmitFileResult> {
  const { runner, program } = await compile(code);
  const before = program.diagnostics.length;

  const context = {
    program,
    emitterOutputDir: OUTPUT_DIR,
    options,
  } as unknown as EmitContext<JsonTypeDefinitionEmitterOptions>;
  await $onEmit(context);

  const outputFile = options["output-file"] ?? "schema.jtd.json";
  const path = resolveVirtualPath("tsp-output", outputFile);
  const content = runner.fs.get(path);
  if (content === undefined) {
    throw new Error(
      `Emitter did not produce '${outputFile}'. Files: ${[...runner.fs.keys()]
        .filter((k) => k.includes("tsp-output"))
        .join(", ")}`,
    );
  }

  return {
    schema: JSON.parse(content) as JtdRootSchema,
    content,
    diagnostics: program.diagnostics.slice(before),
  };
}
