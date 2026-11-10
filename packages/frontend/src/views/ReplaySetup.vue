<script setup lang="ts">
import type { Caido } from "@caido/sdk-frontend";
import Button from "primevue/button";
import { onUnmounted, ref } from "vue";

import { setupReplay } from "../nytrovertor/setupReplay";

const props = defineProps<{ sdk: Caido }>();
const busy = ref(false);
const message = ref("");
const failed = ref(false);

const apply = async () => {
  if (busy.value) {
    return;
  }
  busy.value = true;
  message.value = "";
  failed.value = false;
  try {
    await setupReplay(props.sdk);
    message.value = "Replay conversion is enabled.";
  } catch (cause) {
    failed.value = true;
    message.value =
      cause instanceof Error
        ? cause.message
        : "Could not set up Replay conversion";
  } finally {
    busy.value = false;
  }
};

const projectListener = props.sdk.projects.onCurrentProjectChange(() => {
  message.value = "";
});
onUnmounted(() => projectListener.stop());
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <Button
      label="Set up Replay conversion in Match & Replace"
      icon="fas fa-check"
      size="small"
      :loading="busy"
      @click="apply"
    />
    <p
      v-if="message.length > 0"
      class="m-0 text-sm"
      :role="failed ? 'alert' : 'status'"
    >
      {{ message }}
    </p>
  </div>
</template>
