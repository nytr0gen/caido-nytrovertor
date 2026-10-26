<script setup lang="ts">
import type { RequestWritableViewModeProps } from "@caido/sdk-frontend";
import { computed } from "vue";

import { formatRenderError, renderNytrovertorTemplate } from "./render";

import RequestViewer from "@/requestViewer/RequestViewer.vue";

const props = defineProps<RequestWritableViewModeProps>();

const renderResult = computed(() => {
  return renderNytrovertorTemplate(props.draft.raw);
});

const convertedRawRequest = computed(() => {
  return renderResult.value.kind === "Ok" ? renderResult.value.value : "";
});

const errorMessage = computed(() => {
  return renderResult.value.kind === "Error"
    ? formatRenderError(renderResult.value)
    : undefined;
});
</script>

<template>
  <RequestViewer
    :error-message="errorMessage"
    :raw-request="convertedRawRequest"
  />
</template>
