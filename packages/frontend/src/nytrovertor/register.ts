import type { Caido } from "@caido/sdk-frontend";

import {
  canRunReplayRequestAction,
  copyConvertedRequest,
  copyConvertedUrl,
} from "./actions";
import ConvertedRequestView from "./ConvertedRequestView.vue";

const copyConvertedRequestCommandId = "nytrovertor.copy-converted-request";
const copyConvertedUrlCommandId = "nytrovertor.copy-converted-url";

export const registerNytrovertorFeature = (sdk: Caido) => {
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
    commandId: copyConvertedRequestCommandId,
    leadingIcon: "fas fa-copy",
    type: "Request",
  });
  sdk.menu.registerItem({
    commandId: copyConvertedUrlCommandId,
    leadingIcon: "fas fa-link",
    type: "Request",
  });
  sdk.replay.addRequestViewMode({
    label: "Converted",
    view: {
      component: ConvertedRequestView,
    },
  });
};
