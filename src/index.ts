import { loadEnv } from "./config.js";
import { createApp } from "./app.js";
import { logError, logInfo } from "./logging.js";

const env = loadEnv();

if (!env.mcpBearerToken) {
  logError("MCP_BEARER_TOKEN is required for tool endpoints (health stays public)");
}

const app = createApp(env);

const server = app.listen(env.port, "0.0.0.0", () => {
  logInfo("listening", {
    port: env.port,
    write_enabled: env.writeEnabled,
    gcp_project: env.gcpProject,
  });
});

async function shutdown(signal: string) {
  logInfo("shutdown", { signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
