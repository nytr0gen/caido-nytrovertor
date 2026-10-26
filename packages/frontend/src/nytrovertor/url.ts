export const getConvertedUrl = (
  rawRequest: string,
  connection: { host: string; port: number; isTls: boolean },
): { kind: "Ok"; value: string } | { kind: "Error"; error: string } => {
  const lines = rawRequest.split(/\r?\n/);
  const target = lines[0]?.match(/^\S+\s+(\S+)\s+HTTP\/\d+(?:\.\d+)?$/)?.[1];
  if (target === undefined) {
    return { kind: "Error", error: "Failed to parse the converted request" };
  }

  const protocol = connection.isTls ? "https:" : "http:";
  const host =
    connection.host.includes(":") && !connection.host.startsWith("[")
      ? `[${connection.host}]`
      : connection.host;
  let authority = `${host}:${connection.port}`;
  for (const line of lines.slice(1)) {
    if (line === "") {
      break;
    }
    const match = line.match(/^host:\s*(.+)$/i);
    if (match?.[1] !== undefined) {
      authority = match[1].trim();
      if (!/\]:\d+$|^[^:]+:\d+$/.test(authority)) {
        authority += `:${connection.port}`;
      }
      break;
    }
  }

  const value = /^[A-Za-z][A-Za-z\d+.-]*:\/\//.test(target)
    ? target
    : `${protocol}//${authority}${target.startsWith("/") ? target : `/${target}`}`;
  try {
    // eslint-disable-next-line compat/compat
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        kind: "Error",
        error: "The converted URL must use HTTP or HTTPS",
      };
    }
    return { kind: "Ok", value: url.href };
  } catch {
    return { kind: "Error", error: "Failed to parse the converted URL" };
  }
};
