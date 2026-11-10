# Nytrovertor

Template Caido Replay requests with inline transforms and generated values.

Write `<@...>` tags directly in Caido Replay requests to encode, decode, repeat, or generate text. Preview the rendered request in the `Converted` pane and send it through a Match and Replace workflow, while keeping the tagged draft in the editor.

## Use it in Replay

Add tags to a Replay request where you want the conversion:

```text
GET /search?q=<@url>Hello world</@> HTTP/1.1
```

The `Converted` request pane previews `GET /search?q=Hello%20world HTTP/1.1`. Tags can be nested; `<@url><@b64>Hello world</@></@>` Base64-encodes the text, then URL-encodes the result. The request context menu can also copy the converted request or URL.

Select encoded text and press **Ctrl+D**, or right-click → **Auto Convert Selection**, to turn it into editable encoding tags. For example, `YSUyMGI=` becomes `<@b64><@url>a b</@></@>`.

To send converted requests, open **Nytrovertor** and click **Set up Replay conversion in Match & Replace**. This enables one project-specific rule: **Request Raw → Full → Workflow: Nytrovertor Convert**, with **Replay** as its only source and no condition. Setup reports conflicting settings or duplicates without changing them.

The Convert workflow is included in the plugin package and updates with it. Use the setup button once per project, or to re-enable its rule.

Send with Caido's normal Replay action. The workflow converts the complete raw request just before sending; the tagged draft remains in the editor. If a tag or conversion fails, it sends the original request unchanged.

## Try tags in the live converter

Open **Nytrovertor** from the Caido sidebar to experiment with tags before using them in Replay. Enter a template in **Input** and see the result update in **Output** as you type.

Press **Ctrl+Shift+D**, or right-click → **Send to Converter**, to open selected request or response text here with automatic decoder tags.

**Auto** detects likely layers of URL, HTML entity, Base64, or Hex encoding and inserts the corresponding decoder tags. Select part of the input to target it, or leave nothing selected to use the whole input. For example, `SGVsbG8%3D` becomes `<@b64d><@urld>SGVsbG8%3D</@></@>` and renders as `Hello`.

## Tag reference

| Tag | Result |
| --- | --- |
| `<@url>text</@>` | URL-encode text |
| `<@urld>text</@>` | URL-decode text |
| `<@urldplus>text</@>` | URL-decode text, treating `+` as a space |
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

`</@>` closes the current transform. A named closing tag such as `</@url>` must match its opening tag. A transform left open applies through the end of the input, including across lines. `repeat` and `loop` accept non-negative integers and cap values above `100000`.

## Build from source

Use Node.js 22.18 or newer and pnpm 12.14.0:

```sh
pnpm install
pnpm build
```

Install `dist/plugin_package.zip` in Caido. The package contains the frontend and the `Nytrovertor Convert` workflow; there is no backend plugin.

For development, run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm knip`. `pnpm build` and `pnpm watch` run `caido-dev build` and `caido-dev watch`. A Vite hook compiles the workflow, and a pinned pnpm patch adds it to the CLI's package bundler. Watch rebuilds after changes to the frontend, workflow entry, shared renderer, or workflow definition and serves the package to Caido Devtools at `http://localhost:3000`.
