import express from "express";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { SaveStore } from "./store.js";
import { buildRouter } from "./routes.js";

/** Local server. Serves the API and, after `npm run build`, the game itself. */
const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT ?? 3117);

const app = express();
app.use(express.json({ limit: "64kb" }));
app.use("/api", buildRouter(new SaveStore(join(root, "data", "save.json"))));

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
