import { emitFile, resolvePath, type EmitContext } from "@typespec/compiler";
import type { JsonTypeDefinitionEmitterOptions } from "./lib.js";
import { JtdTransform } from "./transform.js";

const DEFAULT_OUTPUT_FILE = "schema.jtd.json";
const DEFAULT_INDENT = 2;

/** Entry point invoked by the TypeSpec compiler when this emitter is selected. */
export async function $onEmit(
  context: EmitContext<JsonTypeDefinitionEmitterOptions>,
): Promise<void> {
  const { program, options } = context;

  const root = new JtdTransform(program, options).emit();

  if (program.compilerOptions.dryRun) {
    return;
  }

  const indent = options.indent ?? DEFAULT_INDENT;
  const content = JSON.stringify(root, null, indent) + "\n";

  const outputFile = options["output-file"] ?? DEFAULT_OUTPUT_FILE;
  await emitFile(program, {
    path: resolvePath(context.emitterOutputDir, outputFile),
    content,
  });
}
