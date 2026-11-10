import type { StateCommand } from "@codemirror/state";

import {
  findAutoDecodeTags,
  findInverseWrapperTags,
  renderNytrovertorTemplate,
} from "./render.ts";

export const autoConvertSelection: StateCommand = ({ state, dispatch }) => {
  const selection = state.selection.main;
  if (state.readOnly || selection.empty) {
    return false;
  }

  const input = state.sliceDoc(selection.from, selection.to);
  const tags = findAutoDecodeTags(input);
  if (tags.length === 0) {
    return false;
  }

  const template = tags.reduce((value, tag) => `<@${tag}>${value}</@>`, input);
  const decoded = renderNytrovertorTemplate(template);
  if (decoded.kind === "Error" || /<\/?@/.test(decoded.value)) {
    return false;
  }

  const replacement = findInverseWrapperTags(template).reduce(
    (value, tag) => `<@${tag}>${value}</@>`,
    decoded.value,
  );
  try {
    const rendered = renderNytrovertorTemplate(replacement);
    if (
      rendered.kind === "Error" ||
      rendered.value.trim().toLowerCase().replace(/=+$/, "") !==
        input.trim().toLowerCase().replace(/=+$/, "")
    ) {
      return false;
    }
  } catch {
    return false;
  }

  dispatch(
    state.update({
      changes: { from: selection.from, to: selection.to, insert: replacement },
      selection: {
        anchor: selection.from,
        head: selection.from + replacement.length,
      },
      userEvent: "input.nytrovertor",
    }),
  );
  return true;
};
