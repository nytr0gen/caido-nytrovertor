<script setup lang="ts">
import type { Caido } from "@caido/sdk-frontend";
import Card from "primevue/card";
import type { Ref } from "vue";

import LiveConverter from "./LiveConverter.vue";
import ReplaySetup from "./ReplaySetup.vue";
import TagReference from "./TagReference.vue";

const props = defineProps<{ sdk: Caido; converterInput: Ref<string> }>();
</script>

<template>
  <div class="h-full overflow-auto p-4">
    <div class="max-w-4xl mx-auto flex flex-col gap-4">
      <LiveConverter :sdk="sdk" :converter-input="props.converterInput" />
      <Card>
        <template #title>Nytrovertor Replay setup</template>
        <template #subtitle>
          Enable conversion for this project's Replay requests.
        </template>
        <template #content>
          <ReplaySetup :sdk="sdk" />

          <p class="mt-4 mb-0 text-sm text-surface-400">
            Caido's normal Replay send action will keep the tagged template in
            the editor and send the Match and Replace result. Invalid tags and
            conversion errors leave the original request unchanged.
          </p>

          <p class="mt-4 mb-0 text-sm text-surface-400">
            In Replay, select encoded text and press <code>Ctrl+D</code> to add
            editable encoding tags, or <code>Ctrl+Shift+D</code> to send it to
            the live converter. Both actions are also in the right-click menu.
          </p>

          <TagReference />
        </template>
      </Card>
    </div>
  </div>
</template>
