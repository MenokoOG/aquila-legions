import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type CounselRequest, type Fetcher, TIMEOUT_MS, counsel, counselAvailable, extractText, readRequest,
  tidy,
} from "../server/counsel.js";

/**
 * The one route in this game that leaves the machine.
 *
 * Two things are being defended here. The first is that a battle is never
 * blocked or broken by it: no key, a timeout, a rate limit, a shape nobody
 * expected — every one of those has to end as a quiet null and leave the local
 * adviser exactly as it was. The second is that the key never appears anywhere
 * it could be read back.
 *
 * **No test in this file calls the real API.** Every one injects a fetcher.
 */

const ASK: CounselRequest = {
  title: "Tapae", tactic: "Cuneus to split a line", turn: 4, maxTurns: 14, enemy: "Dacian",
  facts: ["Coh. IV is in bow range in line.", "Two units already touch the falxmen."],
};

const KEY = { OPENAI_API_KEY: "test-key-not-a-real-one" } as NodeJS.ProcessEnv;

function replies(body: unknown, status = 200): Fetcher {
  return (async () => new Response(JSON.stringify(body), {
    status, headers: { "content-type": "application/json" },
  })) as Fetcher;
}

/** Captures what would have gone over the wire. */
function records(): { calls: { url: string; init: RequestInit }[]; fetcher: Fetcher } {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ output_text: "Lock shields, legate." }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }) as unknown as Fetcher;
  return { calls, fetcher };
}

describe("whether counsel is offered at all", () => {
  it("is off with no key, which is the shipped default", () => {
    strictEqual(counselAvailable({} as NodeJS.ProcessEnv), false);
    strictEqual(counselAvailable({ OPENAI_API_KEY: "   " } as NodeJS.ProcessEnv), false);
  });

  it("is on once a key is in the environment", () => {
    ok(counselAvailable(KEY));
  });

  it("does not call anything at all without a key", async () => {
    const { calls, fetcher } = records();
    strictEqual(await counsel(ASK, {} as NodeJS.ProcessEnv, fetcher), null);
    strictEqual(calls.length, 0, "a missing key must not become a request");
  });

  it("does not call anything when the local adviser found nothing to say", async () => {
    const { calls, fetcher } = records();
    strictEqual(await counsel({ ...ASK, facts: [] }, KEY, fetcher), null);
    strictEqual(calls.length, 0);
  });
});

describe("what goes over the wire", () => {
  it("sends the facts, the model and a capped length, and nothing else about the player", async () => {
    const { calls, fetcher } = records();
    await counsel(ASK, KEY, fetcher);
    strictEqual(calls.length, 1);

    const call = calls[0]!;
    ok(call.url.startsWith("https://api.openai.com/"), call.url);
    const body = JSON.parse(String(call.init.body)) as {
      model: string; max_output_tokens: number; input: { role: string; content: string }[];
    };
    strictEqual(body.model, "gpt-5.6-luna");
    ok(body.max_output_tokens > 0 && body.max_output_tokens <= 200, "the reply is two sentences, not an essay");

    const sent = body.input.map((m) => m.content).join("\n");
    for (const fact of ASK.facts) ok(sent.includes(fact), `the fact "${fact}" was not sent`);
    ok(/only what the FACTS say/i.test(sent), "the model must be told it may not add anything");
    // Nothing the save holds may travel with the ask: not the commander's name,
    // not their rank or points, not the notebook.
    for (const leak of ["Legatus", "historyPoints", "codexUnlocked", "commentarii", "objectivesMet"]) {
      ok(!sent.includes(leak), `"${leak}" went with the ask`);
    }
  });

  it("carries the key in the header and never in the body or the url", async () => {
    const { calls, fetcher } = records();
    await counsel(ASK, KEY, fetcher);
    const call = calls[0]!;
    const headers = call.init.headers as Record<string, string>;
    strictEqual(headers.authorization, `Bearer ${KEY.OPENAI_API_KEY}`);
    ok(!call.url.includes(KEY.OPENAI_API_KEY!), "a key in a URL is a key in a log");
    ok(!String(call.init.body).includes(KEY.OPENAI_API_KEY!));
  });

  it("lets the model and the endpoint be pointed somewhere else", async () => {
    const { calls, fetcher } = records();
    await counsel(ASK, {
      ...KEY, COUNSEL_MODEL: "some-other-model", COUNSEL_URL: "http://localhost:1234/v1/responses",
    } as NodeJS.ProcessEnv, fetcher);
    const body = JSON.parse(String(calls[0]!.init.body)) as { model: string };
    strictEqual(body.model, "some-other-model");
    strictEqual(calls[0]!.url, "http://localhost:1234/v1/responses");
  });
});

describe("when it goes wrong", () => {
  it("falls silent on a refusal rather than throwing", async () => {
    strictEqual(await counsel(ASK, KEY, replies({ error: "nope" }, 429)), null);
    strictEqual(await counsel(ASK, KEY, replies({ error: "nope" }, 500)), null);
    strictEqual(await counsel(ASK, KEY, replies({ error: "nope" }, 401)), null);
  });

  it("falls silent when the network does", async () => {
    const broken = (async () => { throw new Error("ECONNREFUSED"); }) as Fetcher;
    strictEqual(await counsel(ASK, KEY, broken), null);
  });

  it("falls silent when the reply is a shape nobody expected", async () => {
    for (const body of [{}, { output: [] }, { output_text: "   " }, [], null, "words"]) {
      strictEqual(await counsel(ASK, KEY, replies(body)), null, `${JSON.stringify(body)} should be silence`);
    }
  });

  it("gives up rather than letting a turn wait on the network", async () => {
    const hangs = ((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        reject(err);
      });
    })) as unknown as Fetcher;

    const started = Date.now();
    strictEqual(await counsel(ASK, KEY, hangs, 40), null, "a hung request has to end as silence");
    ok(Date.now() - started < 2000, "the timeout has to actually fire");
    ok(TIMEOUT_MS <= 8000, "and the shipped one has to be short enough to be worth having");
  });
});

describe("reading the reply", () => {
  it("takes the convenience field when there is one", () => {
    strictEqual(extractText({ output_text: "  Hold the line.  " }), "Hold the line.");
  });

  it("walks the output array when there is not", () => {
    strictEqual(
      extractText({ output: [{ content: [{ text: "Lock shields." }, { text: "Then close." }] }] }),
      "Lock shields. Then close.",
    );
  });

  it("answers null for anything else, so the caller falls back", () => {
    for (const body of [null, 7, "text", {}, { output: "no" }, { output: [{ content: {} }] }]) {
      strictEqual(extractText(body), null, `${JSON.stringify(body)}`);
    }
  });

  it("cuts a reply down to something a sidebar can hold", () => {
    const long = tidy("word ".repeat(400));
    ok(long.length <= 400, `${long.length} characters is not a sidebar`);
    strictEqual(tidy("two   lines\n  here "), "two lines here");
  });
});

describe("reading the posted request", () => {
  it("refuses a body with no facts in it", () => {
    for (const body of [null, {}, { facts: [] }, { facts: ["  "] }, { facts: "not an array" }]) {
      strictEqual(readRequest(body), null, `${JSON.stringify(body)}`);
    }
  });

  it("caps how much can be sent in one ask", () => {
    const out = readRequest({ facts: Array.from({ length: 50 }, (_, i) => `fact ${i} ${"x".repeat(500)}`) })!;
    ok(out.facts.length <= 6, "an ask is a turn's advice, not a transcript");
    for (const f of out.facts) ok(f.length <= 300);
  });

  it("fills in anything missing rather than trusting it", () => {
    const out = readRequest({ facts: ["Something true."], turn: -3, title: 42 })!;
    strictEqual(out.turn, 1);
    strictEqual(out.title, "the field");
    strictEqual(out.enemy, "enemy");
  });
});
