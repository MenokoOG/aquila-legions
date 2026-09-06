import type {
  BattleStats, Campaign, CodexEntry, CommentariusEntry, ResultResponse, SaveState, Scenario,
  ScenarioRecord,
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

/** A campaign as the state route sends it: the record plus whether it is open yet. */
export type CampaignView = Campaign & { unlocked?: boolean };

export interface StateResponse {
  save: SaveState;
  campaigns: CampaignView[];
  /** Whether the optional Praefectus counsel route is configured on this machine. */
  counsel?: boolean;
  /** When the API process loaded its code. Compared against this bundle's build stamp. */
  startedAt?: number;
  scenarios: ScenarioSummary[];
}

export type CodexView = CodexEntry & { unlocked: boolean };

/** What the counsel route is given: things the local adviser has already found to be true. */
export interface CounselAsk {
  title: string;
  tactic: string;
  turn: number;
  maxTurns: number;
  enemy: string;
  facts: string[];
}

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
  commentarii: () => json<CommentariusEntry[]>("/api/commentarii"),
  counsel: (body: CounselAsk) =>
    json<{ text: string; model: string }>("/api/counsel", { method: "POST", body: JSON.stringify(body) }),
  file: (entries: CommentariusEntry[]) =>
    json<{ added: CommentariusEntry[]; commentarii: CommentariusEntry[] }>("/api/commentarii", {
      method: "POST", body: JSON.stringify({ entries }),
    }),
  commander: (name: string) =>
    json<SaveState>("/api/commander", { method: "POST", body: JSON.stringify({ name }) }),
  reset: () => json<SaveState>("/api/reset", { method: "POST", body: "{}" }),
};
