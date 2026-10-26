import { getConvertedUrl } from "./url.ts";

const tls = { host: "example.com", port: 443, isTls: true };
const successCases = [
  [
    "GET /a%20b?q=1 HTTP/1.1\r\nHost: example.com\r\n\r\n",
    tls,
    "https://example.com/a%20b?q=1",
  ],
  [
    "GET / HTTP/1.1\nHost: override.test:8443\n\n",
    tls,
    "https://override.test:8443/",
  ],
  [
    "GET / HTTP/1.1\n\n",
    { host: "example.com", port: 8080, isTls: false },
    "http://example.com:8080/",
  ],
  [
    "GET / HTTP/1.1\nHost: override.test\n\n",
    { ...tls, port: 8443 },
    "https://override.test:8443/",
  ],
  [
    "GET https://absolute.test/path HTTP/1.1\nHost: ignored.test\n\n",
    tls,
    "https://absolute.test/path",
  ],
  ["GET / HTTP/1.1\n\n", { ...tls, host: "::1" }, "https://[::1]/"],
  ["GET / HTTP/1.1\nHost: [::1]:8443\n\n", tls, "https://[::1]:8443/"],
  ["GET / HTTP/1.1\nHost: [::1]\n\n", tls, "https://[::1]/"],
  ["GET / HTTP/1.1\n\nHost: body.test", tls, "https://example.com/"],
] as const;

for (const [rawRequest, connection, expected] of successCases) {
  const result = getConvertedUrl(rawRequest, connection);
  if (result.kind !== "Ok" || result.value !== expected) {
    throw new Error(`Expected ${expected}, received ${JSON.stringify(result)}`);
  }
}

const errorCases = [
  "",
  "bad request",
  "GET ftp://example.com/ HTTP/1.1\n\n",
  "GET / HTTP/1.1\nHost: invalid host\n\n",
];

for (const rawRequest of errorCases) {
  const result = getConvertedUrl(rawRequest, tls);
  if (result.kind !== "Error") {
    throw new Error(`Expected an error for ${JSON.stringify(rawRequest)}`);
  }
}
