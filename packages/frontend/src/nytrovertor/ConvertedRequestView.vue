<script setup lang="ts">
import type { RequestWritableViewModeProps } from "@caido/sdk-frontend";
import { StateEffect } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import { computed, nextTick, onMounted, ref, watch } from "vue";

import { formatRenderError, renderNytrovertorTemplate } from "./render";

const props = defineProps<RequestWritableViewModeProps>();
const editorContainer = ref<HTMLElement>();
const conversionLine = Decoration.line({
  class: "cm-nytrovertor-converted-line",
});
let editorView: EditorView | undefined;

const renderResult = computed(() => {
  return renderNytrovertorTemplate(props.draft.raw);
});

const errorMessage = computed(() => {
  return renderResult.value.kind === "Error"
    ? formatRenderError(renderResult.value)
    : undefined;
});

watch(renderResult, (result) => {
  if (editorView === undefined || result.kind === "Error") {
    return;
  }

  editorView.dispatch({
    changes: {
      from: 0,
      to: editorView.state.doc.length,
      insert: result.value,
    },
  });
});

onMounted(async () => {
  const container = editorContainer.value;
  if (container === undefined) {
    return;
  }

  const editor = props.sdk.ui.httpRequestEditor();
  const element = editor.getElement();
  element.style.height = "100%";
  element.style.width = "100%";
  container.append(element);
  await nextTick();

  // Caido's card adds a second header and footer; these internal selectors may change after SDK upgrades
  const style = document.createElement("style");
  style.textContent =
    ".c-card__header, .c-card__footer { display: none !important; } .c-card { border-radius: 0 !important; box-shadow: none !important; } .cm-nytrovertor-converted-line { background-color: hsl(var(--c-primary-400) / 0.12) !important; }";
  element.shadowRoot?.append(style);

  editorView = editor.getEditorView();
  editorView.dispatch({
    effects: StateEffect.appendConfig.of(
      EditorView.decorations.of((view) => {
        const tagOffset = props.draft.raw.indexOf("<@");
        if (tagOffset < 0) {
          return Decoration.none;
        }

        // Before the first tag, the rendered prefix is unchanged, so its line number stays the same
        const lineNumber = props.draft.raw
          .slice(0, tagOffset)
          .split("\n").length;
        if (lineNumber > view.state.doc.lines) {
          return Decoration.none;
        }

        return Decoration.set(
          conversionLine.range(view.state.doc.line(lineNumber).from),
        );
      }),
    ),
  });
  const result = renderResult.value;
  if (result.kind === "Ok") {
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: result.value,
      },
    });
  }
});
</script>

<template>
  <div style="height: 100%; position: relative">
    <div
      v-show="errorMessage === undefined"
      ref="editorContainer"
      style="height: 100%"
    />
    <div
      v-if="errorMessage !== undefined"
      style="
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        text-align: center;
        color: var(--p-surface-400);
      "
    >
      {{ errorMessage }}
    </div>
  </div>
</template>
