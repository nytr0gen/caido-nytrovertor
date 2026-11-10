import { defaultConfig } from "@caido/eslint-config";

/** @type {import('eslint').Linter.Config } */
export default [
  ...defaultConfig(),
  {
    files: ["**/*.test.ts", "packages/workflows/src/buildWorkflow.ts"],
    settings: { browsers: ["node 22"] },
  },
];
