import { Classic } from "@caido/primevue";
import type { Caido } from "@caido/sdk-frontend";
import PrimeVue from "primevue/config";
import { createApp, ref } from "vue";

import { registerNytrovertorFeature } from "./nytrovertor";
import "./styles/index.css";
import App from "./views/App.vue";

export const init = (sdk: Caido) => {
  const converterInput = ref("");
  const app = createApp(App, { sdk, converterInput });

  app.use(PrimeVue, {
    unstyled: true,
    pt: Classic,
  });

  const root = document.createElement("div");
  Object.assign(root.style, {
    height: "100%",
    width: "100%",
  });

  root.id = `plugin--nytrovertor`;

  app.mount(root);

  sdk.navigation.addPage("/nytrovertor", {
    body: root,
  });

  sdk.sidebar.registerItem("Nytrovertor", "/nytrovertor", {
    icon: "fas fa-bolt",
  });
  registerNytrovertorFeature(sdk, converterInput);
};
