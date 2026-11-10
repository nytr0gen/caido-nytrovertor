import { EditorState } from "@codemirror/state";

import { autoConvertSelection } from "./autoConvert.ts";
import { renderNytrovertorTemplate } from "./render.ts";

const successCases = [
  ["YSUyMGI=", "<@b64><@url>a b</@></@>"],
  ["SGVsbG8%3D", "<@url><@b64>Hello</@></@>"],
  ["SGVsbG8=", "<@b64>Hello</@>"],
  ["SGVsbG8", "<@b64>Hello</@>", "SGVsbG8="],
  ["dGVzdA", "<@b64>test</@>", "dGVzdA=="],
  ["dGVzdA=", "<@b64>test</@>", "dGVzdA=="],
  ["dGVzdA==", "<@b64>test</@>"],
  [" \tdGVzdA\n ", "<@b64>test</@>", "dGVzdA=="],
  ["74657374", "<@hex>test</@>"],
  ["&lt;", "<@html><</@>"],
  ["a%20b", "<@url>a b</@>"],
  ["%2f", "<@url>/</@>", "%2F"],
  ["68656c6c6f", "<@hex>hello</@>", "68656C6C6F"],
  [" \tSGVsbG8=\n ", "<@b64>Hello</@>", "SGVsbG8="],
] as const;

for (const [input, expected, expectedRendered = input] of successCases) {
  for (const backwards of [false, true]) {
    const prefix = "GET /?q=";
    const suffix = " HTTP/1.1\nHost: example.com\n\n";
    const from = prefix.length;
    const to = from + input.length;
    let state = EditorState.create({
      doc: prefix + input + suffix,
      selection: backwards
        ? { anchor: to, head: from }
        : { anchor: from, head: to },
    });
    let dispatches = 0;
    const run = () =>
      autoConvertSelection({
        state,
        dispatch: (transaction) => {
          state = transaction.state;
          dispatches += 1;
        },
      });

    if (!run()) {
      throw new Error(`Expected ${input} to convert`);
    }
    if (
      dispatches !== 1 ||
      state.doc.toString() !== prefix + expected + suffix ||
      state.selection.main.from !== from ||
      state.selection.main.to !== from + expected.length
    ) {
      throw new Error(`Expected ${input} to become selected ${expected}`);
    }
    const rendered = renderNytrovertorTemplate(state.doc.toString());
    if (
      rendered.kind !== "Ok" ||
      rendered.value !== prefix + expectedRendered + suffix
    ) {
      throw new Error(
        `Unexpected rendered request after converting ${JSON.stringify(input)}`,
      );
    }
    if (run() || dispatches !== 1) {
      throw new Error("A second press must leave the tags intact");
    }
  }
}

const originalRandom = Math.random;
let generatorCalls = 0;
try {
  Math.random = () => {
    generatorCalls += 1;
    return 0.5;
  };
  const input = "PEB1dWlkPg==";
  const state = EditorState.create({
    doc: input,
    selection: { anchor: 0, head: input.length },
  });
  if (
    autoConvertSelection({
      state,
      dispatch: () => {
        throw new Error("Encoded tags must leave the selection unchanged");
      },
    })
  ) {
    throw new Error("Encoded tags must not be converted");
  }
} finally {
  Math.random = originalRandom;
}
if (generatorCalls !== 0) {
  throw new Error("Validation must not execute decoded generator tags");
}

for (const input of [
  "",
  "hello",
  "%GG",
  "%00",
  "41",
  "<@b64>Hello</@>",
  "<@unknown>text</@>",
  "PEB1dWlkPg==",
  "%3C%2F%40%3E",
  "%26%23xD800%3B",
  "%26%23xDFFF%3B",
  "74:65:73:74",
  "&#60;",
  "SGVs bG8=",
  "dG=VzdA",
  "dGVzdA===",
  "SGVsbG8_",
  "A".repeat(65537),
]) {
  const state = EditorState.create({
    doc: input,
    selection: { anchor: 0, head: input.length },
  });
  if (
    autoConvertSelection({
      state,
      dispatch: () => {
        throw new Error("Unsafe or unrecognized input must stay intact");
      },
    })
  ) {
    throw new Error(`Unexpected conversion of ${JSON.stringify(input)}`);
  }
}

for (const readOnly of [false, true]) {
  const input = "YSUyMGI=";
  const state = EditorState.create({
    doc: input,
    selection: { anchor: 0, head: readOnly ? input.length : 0 },
    extensions: EditorState.readOnly.of(readOnly),
  });
  if (
    autoConvertSelection({
      state,
      dispatch: () => {
        throw new Error("An empty or read-only selection must stay intact");
      },
    })
  ) {
    throw new Error("Unexpected conversion of an empty or read-only selection");
  }
}
