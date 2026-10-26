# Nytrovertor

Request templating and conversion for Caido Replay.

## Features

- Write Nytrovertor tags in the plugin page and see the converted text update live, with a Copy button for the result.
- Write nested transform tags directly in Replay while keeping the tagged template in the editor.
- Preview the rendered request in the `Converted` request pane.
- Send rendered requests through the packaged `Nytrovertor Convert` Match and Replace workflow.
- Copy the converted request or URL from the Replay request context menu.
- Preserve the original request when parsing or conversion fails.

## Nytrovertor tags

| Tag | Result |
| --- | --- |
| `<@url>text</@>` | URL-encode text |
| `<@urld>text</@>` | URL-decode text |
| `<@urlall>text</@>` | Percent-encode every UTF-8 byte |
| `<@b64>text</@>` | Base64-encode UTF-8 text |
| `<@b64u>text</@>` | Base64URL-encode UTF-8 text |
| `<@b64d>text</@>` | Decode standard or URL-safe Base64 |
| `<@hex>text</@>` | Hex-encode text |
| `<@hexd>text</@>` | Hex-decode text |
| `<@html>text</@>` | Encode HTML entities |
| `<@htmld>text</@>` | Decode HTML entities |
| `<@repeat(3)>text</@>` | Repeat text; `<@loop(3)>` is an alias |
| `<@>text</@>` | Pass text through unchanged |
| `<@uuid>` or `<@uuid/>` | Generate a UUID |
| `<@ts>` or `<@ts/>` | Generate a Unix timestamp |

Transforms can be nested. `</@>` closes the current transform, while a named closing tag such as `</@url>` must match the current transform. A transform without a closing tag applies through the end of the request, including across line breaks. Nested transforms left open at the end close from innermost to outermost.

`repeat` and `loop` accept non-negative integers. Values above `100000` are capped.

## Enable converted Replay sending

The plugin installs the `Nytrovertor Convert` workflow, but you need to connect it to Replay with one Match and Replace rule:

1. Create a Match and Replace rule.
2. Set the section to `Request Raw`.
3. Set the matcher to `Full`.
4. Set the replacer to `Workflow` and select `Nytrovertor Convert`.
5. Set the source to `Replay` and enable the rule.

Use Replay's normal send action after that. The tagged template stays in the editor, while the workflow converts the complete raw request immediately before it is sent. If conversion fails, the workflow returns the original request instead of an empty replacement.

## Development

Use Node.js 22 and pnpm 12.14.0. CI validates lint, types, tests, unused code, and
the complete frontend/workflow package on pushes and pull requests.

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm knip
pnpm build
```

Install `dist/plugin_package.zip` in Caido. The plugin includes a frontend and the
Convert workflow; it does not require a backend plugin. Open **Nytrovertor** in the
sidebar for setup instructions and the tag reference.

`pnpm watch` watches the frontend, but does not package workflow changes. Run
`pnpm build` and reinstall the package after changing the workflow or renderer.
