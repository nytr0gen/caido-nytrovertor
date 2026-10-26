<script setup lang="ts">
import type { RequestWritableViewModeProps } from "@caido/sdk-frontend";
import type { EditorView } from "@codemirror/view";
import { computed, nextTick, onMounted, ref, watch } from "vue";

import { formatRenderError, renderNytrovertorTemplate } from "./render";

const props = defineProps<RequestWritableViewModeProps>();
const editorContainer = ref<HTMLElement>();
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

  // Caido has no header toggle, so this brittle selector may need updating after SDK upgrades
  const style = document.createElement("style");
  style.textContent =
    ".c-editor-http-request__header { display: none !important; }";
  element.shadowRoot?.append(style);

  editorView = editor.getEditorView();
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
