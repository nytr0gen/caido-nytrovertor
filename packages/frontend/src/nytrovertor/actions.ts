import type { Caido, RequestDraft, RequestFull } from "@caido/sdk-frontend";

import { formatRenderError, renderNytrovertorTemplate } from "./render";
import { getConvertedUrl } from "./url";

const copyText = async (
  sdk: Caido,
  text: string,
  messages: {
    failure: string;
    success: string;
  },
) => {
  try {
    await navigator.clipboard.writeText(text);
    sdk.window.showToast(messages.success, {
      variant: "success",
    });
  } catch {
    sdk.window.showToast(messages.failure, {
      variant: "error",
    });
  }
};

const isReplayPage = (sdk: Caido) => {
  return sdk.window.getContext().page?.kind === "Replay";
};

const renderReplayRequest = (sdk: Caido, rawRequest: string) => {
  const renderResult = renderNytrovertorTemplate(rawRequest);
  if (renderResult.kind === "Error") {
    sdk.window.showToast(formatRenderError(renderResult), {
      variant: "error",
    });
    return undefined;
  }

  return renderResult.value;
};

export const canRunReplayRequestAction = (
  sdk: Caido,
  context: { type: string },
) => {
  return context.type === "RequestContext" && isReplayPage(sdk);
};

export const copyConvertedRequest = async (sdk: Caido, rawRequest: string) => {
  const convertedRequest = renderReplayRequest(sdk, rawRequest);
  if (convertedRequest === undefined) {
    return;
  }

  await copyText(sdk, convertedRequest, {
    failure: "Failed to copy the converted request",
    success: "Converted request copied",
  });
};

export const copyConvertedUrl = async (
  sdk: Caido,
  request: RequestDraft | RequestFull,
) => {
  const convertedRequest = renderReplayRequest(sdk, request.raw);
  if (convertedRequest === undefined) {
    return;
  }

  const result = getConvertedUrl(convertedRequest, request);
  if (result.kind === "Error") {
    sdk.window.showToast(result.error, {
      variant: "error",
    });
    return;
  }

  await copyText(sdk, result.value, {
    failure: "Failed to copy the converted URL",
    success: "Converted URL copied",
  });
};
