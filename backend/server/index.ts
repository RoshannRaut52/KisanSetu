import express from "express";
import { createServer } from "node:http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./context";

const app = express();
const server = createServer(app);
const port = Number(process.env.PORT || 10000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "*";

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", frontendOrigin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "2mb" }));
app.get("/healthz", (_req, res) => res.json({ ok: true, service: "kisansetu-api", timestamp: new Date().toISOString() }));
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

server.listen(port, "0.0.0.0", () => {
  console.log(`KisanSetu API listening on port ${port}`);
});
