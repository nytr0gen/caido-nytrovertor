import type { RawConfigurationOrFn } from "knip/dist/types/config.js";

const config: RawConfigurationOrFn = {
  workspaces: {
    ".": {
      entry: ["caido.config.ts", "eslint.config.mjs"],
    },
    "packages/frontend": {
      entry: ["src/index.ts", "src/**/*.test.ts"],
      project: ["src/**/*.{ts,tsx,vue}"],
    },
    "packages/workflows": {
      entry: ["src/nytrovertor-convert/javascript.ts", "src/**/*.test.ts"],
      project: ["src/**/*.ts"],
      ignoreDependencies: ["caido"],
    },
  },
};

export default config;
