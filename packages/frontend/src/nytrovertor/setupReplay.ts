import type { Caido } from "@caido/sdk-frontend";

type SetupSDK = {
  projects: Pick<Caido["projects"], "onCurrentProjectChange">;
  graphql: Pick<Caido["graphql"], "pluginPackages" | "tamperRuleCollections">;
  matchReplace: Pick<
    Caido["matchReplace"],
    "createCollection" | "createRule" | "toggleRule"
  >;
};

type Rule = Awaited<
  ReturnType<Caido["graphql"]["tamperRuleCollections"]>
>["tamperRuleCollections"][number]["rules"][number];
const ruleName = "Nytrovertor Convert";

const getWorkflowId = (rule: Rule) => {
  const operation = rule.section.operation;
  return "replacer" in operation &&
    operation.replacer.__typename === "TamperReplacerWorkflow"
    ? operation.replacer.id
    : undefined;
};

const readSetup = async (sdk: SetupSDK) => {
  const { pluginPackages } = await sdk.graphql.pluginPackages();
  const candidates = pluginPackages
    .filter((pkg) => pkg.manifestId === "nytrovertor")
    .flatMap((pkg) => pkg.plugins)
    .filter((plugin) => plugin.__typename === "PluginWorkflow")
    .filter((plugin) => plugin.manifestId === "nytrovertor-convert");
  if (candidates.length > 1) {
    throw new Error("Multiple Nytrovertor workflows found");
  }
  const plugin = candidates[0];
  const workflow = plugin?.workflow;
  if (plugin?.enabled !== true || workflow?.kind !== "CONVERT") {
    throw new Error(
      "Enable the packaged Nytrovertor Convert workflow in Plugins first",
    );
  }
  const { tamperRuleCollections } = await sdk.graphql.tamperRuleCollections();
  const rules = tamperRuleCollections
    .flatMap((collection) => collection.rules)
    .filter(
      (rule) => rule.name === ruleName || getWorkflowId(rule) === workflow.id,
    );
  const rule = rules[0];
  if (rules.length > 1) {
    throw new Error("Multiple Nytrovertor rules found");
  }
  if (rule !== undefined) {
    const section = rule.section;
    if (
      section.__typename !== "TamperSectionRequestAll" ||
      section.operation.__typename !== "TamperOperationAllRaw" ||
      section.operation.matcher.__typename !== "TamperMatcherFull" ||
      section.operation.replacer.__typename !== "TamperReplacerWorkflow" ||
      section.operation.replacer.id !== workflow.id ||
      rule.sources.length !== 1 ||
      rule.sources[0] !== "REPLAY" ||
      (rule.condition !== undefined &&
        rule.condition !== null &&
        (rule.condition.__typename !== "HTTPQL" ||
          rule.condition.code.trim() !== ""))
    ) {
      throw new Error(
        "The existing Nytrovertor rule must use Request Raw, Full, Nytrovertor Convert, Replay only, and no condition",
      );
    }
  }
  return {
    workflow,
    rule,
    collectionId: tamperRuleCollections.find(
      (collection) => collection.name === "Nytrovertor",
    )?.id,
  };
};

export const setupReplay = async (sdk: SetupSDK): Promise<void> => {
  let projectChanged = false;
  const listener = sdk.projects.onCurrentProjectChange(() => {
    projectChanged = true;
  });
  const assertCurrent = () => {
    if (projectChanged) {
      throw new Error("The project changed during setup");
    }
  };
  try {
    const state = await readSetup(sdk);
    assertCurrent();
    let ruleId = state.rule?.id;
    if (ruleId === undefined) {
      let collectionId = state.collectionId;
      if (collectionId === undefined) {
        collectionId = (
          await sdk.matchReplace.createCollection({ name: "Nytrovertor" })
        ).id;
      }
      assertCurrent();
      ruleId = (
        await sdk.matchReplace.createRule({
          name: ruleName,
          query: "",
          section: {
            kind: "SectionRequestAll",
            operation: {
              kind: "OperationAllRaw",
              matcher: { kind: "MatcherRawFull" },
              replacer: {
                kind: "ReplacerWorkflow",
                workflowId: state.workflow.id,
              },
            },
          },
          sources: ["REPLAY"],
          collectionId,
        })
      ).id;
    }
    assertCurrent();
    if (state.rule?.enable === undefined || state.rule.enable === null) {
      await sdk.matchReplace.toggleRule(ruleId, true);
    }
    assertCurrent();
    const installed = await readSetup(sdk);
    assertCurrent();
    if (
      installed.workflow.id !== state.workflow.id ||
      installed.rule?.id !== ruleId ||
      installed.rule.enable === undefined ||
      installed.rule.enable === null
    ) {
      throw new Error("Replay conversion setup could not be verified");
    }
  } finally {
    listener.stop();
  }
};
