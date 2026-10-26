import type { BytesInput, SDK } from "caido:workflow";

import { formatRenderError, renderNytrovertorTemplate } from "./render";

export function run(input: BytesInput, sdk: SDK) {
  try {
    const original = sdk.asString(input);
    if (!original.includes("<@")) {
      return input;
    }

    const result = renderNytrovertorTemplate(original);
    if (result.kind === "Error") {
      sdk.console.warn(`Nytrovertor: ${formatRenderError(result)}`);
      return input;
    }

    return result.value;
  } catch (error) {
    sdk.console.warn(
      `Nytrovertor: conversion failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    return input;
  }
}
