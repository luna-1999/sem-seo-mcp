import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import request from "supertest";
import { loadEnv } from "../src/config.js";
import { createApp } from "../src/app.js";

describe("bearer auth on /mcp", () => {
  let server: Server;
  let base: string;
  const token = "test-bearer-token-auth";

  beforeAll(async () => {
    process.env.MCP_BEARER_TOKEN = token;
    process.env.WRITE_ENABLED = "false";
    const env = loadEnv();
    const app = createApp(env);
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    base = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("rejects missing bearer", async () => {
    const res = await request(base)
      .post("/mcp")
      .set("Content-Type", "application/json")
      .send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    expect(res.status).toBe(401);
  });

  it("rejects wrong bearer", async () => {
    const res = await request(base)
      .post("/mcp")
      .set("Authorization", "Bearer wrong")
      .set("Content-Type", "application/json")
      .send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    expect(res.status).toBe(401);
  });

  it("health remains public", async () => {
    const res = await request(base).get("/health");
    expect(res.status).toBe(200);
  });
});
