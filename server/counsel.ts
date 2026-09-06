/**
 * The Praefectus's voice.
 *
 * The rule this is built to, and the reason it is safe: **facts in, prose out.**
 * `client/src/advisor/tips.ts` decides what is true by reading the battle, and
 * everything it produces is checkable against the same formulas the player's
 * forecast panel shows. This file sends those sentences to a model and asks for
 * them back in the voice of a camp prefect. The model chooses which of them
 * matters most and how it sounds. It is told, and structurally unable to be
 * trusted otherwise, that it may assert nothing that was not handed to it.
 *
 * That constraint is not about model size. A larger model invents Roman history
 * more fluently, not less, and every Codex statement in this game is meant to be
 * checkable in Tacitus, Dio, Vegetius, Josephus or on Trajan's Column. Generated
 * history would quietly destroy the only claim the game really makes.
 *
 * No new dependency: one endpoint, one POST, `fetch`. The key is read from the
 * environment and never leaves this process.
 */

/** Cheapest general-purpose model on the platform, which is plenty for a rewrite. */
const DEFAULT_MODEL = "gpt-5.6-luna";
const DEFAULT_URL = "https://api.openai.com/v1/responses";

/** One turn's advice is two sentences. This is a ceiling, not a target. */
const MAX_OUTPUT_TOKENS = 160;
/** Never let a turn wait on the network. Overridable so the tests need not wait either. */
export const TIMEOUT_MS = 6000;
/** What the panel will render, however long the reply is. */
const MAX_CHARS = 400;

export interface CounselRequest {
  /** The scenario, for tone only. */
  title: string;
  tactic: string;
  turn: number;
  maxTurns: number;
  /** "Dacian", "British". */
  enemy: string;
  /** The true things the local adviser found, most urgent first. */
  facts: string[];
}

export interface CounselResult {
  text: string;
  model: string;
}

/** Whether a key is configured. The client asks so it can hide a button that cannot work. */
export function counselAvailable(env: NodeJS.ProcessEnv = process.env): boolean {
  return typeof env.OPENAI_API_KEY === "string" && env.OPENAI_API_KEY.trim().length > 0;
}

const INSTRUCTIONS = [
  "You are the praefectus castrorum, the camp prefect of a Roman legion: the oldest and most experienced officer present, promoted from the ranks. You are speaking quietly to the legate during a battle.",
  "",
  "You will be given a list of FACTS about the battlefield. They were computed from the game's own combat rules and they are all true.",
  "",
  "Rules you must follow exactly:",
  "1. Say only what the FACTS say. Do not add tactical claims, numbers, unit names, place names, dates or history that are not in them.",
  "2. Pick the one or two facts that matter most this turn. Ignore the rest.",
  "3. Two sentences at most. Plain text. No markdown, no lists, no quotation marks, no preamble.",
  "4. Speak as a soldier to his commander: direct, unhurried, no flourish. Never use the word 'Praefectus' about yourself.",
  "5. If the facts do not support saying anything useful, say one short sentence about holding the line.",
].join("\n");

function prompt(req: CounselRequest): string {
  return [
    `BATTLE: ${req.title} (teaching: ${req.tactic})`,
    `TURN: ${req.turn} of ${req.maxTurns}. The enemy is ${req.enemy}.`,
    "",
    "FACTS:",
    ...req.facts.map((f) => `- ${f}`),
  ].join("\n");
}

/**
 * Pulls the text out of a Responses API reply without insisting on one shape.
 * The convenience field and the nested output array are both accepted, and
 * anything else answers null so the caller falls back to the local tip.
 */
export function extractText(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as { output_text?: unknown; output?: unknown };

  if (typeof b.output_text === "string" && b.output_text.trim()) return b.output_text.trim();

  if (Array.isArray(b.output)) {
    const parts: string[] = [];
    for (const item of b.output) {
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) continue;
      for (const c of content) {
        const text = (c as { text?: unknown }).text;
        if (typeof text === "string") parts.push(text);
      }
    }
    const joined = parts.join(" ").trim();
    if (joined) return joined;
  }
  return null;
}

/** Collapses whitespace and cuts to something a sidebar can hold. */
export function tidy(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > MAX_CHARS ? `${flat.slice(0, MAX_CHARS - 1)}…` : flat;
}

/** Injected by the tests. Nothing in the suite ever calls the real endpoint. */
export type Fetcher = typeof fetch;

/**
 * Asks for the prefect's phrasing. Resolves to null on absolutely anything going
 * wrong — no key, a timeout, a rate limit, a refusal, a shape we did not expect.
 * The caller's job is then to show the local tip, which is what it was showing
 * before the request was made.
 */
export async function counsel(
  req: CounselRequest,
  env: NodeJS.ProcessEnv = process.env,
  doFetch: Fetcher = fetch,
  timeoutMs: number = TIMEOUT_MS,
): Promise<CounselResult | null> {
  const key = env.OPENAI_API_KEY?.trim();
  if (!key || !req.facts.length) return null;

  const model = env.COUNSEL_MODEL?.trim() || DEFAULT_MODEL;
  const url = env.COUNSEL_URL?.trim() || DEFAULT_URL;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const res = await doFetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      signal: abort.signal,
      body: JSON.stringify({
        model,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        input: [
          { type: "message", role: "developer", content: INSTRUCTIONS },
          { type: "message", role: "user", content: prompt(req) },
        ],
      }),
    });
    if (!res.ok) {
      // The status is worth knowing; the body may quote the key back and is not.
      console.warn(`[counsel] ${req.title} turn ${req.turn}: ${res.status}`);
      return null;
    }
    const text = extractText(await res.json());
    return text ? { text: tidy(text), model } : null;
  } catch (err) {
    const why = (err as Error).name === "AbortError" ? "timed out" : (err as Error).message;
    console.warn(`[counsel] ${req.title} turn ${req.turn}: ${why}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Reads a posted body into a request, or answers null if it is not one. */
export function readRequest(raw: unknown): CounselRequest | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Partial<CounselRequest>;
  const facts = Array.isArray(r.facts)
    ? r.facts.filter((f): f is string => typeof f === "string" && f.trim().length > 0)
      .map((f) => f.trim().slice(0, 300))
      .slice(0, 6)
    : [];
  if (!facts.length) return null;
  const str = (v: unknown, fallback: string): string =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : fallback;
  const num = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 1;
  return {
    title: str(r.title, "the field"),
    tactic: str(r.tactic, "command"),
    turn: num(r.turn),
    maxTurns: num(r.maxTurns),
    enemy: str(r.enemy, "enemy"),
    facts,
  };
}
