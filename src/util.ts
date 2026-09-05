import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function textResult(data: unknown, isError = false): CallToolResult {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text", text }],
    ...(isError ? { isError: true } : {}),
  };
}

export function errorResult(message: string): CallToolResult {
  return textResult({ error: message }, true);
}

export async function withToolLog<T>(
  tool: string,
  args: unknown,
  fn: () => Promise<T>,
  toResult: (value: T) => CallToolResult,
): Promise<CallToolResult> {
  const { logTool } = await import("./logging.js");
  const start = Date.now();
  try {
    const value = await fn();
    const result = toResult(value);
    logTool({
      tool,
      args,
      latency_ms: Date.now() - start,
      ok: !result.isError,
      error: result.isError ? extractErrorText(result) : undefined,
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logTool({ tool, args, latency_ms: Date.now() - start, ok: false, error: message });
    return errorResult(message);
  }
}

function extractErrorText(result: CallToolResult): string | undefined {
  const first = result.content?.[0];
  if (first && first.type === "text") return first.text.slice(0, 500);
  return undefined;
}
