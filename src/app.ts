import express, { type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { EnvConfig } from "./config.js";
import { loadContract, publicConfig } from "./config.js";
import { requireBearer } from "./auth.js";
import { createServer } from "./server.js";
import { logError, logInfo } from "./logging.js";

export function createApp(env: EnvConfig) {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // Public health for Cloud Run probes
  app.get("/health", (_req: Request, res: Response) => {
    try {
      const contract = loadContract(env.contractPath);
      res.status(200).json({
        ok: true,
        write_enabled: env.writeEnabled,
        service: "uniiku-sem-seo-mcp",
        version: "0.1.0",
        gcp_project: env.gcpProject,
        ads_status: (contract.ads as Record<string, unknown>)?.status ?? "not_opened",
      });
    } catch (err) {
      logError("health_failed", { error: err instanceof Error ? err.message : String(err) });
      res.status(500).json({ ok: false, error: "health_failed" });
    }
  });

  // Optional public config peek (no secrets) — still useful for ops; tools path requires bearer
  app.get("/config", (_req: Request, res: Response) => {
    try {
      const contract = loadContract(env.contractPath);
      res.status(200).json(publicConfig(env, contract));
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  const bearer = requireBearer(env.mcpBearerToken);

  // Stateless Streamable HTTP MCP (Cloud Run friendly)
  app.post("/mcp", bearer, async (req: Request, res: Response) => {
    const server = createServer(env);
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
    } catch (err) {
      logError("mcp_request_failed", { error: err instanceof Error ? err.message : String(err) });
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", bearer, (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed (stateless mode)." },
      id: null,
    });
  });

  app.delete("/mcp", bearer, (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed (stateless mode)." },
      id: null,
    });
  });

  logInfo("app_created", { write_enabled: env.writeEnabled, gcp_project: env.gcpProject });
  return app;
}
