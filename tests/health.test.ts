import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import request from "supertest";
import { loadEnv } from "../src/config.js";
import { createApp } from "../src/app.js";

describe("health", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    process.env.MCP_BEARER_TOKEN = process.env.MCP_BEARER_TOKEN || "test-bearer-token";
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

  it("returns write_enabled false", async () => {
    const res = await request(base).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.write_enabled).toBe(false);
  });
});
