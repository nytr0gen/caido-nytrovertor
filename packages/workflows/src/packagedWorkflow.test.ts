import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type workflowDefinition from "./nytrovertor-convert/definition.json";

execFileSync("pnpm", ["build"], { stdio: "inherit" });
const packageDirectory = "dist/plugin_package";
const manifest: { id: string; plugins: Record<string, unknown>[] } = JSON.parse(
  await readFile(path.join(packageDirectory, "manifest.json"), "utf8"),
);
assert.equal(manifest.id, "nytrovertor");
assert.equal(manifest.plugins.length, 2);
const workflow = manifest.plugins.find((plugin) => plugin.kind === "workflow");
const frontend = manifest.plugins.find((plugin) => plugin.kind === "frontend");
assert.ok(workflow);
assert.ok(frontend);
assert.equal(workflow.id, "nytrovertor-convert");
assert.ok(typeof workflow.definition === "string");
assert.ok(typeof frontend.entrypoint === "string");
assert.ok(typeof frontend.style === "string");
await access(path.join(packageDirectory, frontend.entrypoint));
await access(path.join(packageDirectory, frontend.style));
const definition: typeof workflowDefinition = JSON.parse(
  await readFile(path.join(packageDirectory, workflow.definition), "utf8"),
);
const source: typeof workflowDefinition = JSON.parse(
  await readFile(
    "packages/workflows/src/nytrovertor-convert/definition.json",
    "utf8",
  ),
);
assert.equal(definition.id, source.id);
const code = definition.graph.nodes
  .find((node) => node.definition_id === "caido/code-js")
  ?.inputs.find((input) => input.alias === "code")?.value.data;
assert.ok(code !== undefined);
const warnings: string[] = [];
const sdk = {
  asString: (input: Uint8Array) => Buffer.from(input).toString("utf8"),
  console: { warn: (message: string) => warnings.push(message) },
};
const { run } = (await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
)) as { run: (input: Uint8Array, context: typeof sdk) => unknown };

const template = Buffer.from(
  "GET /?q=<@url><@b64>a b</@></@> HTTP/1.1\r\nHost: example.com\r\n\r\n",
);
assert.equal(
  run(template, sdk),
  "GET /?q=YSBi HTTP/1.1\r\nHost: example.com\r\n\r\n",
);
for (const value of ["plain request", "<@unknown>text", "<@urld>%"]) {
  const input = Buffer.from(value);
  assert.equal(run(input, sdk), input);
}
const input = Buffer.from("<@url>text");
assert.equal(
  run(input, {
    ...sdk,
    asString: () => {
      throw new Error("conversion failed");
    },
  }),
  input,
);
assert.equal(warnings.length, 3);
