<script setup lang="ts">
const tagReference = `Transforms
<@url>text</@>             URL encode
<@urld>text</@>            URL decode
<@urldplus>text</@>        URL decode, treating + as space
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
<@b64|url>text</@>         Compose transforms; url runs before b64

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
  <h2 class="mt-6 mb-2 text-base font-semibold">Nytrovertor tags</h2>
  <pre
    class="m-0 overflow-x-auto rounded bg-surface-950 p-3 text-xs leading-relaxed text-surface-200"
  ><code style="user-select: text">{{ tagReference }}</code></pre>
</template>
