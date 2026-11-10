import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build, type Plugin } from "vite";

import type workflowDefinition from "./nytrovertor-convert/definition.json";

export const buildWorkflow = (): Plugin => ({
  name: "nytrovertor-workflow",
  async buildStart() {
    const directory = fileURLToPath(
      new URL("./nytrovertor-convert", import.meta.url),
    );
    const definition = JSON.parse(
      await readFile(path.join(directory, "definition.json"), "utf8"),
    ) as typeof workflowDefinition;
    const result = await build({
      configFile: false,
      logLevel: "warn",
      build: {
        write: false,
        minify: false,
        target: "es2020",
        lib: {
          entry: path.join(directory, "javascript.ts"),
          formats: ["es"],
        },
      },
    });
    const output = Array.isArray(result) ? result[0] : result;
    if (output === undefined || !("output" in output)) {
      throw new Error("The workflow build did not return JavaScript");
    }
    const chunk = output.output[0];
    if (
      output.output.length !== 1 ||
      chunk?.type !== "chunk" ||
      chunk.imports.length !== 0 ||
      chunk.dynamicImports.length !== 0
    ) {
      throw new Error("The workflow must compile to standalone JavaScript");
    }
    const code = definition.graph.nodes
      .find((node) => node.definition_id === "caido/code-js")
      ?.inputs.find((input) => input.alias === "code");
    if (code === undefined) {
      throw new Error(
        "The workflow definition is missing its JavaScript input",
      );
    }
    code.value = { data: chunk.code, kind: "string" };
    const outputDirectory = fileURLToPath(new URL("../dist", import.meta.url));
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(
      path.join(outputDirectory, "nytrovertor-convert.json"),
      JSON.stringify(definition),
    );
  },
});
