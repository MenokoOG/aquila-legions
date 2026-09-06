import { Router } from "express";
import type { BattleResult } from "../shared/types.js";
import { SCENARIOS } from "../shared/data/scenarios.js";
import { CAMPAIGNS } from "../shared/data/campaigns.js";
import { CODEX } from "../shared/data/codex.js";
import { SaveStore } from "./store.js";
import { applyResult, isCampaignUnlocked, isUnlocked, sanitizeStats } from "./progress.js";
import { file, toMarkdown } from "./commentarii.js";
import { counsel, counselAvailable, readRequest } from "./counsel.js";

/** REST surface. All game rules live in progress.ts; this file only routes. */
export function buildRouter(store: SaveStore, startedAt = Date.now()): Router {
  const router = Router();

  router.get("/state", (_req, res) => {
    const save = store.load();
    const scenarios = SCENARIOS.map((s) => ({
      id: s.id, campaignId: s.campaignId, order: s.order, title: s.title, year: s.year,
      place: s.place, tactic: s.tactic,
      unlocked: isUnlocked(save, s.id),
      record: save.scenarios[s.id] ?? null,
    }));
    const campaigns = CAMPAIGNS.map((c) => ({ ...c, unlocked: isCampaignUnlocked(save, c.id) }));
    // Whether a key is configured, so the client can hide a button that cannot
    // work. Never the key itself, and never anything derived from it.
    res.json({ save, campaigns, scenarios, counsel: counselAvailable(), startedAt });
  });

  router.get("/scenario/:id", (req, res) => {
    const s = SCENARIOS.find((x) => x.id === req.params.id);
    if (!s) return res.status(404).json({ error: "no such scenario" });
    if (!isUnlocked(store.load(), s.id)) return res.status(403).json({ error: "scenario locked" });
    return res.json(s);
  });

  router.get("/codex", (_req, res) => {
    const save = store.load();
    res.json(CODEX.map((e) => ({ ...e, unlocked: save.codexUnlocked.includes(e.id) })));
  });

  router.post("/battle/result", (req, res) => {
    const body = req.body as Partial<BattleResult>;
    if (!body || typeof body.scenarioId !== "string" || typeof body.stats !== "object" || body.stats === null) {
      return res.status(400).json({ error: "scenarioId and stats required" });
    }
    const save = store.load();
    if (!isUnlocked(save, body.scenarioId)) return res.status(403).json({ error: "scenario locked" });
    try {
      const out = applyResult(save, { scenarioId: body.scenarioId, stats: sanitizeStats(body.stats) });
      store.save(out.save);
      return res.json(out);
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  });

  router.get("/commentarii", (_req, res) => {
    res.json(store.load().commentarii);
  });

  /** The notebook as a file, which is the form the player can keep. */
  router.get("/commentarii.md", (_req, res) => {
    res.type("text/markdown; charset=utf-8")
      .set("content-disposition", 'attachment; filename="commentarii.md"')
      .send(toMarkdown(store.load()));
  });

  router.post("/commentarii", (req, res) => {
    const body = req.body as { entries?: unknown };
    const save = store.load();
    const added = file(save, body?.entries);
    if (added.length) store.save(save);
    return res.json({ added, commentarii: save.commentarii });
  });

  /**
   * The one route in this game that leaves the machine, and the only one that
   * is optional. Without a key it answers 501 and the game is unaffected.
   */
  router.post("/counsel", async (req, res) => {
    if (!counselAvailable()) return res.status(501).json({ error: "no counsel configured" });
    const ask = readRequest(req.body);
    if (!ask) return res.status(400).json({ error: "facts required" });
    const out = await counsel(ask);
    if (!out) return res.status(503).json({ error: "no word from the Praefectus" });
    return res.json(out);
  });

  router.post("/commander", (req, res) => {
    const name = String((req.body as { name?: unknown })?.name ?? "").trim().slice(0, 32);
    if (!name) return res.status(400).json({ error: "name required" });
    const save = store.load();
    save.commander = name;
    store.save(save);
    return res.json(save);
  });

  router.post("/reset", (_req, res) => {
    const fresh = store.fresh();
    store.save(fresh);
    res.json(fresh);
  });

  return router;
}
