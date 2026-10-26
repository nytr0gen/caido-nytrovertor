<script setup lang="ts">
import type { Caido } from "@caido/sdk-frontend";
import Button from "primevue/button";
import Card from "primevue/card";
import Textarea from "primevue/textarea";
import { computed, nextTick, ref } from "vue";

import {
  findAutoDecodeTags,
  formatRenderError,
  renderNytrovertorTemplate,
} from "../nytrovertor/render";

const props = defineProps<{ sdk: Caido }>();

const input = ref("");
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

const tagReference = `Transforms
<@url>text</@>             URL encode
<@urld>text</@>            URL decode
<@urlall>text</@>          Percent-encode every UTF-8 byte
<@b64>text</@>             Base64 encode UTF-8 text
<@b64u>text</@>            Base64URL encode UTF-8 text
<@b64d>text</@>            Base64 or Base64URL decode UTF-8 text
<@hex>text</@>             Hex encode
<@hexd>text</@>            Hex decode
<@html>text</@>            HTML entity encode
<@htmld>text</@>           HTML entity decode
<@repeat(3)>text</@>       Repeat text three times
<@loop(3)>text</@>         Alias for repeat
<@>text</@>                Pass text through unchanged

Generators
<@uuid>  or <@uuid/>       Generate a UUID
<@ts>    or <@ts/>         Generate a Unix timestamp

Closing tags
</@>                       Close the current transform
</@url>                    Close a specifically named transform

Transforms can be nested. A transform without a closing tag applies through the end of the input.
repeat and loop accept integers from 0 to 100000; larger values use 100000.`;
</script>

<template>
  <div class="h-full overflow-auto p-4">
    <div class="max-w-4xl mx-auto flex flex-col gap-4">
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
                  >Length: {{ input.length }} · Lines:
                  {{ lineCount(input) }}</span
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
                    @click="input = output"
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
      <Card>
        <template #title>Nytrovertor Replay setup</template>
        <template #subtitle>
          The Nytrovertor Convert workflow is installed with this plugin.
        </template>
        <template #content>
          <ol class="m-0 list-decimal space-y-2 pl-5 text-sm">
            <li>Create a Match and Replace rule.</li>
            <li>Set Section to <code>Request Raw</code>.</li>
            <li>Set Matcher to <code>Full</code>.</li>
            <li>
              Set Replacer to <code>Workflow</code> and select
              <code>Nytrovertor Convert</code>.
            </li>
            <li>Enable the <code>Replay</code> source.</li>
          </ol>

          <p class="mt-4 mb-0 text-sm text-surface-400">
            Caido's normal Replay send action will keep the tagged template in
            the editor and send the Match and Replace result. Invalid tags and
            conversion errors leave the original request unchanged.
          </p>

          <h2 class="mt-6 mb-2 text-base font-semibold">Nytrovertor tags</h2>
          <pre
            class="m-0 overflow-x-auto rounded bg-surface-950 p-3 text-xs leading-relaxed text-surface-200"
          ><code style="user-select: text">{{ tagReference }}</code></pre>
        </template>
      </Card>
    </div>
  </div>
</template>
