import type { Caido } from "@caido/sdk-frontend";
import type { Ref } from "vue";

import {
  canRunReplayRequestAction,
  copyConvertedRequest,
  copyConvertedUrl,
} from "./actions";
import ConvertedRequestView from "./ConvertedRequestView.vue";
import { findAutoDecodeTags } from "./render";

const copyConvertedRequestCommandId = "nytrovertor.copy-converted-request";
const copyConvertedUrlCommandId = "nytrovertor.copy-converted-url";
const sendToConverterCommandId = "nytrovertor.send-to-converter";

export const registerNytrovertorFeature = (
  sdk: Caido,
  converterInput: Ref<string>,
) => {
  sdk.commands.register(sendToConverterCommandId, {
    group: "Nytrovertor",
    name: "Send to Converter",
    run: (context) => {
      if (
        context.type !== "RequestContext" &&
        context.type !== "ResponseContext"
      ) {
        return;
      }

      if (context.selection.length === 0) {
        return;
      }

      converterInput.value = findAutoDecodeTags(context.selection).reduce(
        (value, tag) => `<@${tag}>${value}</@>`,
        context.selection,
      );
      sdk.navigation.goTo("/nytrovertor");
    },
    when: (context) =>
      (context.type === "RequestContext" ||
        context.type === "ResponseContext") &&
      context.selection.length > 0,
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
  sdk.replay.addRequestViewMode({
    label: "Converted",
    view: {
      component: ConvertedRequestView,
    },
  });
};
