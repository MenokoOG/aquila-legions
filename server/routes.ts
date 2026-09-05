import { Router } from "express";
import type { BattleResult } from "../shared/types.js";
import { SCENARIOS } from "../shared/data/scenarios.js";
import { CAMPAIGNS } from "../shared/data/campaigns.js";
import { CODEX } from "../shared/data/codex.js";
import { SaveStore } from "./store.js";
import { applyResult, isUnlocked } from "./progress.js";

/** REST surface. All game rules live in progress.ts; this file only routes. */
export function buildRouter(store: SaveStore): Router {
  const router = Router();

  router.get("/state", (_req, res) => {
    const save = store.load();
    const scenarios = SCENARIOS.map((s) => ({
      id: s.id, campaignId: s.campaignId, order: s.order, title: s.title, year: s.year,
      place: s.place, tactic: s.tactic,
      unlocked: isUnlocked(save, s.id),
      record: save.scenarios[s.id] ?? null,
    }));
    res.json({ save, campaigns: CAMPAIGNS, scenarios });
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
      const out = applyResult(save, { scenarioId: body.scenarioId, stats: body.stats });
      store.save(out.save);
      return res.json(out);
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
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
