import {
  findAutoDecodeTags,
  findInverseWrapperTags,
  renderNytrovertorTemplate,
} from "./render.ts";

const successCases = [
  ["<@hex>\u0000\nabcéÿ😀</@>", "000A616263E9FF"],
  ["<@hexd>61:62-63 e9! fF</@>", "abcéÿ"],
  ["<@hexd>!xyz</@>", ""],
  ["<@hexd>4-1-2</@>", "A"],
  ["<@hexd>F</@>", ""],
  ["<@hexd>FF</@>", "ÿ"],
  ["<@hex></@>", ""],
  ["<@hexd><@hex>hello éÿ</@></@>", "hello éÿ"],
  ["<@b64>abc", "YWJj"],
  ["<@b64u>😀</@>", "8J-YgA"],
  ["<@b64u>ÿÿ</@>", "w7_Dvw"],
  ["<@b64u>a</@>", "YQ"],
  ["<@b64d>8J-YgA</@>", "😀"],
  ["<@b64d>w7_Dvw</@>", "ÿÿ"],
  ["<@b64d>w7_Dvw==</@>", "ÿÿ"],
  ["<@b64d>8J+YgA==</@>", "😀"],
  ["<@urld>a%20b", "a b"],
  ["<@urldplus>a+b%2Bc", "a b+c"],
  ["<@urldplus>a%20b", "a b"],
  ["<@repeat(2)>ab", "abab"],
  ["<@>unchanged", "unchanged"],
  ["<@url>x=<@b64>a b", "x%3DYSBi"],
  ["<@url>x=<@b64>a b</@>", "x%3DYSBi"],
  ["<@url>x=<@b64>a b</@></@>", "x%3DYSBi"],
  ["<@url>x=<@b64>a b</@b64></@url>", "x%3DYSBi"],
  ["<@b64|url>a b</@>", "YSUyMGI="],
  ["<@b64|url>a b</@b64|url>", "YSUyMGI="],
  ["<@b64|url>a b", "YSUyMGI="],
  ["<@url>a b</@>|<@b64>cd", "a%20b|Y2Q="],
  ["<@b64>xxx<@b64>yyy</@>zzz", "eHh4ZVhsNXp6eg=="],
  ["<@b64>xxx<@b64>yyy</@>zzz</@>", "eHh4ZVhsNXp6eg=="],
  ["<@b64>xxx<@b64>yyyzzz", "eHh4ZVhsNWVucDY="],
  ["<@b64>xxx</@><@b64>yyy", "eHh4eXl5"],
  ["<@b64>xxx\nyyy", "eHh4Cnl5eQ=="],
  ["<@b64>xxx\r\nyyy", "eHh4DQp5eXk="],
  ["before\n<@url>a b\nc d", "before\na%20b%0Ac%20d"],
  ["<@b64>xxx\n<@b64>yyy\n</@>\nzzz", "eHh4CmVYbDVDZz09Cnp6eg=="],
] as const;

for (const [input, expected] of successCases) {
  const result = renderNytrovertorTemplate(input);
  if (result.kind !== "Ok" || result.value !== expected) {
    throw new Error(
      `Expected ${JSON.stringify(input)} to render as ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`,
    );
  }
}

const cappedRepeatValue = "x".repeat(100000);
for (const input of [
  "<@repeat(100000)>x",
  "<@repeat(100001)>x",
  "<@loop(999999999999999999999999)>x",
]) {
  const result = renderNytrovertorTemplate(input);
  if (result.kind !== "Ok" || result.value !== cappedRepeatValue) {
    throw new Error(`Expected ${input} to repeat at the 100000 limit`);
  }
}

const errorCases = [
  ["<@url>x<@b64>y</@url>", "Expected closing tag </@b64>"],
  ["</@>", "Unexpected closing tag </@>"],
  ["<@urld>%", "Invalid percent-encoded input"],
  ["<@urldplus>a+%", "Invalid percent-encoded input"],
  ["<@b64|uuid>abc</@>", "Generators cannot be composed"],
  ["<@b64|repeat>abc</@>", "Argument tags cannot be composed"],
  ["<@b64|url(3)>abc</@>", "Argument tags cannot be composed"],
  ["<@b64||url>abc</@>", "Invalid transform tag syntax"],
  ["<@b64|constructor>abc</@>", "Unknown transform constructor"],
  ["<@b64|url/>abc", "<@b64|url> cannot be self-closing"],
  ["<@b64|url>abc</@url|b64>", "Expected closing tag </@b64|url>"],
] as const;

for (const [input, expectedError] of errorCases) {
  const result = renderNytrovertorTemplate(input);
  if (result.kind !== "Error" || result.error !== expectedError) {
    throw new Error(
      `Expected ${JSON.stringify(input)} to fail with ${JSON.stringify(expectedError)}, got ${JSON.stringify(result)}`,
    );
  }
}

const autoDecodeCases = [
  ["SGVsbG8=", ["b64d"], "Hello"],
  ["YQ==", ["b64d"], "a"],
  ["SGVsbG8_", ["b64d"], "Hello?"],
  ["74657374", ["hexd"], "test"],
  ["74:65:73:74", ["hexd"], "test"],
  ["&lt;", ["htmld"], "<"],
  ["SGVsbG8%3D", ["urld", "b64d"], "Hello"],
  ["534756736247383D", ["hexd", "b64d"], "Hello"],
  ["%2526amp%253B", ["urld", "urld", "htmld"], "&"],
  ["hello", [], "hello"],
  ["41", [], "41"],
  ["4142", [], "4142"],
  ["deadbeef", [], "deadbeef"],
  ["YQ", [], "YQ"],
  ["%GG", [], "%GG"],
  ["%00", [], "%00"],
  ["<@urld>SGVsbG8=", [], "<@urld>SGVsbG8="],
] as const;

for (const [input, expectedTags, expectedOutput] of autoDecodeCases) {
  const tags = findAutoDecodeTags(input);
  if (JSON.stringify(tags) !== JSON.stringify(expectedTags)) {
    throw new Error(
      `Expected ${JSON.stringify(input)} to use ${JSON.stringify(expectedTags)}, got ${JSON.stringify(tags)}`,
    );
  }

  if (tags.length === 0) {
    continue;
  }

  const template = tags.reduce<string>(
    (value, tag) => `<@${tag}>${value}</@>`,
    input,
  );
  const result = renderNytrovertorTemplate(template);
  if (result.kind !== "Ok" || result.value !== expectedOutput) {
    throw new Error(
      `Expected ${JSON.stringify(template)} to render as ${JSON.stringify(expectedOutput)}, got ${JSON.stringify(result)}`,
    );
  }
}

if (findAutoDecodeTags("A".repeat(65537)).length !== 0) {
  throw new Error("Auto decoding must reject oversized input");
}

let deeplyEncoded = "&";
for (let index = 0; index < 9; index += 1) {
  deeplyEncoded = encodeURIComponent(deeplyEncoded);
}
if (findAutoDecodeTags(deeplyEncoded).length !== 8) {
  throw new Error("Auto decoding must stop after eight layers");
}

const inverseWrapperCases = [
  ["<@><@b64d>SGVsbG8=</@></@>", ["b64"]],
  ["<@b64d><@><@urld>SGVsbG8%3D</@></@></@>", ["b64", "url"]],
  ["<@><@><@b64d>SGVsbG8=", ["b64"]],
  ["<@>text</@>", []],
  ["<@>before <@b64d>SGVsbG8=</@></@>", []],
  ["<@><@repeat(2)><@b64d>SGVsbG8=</@></@></@>", []],
  [
    "<@b64d><@urld><@b64d><@htmld>text</@></@></@></@>",
    ["b64", "url", "b64", "html"],
  ],
  [
    "<@b64><@url><@hex><@html>text</@></@></@></@>",
    ["b64d", "urld", "hexd", "htmld"],
  ],
  ["<@b64d><@urld><@repeat(2)>text</@></@></@>", ["b64", "url"]],
  ["before <@b64d>SGVsbG8=</@>", []],
  ["<@repeat(2)><@b64d>SGVsbG8=</@></@>", []],
  ["<@b64d>SGVsbG8=</@b64d>", ["b64"]],
  ["<@b64d|urld>SGVsbG8%3D</@>", ["b64", "url"]],
  ["<@b64d>SGVsbG8=</@url>", []],
] as const;

for (const [input, expected] of inverseWrapperCases) {
  const tags = findInverseWrapperTags(input);
  if (JSON.stringify(tags) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(input)} to invert ${JSON.stringify(expected)}, got ${JSON.stringify(tags)}`,
    );
  }
}

let reversibleTemplate = "<@b64d><@urld>SGVsbG8%3D</@></@>";
for (const expected of ["SGVsbG8%3D", "Hello"]) {
  const rendered = renderNytrovertorTemplate(reversibleTemplate);
  if (rendered.kind !== "Ok") {
    throw new Error(`Failed to render ${JSON.stringify(reversibleTemplate)}`);
  }

  reversibleTemplate = findInverseWrapperTags(reversibleTemplate).reduce(
    (value, tag) => `<@${tag}>${value}</@>`,
    rendered.value,
  );
  const reversed = renderNytrovertorTemplate(reversibleTemplate);
  if (reversed.kind !== "Ok" || reversed.value !== expected) {
    throw new Error(
      `Expected the reversed template to render as ${JSON.stringify(expected)}, got ${JSON.stringify(reversed)}`,
    );
  }
}
