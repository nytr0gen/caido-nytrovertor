import { findAutoDecodeTags, renderNytrovertorTemplate } from "./render.ts";

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
  ["<@repeat(2)>ab", "abab"],
  ["<@>unchanged", "unchanged"],
  ["<@url>x=<@b64>a b", "x%3DYSBi"],
  ["<@url>x=<@b64>a b</@>", "x%3DYSBi"],
  ["<@url>x=<@b64>a b</@></@>", "x%3DYSBi"],
  ["<@url>x=<@b64>a b</@b64></@url>", "x%3DYSBi"],
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
