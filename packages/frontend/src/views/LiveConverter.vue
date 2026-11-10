<script setup lang="ts">
import type { Caido } from "@caido/sdk-frontend";
import Button from "primevue/button";
import Card from "primevue/card";
import Textarea from "primevue/textarea";
import { computed, nextTick, ref, type Ref } from "vue";

import {
  findAutoDecodeTags,
  findInverseWrapperTags,
  formatRenderError,
  renderNytrovertorTemplate,
} from "../nytrovertor/render";

const props = defineProps<{ sdk: Caido; converterInput: Ref<string> }>();

const input = props.converterInput;
const result = computed(() => renderNytrovertorTemplate(input.value));
const output = computed(() =>
  result.value.kind === "Ok" ? result.value.value : "",
);
const error = computed(() =>
  result.value.kind === "Error" ? formatRenderError(result.value) : "",
);
const lineCount = (text: string) =>
  text.length === 0 ? 0 : text.split("\n").length;
const inputSelection = ref({ start: 0, end: 0 });
const outputSelection = ref({ start: 0, end: 0 });

const getSelection = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement;
  return { start: textarea.selectionStart, end: textarea.selectionEnd };
};
const updateInputSelection = (event: Event) => {
  inputSelection.value = getSelection(event);
};
const updateOutputSelection = (event: Event) => {
  outputSelection.value = getSelection(event);
};

const copyText = async (text: string, description: string) => {
  try {
    await navigator.clipboard.writeText(text);
    props.sdk.window.showToast(`${description} copied`, { variant: "success" });
  } catch {
    props.sdk.window.showToast(`Failed to copy ${description.toLowerCase()}`, {
      variant: "error",
    });
  }
};

const autoDecode = async () => {
  const textarea = document.getElementById("nytrovertor-input");
  if (!(textarea instanceof HTMLTextAreaElement)) {
    return;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const hasSelection = end > start;
  const target = hasSelection ? input.value.slice(start, end) : input.value;
  const tags = findAutoDecodeTags(target);
  if (tags.length === 0) {
    props.sdk.window.showToast("No safe decoding chain found", {
      variant: "info",
    });
    return;
  }

  const wrapped = tags.reduce((value, tag) => `<@${tag}>${value}</@>`, target);
  input.value = hasSelection
    ? input.value.slice(0, start) + wrapped + input.value.slice(end)
    : wrapped;

  await nextTick();
  const caret = hasSelection ? start + wrapped.length : wrapped.length;
  textarea.focus();
  textarea.setSelectionRange(caret, caret);
  inputSelection.value = { start: caret, end: caret };
};

const useAsInput = () => {
  const tags = findInverseWrapperTags(input.value);
  input.value = tags.reduce(
    (value, tag) => `<@${tag}>${value}</@>`,
    output.value,
  );
};
</script>

<template>
  <Card>
    <template #title>Live converter</template>
    <template #subtitle
      >Write tags or select encoded text and click Auto; the converted text
      updates as you type.</template
    >
    <template #content>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <label for="nytrovertor-input" class="text-sm font-medium"
              >Input</label
            >
            <div class="flex items-center gap-1">
              <Button
                label="Auto"
                icon="fas fa-wand-magic-sparkles"
                size="small"
                text
                :disabled="input.length === 0"
                @click="autoDecode"
              />
              <Button
                label="Copy"
                icon="fas fa-copy"
                size="small"
                text
                :disabled="input.length === 0"
                @click="copyText(input, 'Input text')"
              />
            </div>
          </div>
          <Textarea
            id="nytrovertor-input"
            v-model="input"
            rows="15"
            class="w-full font-mono"
            placeholder="<@url>Hello world</@>"
            @select="updateInputSelection"
            @click="updateInputSelection"
            @keyup="updateInputSelection"
            @input="updateInputSelection"
          />
          <div
            class="flex items-center justify-between gap-4 whitespace-nowrap text-xs text-surface-400"
          >
            <span>
              Selection: start {{ inputSelection.start }} · end
              {{ inputSelection.end }} · length
              {{ inputSelection.end - inputSelection.start }}
            </span>
            <span
              >Length: {{ input.length }} · Lines: {{ lineCount(input) }}</span
            >
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <label for="nytrovertor-output" class="text-sm font-medium"
              >Output</label
            >
            <div class="flex items-center gap-1">
              <Button
                label="Use as input"
                icon="fas fa-arrow-up"
                size="small"
                text
                :disabled="output.length === 0"
                @click="useAsInput"
              />
              <Button
                label="Copy"
                icon="fas fa-copy"
                size="small"
                text
                :disabled="output.length === 0"
                @click="copyText(output, 'Converted text')"
              />
            </div>
          </div>
          <Textarea
            id="nytrovertor-output"
            :model-value="output"
            rows="15"
            readonly
            class="w-full font-mono"
            placeholder="Converted text appears here"
            @select="updateOutputSelection"
            @click="updateOutputSelection"
            @keyup="updateOutputSelection"
          />
          <div
            class="flex items-center justify-between gap-4 whitespace-nowrap text-xs text-surface-400"
          >
            <span>
              Selection: start {{ outputSelection.start }} · end
              {{ outputSelection.end }} · length
              {{ outputSelection.end - outputSelection.start }}
            </span>
            <span
              >Length: {{ output.length }} · Lines:
              {{ lineCount(output) }}</span
            >
          </div>
          <p v-if="error" class="m-0 text-sm text-red-400" role="alert">
            {{ error }}
          </p>
        </div>
      </div>
    </template>
  </Card>
</template>
