import assert from "node:assert/strict";

import { setupReplay } from "./setupReplay.ts";

type SetupSDK = Parameters<typeof setupReplay>[0];
type Package = Awaited<
  ReturnType<SetupSDK["graphql"]["pluginPackages"]>
>["pluginPackages"][number];
type WorkflowPlugin = Extract<
  Package["plugins"][number],
  { __typename: "PluginWorkflow" }
>;
type Collection = Awaited<
  ReturnType<SetupSDK["graphql"]["tamperRuleCollections"]>
>["tamperRuleCollections"][number];

const makeWorkflow = (): WorkflowPlugin => ({
  __typename: "PluginWorkflow",
  id: "plugin-id",
  manifestId: "nytrovertor-convert",
  enabled: true,
  package: { id: "package-id" },
  workflow: {
    __typename: "Workflow",
    id: "installed-id",
    name: "Nytrovertor Convert",
    kind: "CONVERT",
    enabled: true,
    global: true,
    readOnly: true,
  },
});

const makeRule = (): Collection["rules"][number] => ({
  __typename: "TamperRule",
  id: "rule-id",
  name: "Nytrovertor Convert",
  sources: ["REPLAY"],
  section: {
    __typename: "TamperSectionRequestAll",
    operation: {
      __typename: "TamperOperationAllRaw",
      matcher: { __typename: "TamperMatcherFull" },
      replacer: { __typename: "TamperReplacerWorkflow", id: "installed-id" },
    },
  },
  collection: { id: "collection-id" },
});

const fixture = () => {
  const plugins: WorkflowPlugin[] = [makeWorkflow()];
  const packages: Package[] = [
    {
      id: "package-id",
      manifestId: "nytrovertor",
      version: "0.0.0",
      installedAt: new Date(),
      origin: "FILE",
      plugins,
    },
  ];
  const collections: Collection[] = [];
  const calls: string[] = [];
  const projectListeners = new Set<
    Parameters<SetupSDK["projects"]["onCurrentProjectChange"]>[0]
  >();
  const changeProject = () => {
    for (const listener of projectListeners) {
      listener({ projectId: "other-project" });
    }
  };
  const sdk: SetupSDK = {
    projects: {
      onCurrentProjectChange: (callback) => {
        projectListeners.add(callback);
        return {
          stop: () => {
            projectListeners.delete(callback);
          },
        };
      },
    },
    graphql: {
      pluginPackages: () => Promise.resolve({ pluginPackages: packages }),
      tamperRuleCollections: () =>
        Promise.resolve({
          tamperRuleCollections: collections,
        }),
    },
    matchReplace: {
      createCollection: ({ name }) => {
        calls.push("create collection");
        collections.push({
          __typename: "TamperRuleCollection",
          id: "collection-id",
          name,
          rules: [],
        });
        return Promise.resolve({ id: "collection-id", name, ruleIds: [] });
      },
      createRule: (options) => {
        calls.push("create rule");
        assert.deepEqual(options.sources, ["REPLAY"]);
        assert.equal(options.query, "");
        assert.deepEqual(options.section, {
          kind: "SectionRequestAll",
          operation: {
            kind: "OperationAllRaw",
            matcher: { kind: "MatcherRawFull" },
            replacer: { kind: "ReplacerWorkflow", workflowId: "installed-id" },
          },
        });
        const collection = collections.find(
          (item) => item.id === options.collectionId,
        );
        assert.ok(collection);
        collection.rules.push(makeRule());
        return Promise.resolve({ ...options, id: "rule-id", isEnabled: false });
      },
      toggleRule: (id, enabled) => {
        calls.push("enable rule");
        assert.equal(enabled, true);
        const rule = collections
          .flatMap((collection) => collection.rules)
          .find((item) => item.id === id);
        assert.ok(rule);
        rule.enable = { rank: "a" };
        return Promise.resolve();
      },
    },
  };
  return {
    sdk,
    plugins,
    packages,
    collections,
    calls,
    changeProject,
    projectListeners,
  };
};

const installed = async () => {
  const context = fixture();
  await setupReplay(context.sdk);
  context.calls.length = 0;
  return context;
};

{
  const { sdk, plugins, collections, calls, projectListeners } = fixture();
  await setupReplay(sdk);
  assert.equal(projectListeners.size, 0);
  assert.deepEqual(calls, ["create collection", "create rule", "enable rule"]);
  calls.length = 0;
  await setupReplay(sdk);
  assert.deepEqual(calls, []);
  assert.equal(projectListeners.size, 0);
  assert.equal(plugins.length, 1);
  assert.equal(collections.length, 1);
  assert.equal(collections[0]?.rules.length, 1);
}

{
  const { sdk, collections, calls } = await installed();
  const rule = collections[0]?.rules[0];
  assert.ok(rule);
  rule.name = "My conversion rule";
  rule.enable = undefined;
  await setupReplay(sdk);
  assert.deepEqual(calls, ["enable rule"]);
  assert.equal(rule.name, "My conversion rule");
}

for (const change of [
  (rule: Collection["rules"][number]) => {
    rule.sources = ["INTERCEPT"];
  },
  (rule: Collection["rules"][number]) => {
    rule.sources.push("INTERCEPT");
  },
  (rule: Collection["rules"][number]) => {
    rule.condition = {
      __typename: "HTTPQL",
      code: 'req.host.eq:"example.com"',
    };
  },
  (rule: Collection["rules"][number]) => {
    rule.section = {
      __typename: "TamperSectionRequestBody",
      operation: {
        __typename: "TamperOperationBodyRaw",
        matcher: { __typename: "TamperMatcherFull" },
        replacer: { __typename: "TamperReplacerWorkflow", id: "installed-id" },
      },
    };
  },
  (rule: Collection["rules"][number]) => {
    if (rule.section.__typename === "TamperSectionRequestAll") {
      rule.section.operation.replacer = {
        __typename: "TamperReplacerWorkflow",
        id: "unrelated-id",
      };
    }
  },
]) {
  const { sdk, collections, calls } = await installed();
  const rule = collections[0]?.rules[0];
  assert.ok(rule);
  change(rule);
  await assert.rejects(setupReplay(sdk), /existing Nytrovertor rule/);
  assert.deepEqual(calls, []);
}

for (const duplicate of ["workflow", "rule"]) {
  const { sdk, plugins, collections, calls } = await installed();
  if (duplicate === "workflow") {
    plugins.push({ ...makeWorkflow(), id: "duplicate-id" });
  } else {
    collections[0]?.rules.push({ ...makeRule(), id: "duplicate-id" });
  }
  await assert.rejects(setupReplay(sdk), /Multiple Nytrovertor/);
  assert.deepEqual(calls, []);
}

for (const change of [
  (plugin: WorkflowPlugin) => {
    plugin.enabled = false;
  },
  (plugin: WorkflowPlugin) => {
    plugin.workflow = undefined;
  },
  (plugin: WorkflowPlugin) => {
    if (plugin.workflow !== undefined && plugin.workflow !== null)
      plugin.workflow.kind = "ACTIVE";
  },
  (plugin: WorkflowPlugin) => {
    plugin.manifestId = "unrelated-workflow";
  },
]) {
  const { sdk, plugins, calls } = fixture();
  const plugin = plugins[0];
  assert.ok(plugin);
  change(plugin);
  await assert.rejects(setupReplay(sdk), /packaged Nytrovertor Convert/);
  assert.deepEqual(calls, []);
}

{
  const { sdk, packages, calls } = fixture();
  const pkg = packages[0];
  assert.ok(pkg);
  pkg.manifestId = "unrelated-package";
  await assert.rejects(setupReplay(sdk), /packaged Nytrovertor Convert/);
  assert.deepEqual(calls, []);
}

{
  const { sdk, plugins, collections, calls } = fixture();
  const createRule = sdk.matchReplace.createRule;
  sdk.matchReplace.createRule = () =>
    Promise.reject(new Error("Temporary failure"));
  await assert.rejects(setupReplay(sdk), /Temporary failure/);
  assert.equal(plugins.length, 1);
  assert.equal(collections.length, 1);
  sdk.matchReplace.createRule = createRule;
  calls.length = 0;
  await setupReplay(sdk);
  assert.deepEqual(calls, ["create rule", "enable rule"]);
}

{
  const { sdk, calls, projectListeners } = fixture();
  sdk.graphql.pluginPackages = () => Promise.reject(new Error("Read failed"));
  await assert.rejects(setupReplay(sdk), /Read failed/);
  assert.deepEqual(calls, []);
  assert.equal(projectListeners.size, 0);
}

{
  const { sdk } = fixture();
  sdk.matchReplace.toggleRule = () => Promise.resolve();
  await assert.rejects(setupReplay(sdk), /could not be verified/);
}

{
  const { sdk, calls, changeProject, projectListeners } = fixture();
  const readWorkflows = sdk.graphql.pluginPackages;
  sdk.graphql.pluginPackages = () => {
    assert.equal(projectListeners.size, 1);
    changeProject();
    return readWorkflows();
  };
  await assert.rejects(setupReplay(sdk), /project changed/i);
  assert.deepEqual(calls, []);
  assert.equal(projectListeners.size, 0);
}

{
  const { sdk, calls, changeProject, projectListeners } = fixture();
  const createCollection = sdk.matchReplace.createCollection;
  sdk.matchReplace.createCollection = async (options) => {
    const result = await createCollection(options);
    changeProject();
    return result;
  };
  await assert.rejects(setupReplay(sdk), /project changed/i);
  assert.deepEqual(calls, ["create collection"]);
  assert.equal(projectListeners.size, 0);
}

{
  const { sdk, changeProject, projectListeners } = fixture();
  const readCollections = sdk.graphql.tamperRuleCollections;
  let reads = 0;
  sdk.graphql.tamperRuleCollections = () => {
    reads += 1;
    if (reads === 2) {
      changeProject();
    }
    return readCollections();
  };
  await assert.rejects(setupReplay(sdk), /project changed/i);
  assert.equal(projectListeners.size, 0);
}
