import type { Caido, CommandContext } from "@caido/sdk-frontend";
import type { Ref } from "vue";

import {
  canRunReplayRequestAction,
  copyConvertedRequest,
  copyConvertedUrl,
} from "./actions";
import { autoConvertSelection } from "./autoConvert";
import ConvertedRequestView from "./ConvertedRequestView.vue";
import { findAutoDecodeTags } from "./render";

const copyConvertedRequestCommandId = "nytrovertor.copy-converted-request";
const copyConvertedUrlCommandId = "nytrovertor.copy-converted-url";
const sendToConverterCommandId = "nytrovertor.send-to-converter";
const autoConvertCommandId = "nytrovertor.auto-convert-selection";

export const registerNytrovertorFeature = (
  sdk: Caido,
  converterInput: Ref<string>,
) => {
  const getAutoConvertEditor = (context: CommandContext) => {
    if (
      sdk.window.getContext().page?.kind !== "Replay" ||
      (context.type !== "BaseContext" && context.type !== "RequestContext")
    ) {
      return undefined;
    }

    const editor = sdk.window.getActiveEditor();
    if (editor === undefined || editor.isReadOnly()) {
      return undefined;
    }

    const selection = editor.getSelectedText();
    if (
      selection.length === 0 ||
      (context.type === "BaseContext"
        ? !editor.getEditorView().hasFocus
        : selection !== context.selection)
    ) {
      return undefined;
    }

    return editor;
  };

  sdk.commands.register(autoConvertCommandId, {
    group: "Nytrovertor",
    name: "Auto Convert Selection",
    run: (context) => {
      const editor = getAutoConvertEditor(context);
      if (editor === undefined) {
        return;
      }

      if (autoConvertSelection(editor.getEditorView())) {
        editor.focus();
      }
    },
    when: (context) => getAutoConvertEditor(context) !== undefined,
  });

  sdk.shortcuts.register(autoConvertCommandId, ["Control", "D"]);

  const getConverterSelection = (context: CommandContext) => {
    if (
      context.type === "RequestContext" ||
      context.type === "ResponseContext"
    ) {
      return context.selection;
    }

    return context.type === "BaseContext"
      ? (sdk.window.getActiveEditor()?.getSelectedText() ?? "")
      : "";
  };

  sdk.commands.register(sendToConverterCommandId, {
    group: "Nytrovertor",
    name: "Send to Converter",
    run: (context) => {
      const selection = getConverterSelection(context);
      if (selection.length === 0) {
        return;
      }

      converterInput.value = findAutoDecodeTags(selection).reduce(
        (value, tag) => `<@${tag}>${value}</@>`,
        selection,
      );
      sdk.navigation.goTo("/nytrovertor");
    },
    when: (context) => getConverterSelection(context).length > 0,
  });

  sdk.shortcuts.register(sendToConverterCommandId, ["Control", "Shift", "D"]);

  sdk.commands.register(copyConvertedRequestCommandId, {
    group: "Nytrovertor",
    name: "Copy Converted Request",
    run: async (context) => {
      if (context.type !== "RequestContext") {
        return;
      }

      await copyConvertedRequest(sdk, context.request.raw);
    },
    when: (context) => {
      return canRunReplayRequestAction(sdk, context);
    },
  });

  sdk.commands.register(copyConvertedUrlCommandId, {
    group: "Nytrovertor",
    name: "Copy Converted URL",
    run: async (context) => {
      if (context.type !== "RequestContext") {
        return;
      }

      await copyConvertedUrl(sdk, context.request);
    },
    when: (context) => {
      return canRunReplayRequestAction(sdk, context);
    },
  });

  sdk.menu.registerItem({
    commandId: copyConvertedUrlCommandId,
    leadingIcon: "fas fa-link",
    type: "Request",
  });
  sdk.menu.registerItem({
    commandId: copyConvertedRequestCommandId,
    leadingIcon: "fas fa-copy",
    type: "Request",
  });
  sdk.menu.registerItem({
    commandId: autoConvertCommandId,
    leadingIcon: "fas fa-wand-magic-sparkles",
    type: "Request",
  });
  sdk.menu.registerItem({
    commandId: sendToConverterCommandId,
    leadingIcon: "fas fa-arrow-right",
    type: "Request",
  });
  sdk.menu.registerItem({
    commandId: sendToConverterCommandId,
    leadingIcon: "fas fa-arrow-right",
    type: "Response",
  });
  sdk.replay.addRequestViewMode({
    label: "Converted",
    view: {
      component: ConvertedRequestView,
    },
  });
};
