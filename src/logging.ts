const REDACT_KEYS = new Set([
  "authorization",
  "token",
  "access_token",
  "refresh_token",
  "password",
  "secret",
  "api_key",
  "apikey",
  "confirmation_token",
  "bearer",
  "github_token",
  "credential",
  "credentials",
]);

function redactValue(key: string, value: unknown): unknown {
  if (REDACT_KEYS.has(key.toLowerCase())) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((v, i) => redactValue(String(i), v));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactValue(k, v);
    }
    return out;
  }
  return value;
}

export function redactArgs(args: unknown): unknown {
  if (args == null) return args;
  if (typeof args !== "object") return args;
  return redactValue("root", args);
}

export interface ToolLogFields {
  tool: string;
  args?: unknown;
  latency_ms: number;
  ok: boolean;
  error?: string;
  rows?: number;
}

export function logTool(fields: ToolLogFields): void {
  const line = {
    severity: fields.ok ? "INFO" : "ERROR",
    message: fields.ok ? `tool ${fields.tool} ok` : `tool ${fields.tool} error`,
    tool: fields.tool,
    args: redactArgs(fields.args),
    latency_ms: fields.latency_ms,
    ok: fields.ok,
    ...(fields.error ? { error: fields.error } : {}),
    ...(fields.rows !== undefined ? { rows: fields.rows } : {}),
    ts: new Date().toISOString(),
  };
  console.log(JSON.stringify(line));
}

export function logInfo(message: string, extra?: Record<string, unknown>): void {
  console.log(JSON.stringify({ severity: "INFO", message, ts: new Date().toISOString(), ...extra }));
}

export function logError(message: string, extra?: Record<string, unknown>): void {
  console.error(JSON.stringify({ severity: "ERROR", message, ts: new Date().toISOString(), ...extra }));
}
