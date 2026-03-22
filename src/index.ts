#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

import { registerAnimeTools } from "./tools/animeTools.js";
import { registerMangaTools } from "./tools/mangaTools.js";
import { registerCharacterAndPersonTools } from "./tools/characterTools.js";
import { registerDiscoveryTools } from "./tools/discoveryTools.js";
import { registerCustomTools } from "./tools/customTools.js";

// ─── Server Initialization ─────────────────────────────────────────────────

const server = new McpServer({
  name: "jikan-anime-mcp-server",
  version: "1.0.0",
});

// Register all tool groups
registerAnimeTools(server);
registerMangaTools(server);
registerCharacterAndPersonTools(server);
registerDiscoveryTools(server);
registerCustomTools(server);

// ─── Transport: stdio (default) ───────────────────────────────────────────

async function runStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Jikan Anime MCP Server running via stdio");
}

// ─── Transport: HTTP ──────────────────────────────────────────────────────

async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      server: "jikan-anime-mcp-server",
      version: "1.0.0",
    });
  });

  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT ?? "3000", 10);
  app.listen(port, () => {
    console.error(
      `Jikan Anime MCP Server running on http://localhost:${port}/mcp`,
    );
  });
}

// ─── Entrypoint ───────────────────────────────────────────────────────────

const transport = process.env.TRANSPORT ?? "stdio";
if (transport === "http") {
  runHTTP().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
} else {
  runStdio().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
