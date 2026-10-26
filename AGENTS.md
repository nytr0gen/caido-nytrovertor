# AGENTS.md

## Purpose

This file should be updated whenever work on the repo uncovers new Caido SDK quirks, workflow traps, or implementation caveats. Treat it as self-healing project memory, not static documentation.

This repository is a Caido Replay templating and conversion plugin with:

- `packages/frontend`: Vue + PrimeVue UI running inside the Caido app
- `packages/workflows`: packaged Caido workflow sources
- `caido.config.ts`: plugin packaging/configuration

Use this file as the working contract for any agent making changes in this repo.

## Project Structure

- Keep frontend work inside `packages/frontend`.
- Keep packaged workflow sources inside `packages/workflows`.
- Preserve the current plugin mounting pattern in `packages/frontend/src/index.ts`, including the prefixed root element used to avoid style collisions.
- The current plugin identity is `nytrovertor`.
- Frontend feature wiring belongs in `packages/frontend/src/index.ts`.
- Nytrovertor Replay templating behavior is organized under `packages/frontend/src/nytrovertor`.
- The Nytrovertor Match and Replace Convert workflow is organized under `packages/workflows/src/nytrovertor-convert`.

## Required Workflow

1. Read the relevant files before changing them.
2. Keep changes scoped to the package you are working in unless the feature clearly crosses frontend/workflow boundaries.
3. After significant changes, run:
   - `pnpm lint`
   - `pnpm typecheck`
4. If a change removes or restructures code broadly, also run `pnpm knip`.
5. If you discover a new SDK limitation, shortcut caveat, or behavior trap while implementing or debugging, update this file in the same change.

## General Coding Rules

- Use TypeScript for all code changes.
- Use `type`, not `interface`.
- Do not use `any`.
- Do not cast to `any`.
- Prefer `undefined` over `null`.
- Avoid unnecessary `try`/`catch`.
- Do not add generated code comments unless the user explicitly asks for them.
- Keep abstractions minimal. Do not create helpers or alias types unless they materially improve the code.
- Declare variables close to where they are used.
- Colocate code that changes together.

## Naming and Organization

- Use camelCase for folders such as `requestViewer`.
- Use PascalCase for component folders.
- Use camelCase for non-component filenames.
- If a Vue component grows beyond a single file, prefer this structure:

```text
ComponentName/
  index.ts
  Container.vue
  useForm.ts
  DependentComponent.vue
```

- Re-export component entry points from `index.ts`.

## Frontend Rules

- Use Vue with `<script setup lang="ts">`.
- Prefer PrimeVue components for UI instead of custom controls.
- Match Caido's dark UI and use surface tokens for colors where possible.
- Keep the UI visually minimal; avoid introducing extra color.
- Use only Font Awesome solid icons in the form `fas fa-*`.
- Prefer `Card`, `Splitter`, `SplitterPanel`, and `DataTable` when they fit the interaction.
- Use friendly, minimal empty states.
- When displaying tabular data, prefer `DataTable` and place action columns last.

## Caido Frontend SDK Rules

- Use the documented SDK APIs directly.
- Do not add runtime checks like `if ("showToast" in sdk.window)`.
- Do not assume undocumented SDK methods exist.
- Commands are frontend-only and should be registered through the frontend SDK.
- Global shortcuts and command palette invocations run with `BaseContext`, not request-specific context.
- Do not assume a shortcut can access the currently selected request row or request pane unless it is attached to an editor extension that provides editor-local state.
- Keep `@caido/sdk-frontend` current and use its exported SDK and request types directly instead of maintaining local compatibility wrappers.

## Caido-Specific Guidance

- This plugin runs inside Caido, not as a standalone web app.
- Frontend UI is rendered inside a Caido-managed panel/window.
- If working with requests/responses, use documented Caido SDK types and helpers directly.

## Nytrovertor Caveats

- The plugin identity and route are `nytrovertor` and `/nytrovertor`; keep the root ID `plugin--nytrovertor` aligned with the CSS prefix in `caido.config.ts`.
- The plugin contains only a frontend and a packaged Convert workflow. Do not restore the former toolkit utilities or backend.
- Converted URL copying uses connection details from `RequestContext.request` and a rendered Host header override. It requires no backend request lookup and works for Replay drafts without a saved request ID.
- Imported frontend CSS is prefix-wrapped under `#plugin--nytrovertor`; Caido-hosted view modes are outside that root.
- Nytrovertor is Replay-only in v1.
- Nytrovertor keeps `<@...>` tags in the Replay editor and renders the converted output in the custom Replay request view mode labeled `Converted`.
- Replay request view modes receive the live draft as the `draft` prop with current `@caido/sdk-frontend` typings; use `draft.raw` directly instead of mirroring editor state through a CodeMirror extension or plugin store.
- Nytrovertor transformed sends go through the packaged `Nytrovertor Convert` workflow plus a user-created Match and Replace rule: `Request Raw`, `Full`, `Workflow: Nytrovertor Convert`, source `Replay`.
- Nytrovertor does not own Replay sending or bind `Ctrl/Cmd+Enter`; Caido's native send action applies the Match and Replace workflow while leaving the tagged draft in the editor.
- Caido 0.57 removed `raw`, `connectionInfo`, `overwriteDraft`, and `updateContentLength` from the frontend `SendRequestOptions`; `sdk.replay.sendRequest(...)` sends the session's current draft and only exposes the `background` option.
- Caido 0.57's GraphQL `startReplayTask` mutation is also draft-based and accepts only a Replay session ID. Using GraphQL to send converted raw text would still require mutating the Replay entry draft first (including its connection, editor state, and settings), so it is not a direct replacement for the removed frontend send options.
- A Match and Replace `Workflow` replacer runs a Convert workflow on the bytes matched by that rule. Current Caido exposes `Request Raw`, so a `Full` matcher passes the complete raw request to Nytrovertor in one workflow invocation.
- Caido sends an empty replacement when a Match and Replace workflow throws. The Nytrovertor workflow must catch runtime failures and return the original input; parser or transform errors must also return the original input instead of throwing.
- Caido plugin manifests support `kind: "workflow"` components, but both the installed `@caido-community/dev` 0.1.6 and the latest published 0.1.7 accept workflow entries in `caido.config.ts` and then omits them while building the package because its build/bundle path only emits frontend and backend outputs. The root build therefore runs `scripts/packageWorkflow.mjs` after `caido-dev build` to compile the workflow, append it to the manifest, and rebuild the ZIP.
- `pnpm watch` does not run the workflow packaging postprocessor. After changing workflow code or its shared renderer, run `pnpm build` and reinstall the generated package to test the packaged workflow.
- `Copy Converted Request` is registered as a `RequestContext` menu item but must stay gated to the Replay page through the command `when(...)` handler.
- The Nytrovertor transform registry and conversion engine live in `packages/workflows/src/nytrovertor-convert/render.ts`. The workflow owns this implementation and the frontend imports it for preview and copy behavior; do not make the workflow depend on frontend/plugin code.
- The Nytrovertor renderer must remain standalone and compatible with Caido's QuickJS workflow runtime. Avoid browser-only globals such as `window`, `document`, `btoa`, `atob`, `TextEncoder`, `TextDecoder`, or Web Crypto in that module.
- Nytrovertor generator tags such as `uuid` and `ts` should accept both `<@tag>` and `<@tag/>`; do not require closing tags for generators.
- The Nytrovertor null transform `<@>...</@>` uses the normal paired transform parser and passes its contents through unchanged.
- Any paired Nytrovertor transform without a closing tag applies through the end of the input. Nested transforms implicitly close from innermost to outermost at EOF, while mismatched named closing tags remain errors.
- Nytrovertor transform tags may use the exact wildcard closing form `</@>` to close the current open transform; named closing tags should stay strict and must still match the current transform when present.
- `repeat` and its exact alias `loop` are transform-only Nytrovertor tags with required integer argument syntax such as `<@repeat(n)>...</@>` or `<@loop(n)>...</@>`; allow `0`, reject spaces/decimals/negatives, and cap values above `100000` at that limit.
- `htmld` must stay a pure string/entity decoder in `packages/workflows/src/nytrovertor-convert/render.ts`; do not reintroduce DOM parsing through `innerHTML` or `DOMParser`.
- Nytrovertor preview, copy, and workflow execution rerender from their current template input each time; do not cache rendered results just to stabilize `uuid` or `ts`.
- Request menu items registered through `sdk.menu.registerItem(...)` are global across Caido request panes. A command `when(...)` handler prevents execution outside its intended page but does not hide the menu item there; use a page-specific slot when the action must only be visible on one page.

## Lint and Safety Notes

- CI uses Node.js 22.18 or newer because `pnpm test` runs erasable TypeScript directly with Node's built-in type stripping. Validation must include tests and the full workflow package build.

- The installed pnpm accepts `trustPolicy: off`; `ignore` fails workspace configuration parsing before any command runs.
- Quote the lint file glob so the shell does not expand stale or empty package directories after package removal.
- The ESLint config is authoritative. Fix lint issues instead of working around them.
- Be explicit with nullable and empty string checks. Do not rely on loose falsy checks when the value can be a string.
- For derived Vue state, prefer `computed` instead of extra reactive state when possible.
- This workspace may not have installed dependencies. If `pnpm lint` or `pnpm typecheck` fail because `node_modules` is missing, say so explicitly instead of implying validation passed.

## Current Repo Context

- Frontend bootstrap: `packages/frontend/src/index.ts`.
- Replay features: `packages/frontend/src/nytrovertor`.
- Setup and tag reference: `packages/frontend/src/views/App.vue`.
- Shared renderer and packaged Convert workflow: `packages/workflows/src/nytrovertor-convert`.
- Workflow packaging postprocessor: `scripts/packageWorkflow.mjs`.
