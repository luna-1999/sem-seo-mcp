import type { Request, Response, NextFunction } from "express";

export function requireBearer(expectedToken: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!expectedToken) {
      res.status(500).json({
        error: "server_misconfigured",
        message: "MCP_BEARER_TOKEN is not set",
      });
      return;
    }
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).json({
        error: "unauthorized",
        message: "Missing or invalid Authorization Bearer token",
      });
      return;
    }
    const token = header.slice("Bearer ".length).trim();
    if (token !== expectedToken) {
      res.status(401).json({
        error: "unauthorized",
        message: "Bearer token mismatch",
      });
      return;
    }
    next();
  };
}
