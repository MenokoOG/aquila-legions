import express from "express";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { SaveStore } from "./store.js";
import { buildRouter } from "./routes.js";

/** Local server. Serves the API and, after `npm run build`, the game itself. */
const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT ?? 3117);

/**
 * When this process loaded its code. A server left running across a `git pull`
 * serves the rebuilt `dist/` off disk while its own routes and rules stay at
 * whatever it started with, which looks like a new game with an old API and is
 * very hard to read from the screen. The client compares this against its own
 * build stamp and says so.
 */
const startedAt = Date.now();

const app = express();
app.use(express.json({ limit: "64kb" }));
app.use("/api", buildRouter(new SaveStore(join(root, "data", "save.json")), startedAt));

const dist = join(root, "dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(join(dist, "index.html")));
}

app.listen(port, () => {
  const where = existsSync(dist)
    ? `http://localhost:${port}`
    : `API on :${port}; game at http://localhost:5173 (vite)`;
  console.log(`Aquila: Legions of Trajan. ${where}`);
});
