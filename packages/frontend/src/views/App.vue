<script setup lang="ts">
import Card from "primevue/card";

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
    <Card class="max-w-4xl mx-auto">
      <template #title>Nytrovertor Replay setup</template>
      <template #subtitle>
        The Nytrovertor Convert workflow is installed with this plugin.
      </template>
      <template #content>
        <ol class="m-0 pl-5 flex flex-col gap-2 text-sm">
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
          Caido's normal Replay send action will keep the tagged template in the
          editor and send the Match and Replace result. Invalid tags and
          conversion errors leave the original request unchanged.
        </p>

        <h2 class="mt-6 mb-2 text-base font-semibold">Nytrovertor tags</h2>
        <pre
          class="m-0 overflow-x-auto rounded bg-surface-950 p-3 text-xs leading-relaxed text-surface-200"
        ><code>{{ tagReference }}</code></pre>

        <h2 class="mt-6 mb-2 text-base font-semibold">Replay tools</h2>
        <ul class="m-0 pl-5 flex flex-col gap-2 text-sm">
          <li>
            Open the <code>Converted</code> request pane to preview the current
            template without changing the editor.
          </li>
          <li>
            Use <code>Copy Converted Request</code> or
            <code>Copy Converted URL</code> from the Replay request context
            menu.
          </li>
          <li>
            Send with Caido's normal Replay action after enabling the workflow
            rule above.
          </li>
        </ul>
      </template>
    </Card>
  </div>
</template>
