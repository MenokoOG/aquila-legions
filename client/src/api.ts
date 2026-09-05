import type {
  BattleStats, Campaign, CodexEntry, ResultResponse, SaveState, Scenario, ScenarioRecord,
} from "../../shared/types.js";

/** Thin fetch layer over the local API. */

export interface ScenarioSummary {
  id: string;
  campaignId: string;
  order: number;
  title: string;
  year: string;
  place: string;
  tactic: string;
  unlocked: boolean;
  record: ScenarioRecord | null;
}

export interface StateResponse {
  save: SaveState;
  campaigns: Campaign[];
  scenarios: ScenarioSummary[];
}

export type CodexView = CodexEntry & { unlocked: boolean };

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "content-type": "application/json" }, ...init });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const api = {
  state: () => json<StateResponse>("/api/state"),
  scenario: (id: string) => json<Scenario>(`/api/scenario/${id}`),
  codex: () => json<CodexView[]>("/api/codex"),
  result: (scenarioId: string, stats: BattleStats) =>
    json<ResultResponse>("/api/battle/result", { method: "POST", body: JSON.stringify({ scenarioId, stats }) }),
  commander: (name: string) =>
    json<SaveState>("/api/commander", { method: "POST", body: JSON.stringify({ name }) }),
  reset: () => json<SaveState>("/api/reset", { method: "POST", body: "{}" }),
};
