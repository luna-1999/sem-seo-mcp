import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EnvConfig } from "./config.js";
import { registerTools } from "./tools/register.js";

export function createServer(env: EnvConfig): McpServer {
  const server = new McpServer(
    {
      name: "uniiku-sem-seo-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );
  registerTools(server, env);
  return server;
}
