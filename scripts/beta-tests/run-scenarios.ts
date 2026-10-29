/**
 * Runs the 26 scenarios from the Beta Phase 1 brief through the real pipeline
 * and writes a report next to the brief's example replies.
 *
 *   npx tsx --env-file=.env.local scripts/beta-tests/run-scenarios.ts
 *   npx tsx --env-file=.env.local scripts/beta-tests/run-scenarios.ts --only A1,B2
 *   npx tsx --env-file=.env.local scripts/beta-tests/run-scenarios.ts --runs 2
 *
 * Output: scripts/beta-tests/out/report.md and report.json
 * Needs GOOGLE_GENERATIVE_AI_API_KEY and DATABASE_URL (retrieval uses the DB).
 * Costs about 2 Gemini chat calls + 1 embedding per scenario, so 26 scenarios
 * are well inside the free tier.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { runBetaPipeline, type BetaResult } from "@/lib/beta/pipeline";
import { SCENARIOS, type Scenario } from "./scenarios";

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only"))
  ? args[args.indexOf("--only") + 1] ?? ""
  : "";
const only = onlyArg ? new Set(onlyArg.split(",").map((s) => s.trim().toUpperCase())) : null;
const runsIdx = args.indexOf("--runs");
const RUNS = runsIdx >= 0 ? Math.max(1, Number(args[runsIdx + 1]) || 1) : 1;
const PAUSE_MS = 4500; // stay under the free-tier requests-per-minute limit

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      const transient = /429|RESOURCE_EXHAUSTED|503|UNAVAILABLE|fetch failed|ETIMEDOUT/i.test(msg);
      if (!transient || attempt >= 4) throw err;
      const wait = 15000 * attempt;
      console.log(`  …rate limited, waiting ${wait / 1000}s (attempt ${attempt})`);
      await sleep(wait);
    }
  }
}

// ── automatic checks ─────────────────────────────────────
const BANNED = [
  /\bjack\b/i,
  /you'?re not (very )?chatty/i,
  /guess you'?re not interested/i,
  /why (aren'?t|are) you (not )?(replying|ignoring|so short)/i,
  /\bbeautiful\b/i,
];
const DATE_WORDS = /\b(mon|tues?|wednes|thurs?|fri|satur|sun)day|tonight|tomorrow|this week|next week|weekend|drink|coffee|dinner|lunch|brunch|grab\b/i;

type Check = { name: string; pass: boolean; note?: string };

function check(s: Scenario, r: BetaResult): Check[] {
  const out: Check[] = [];
  if (r.clarify) {
    out.push({ name: "no clarification needed", pass: false, note: `asked: ${r.clarify.question}` });
    return out;
  }
  const rec = r.replies[0];
  out.push({ name: "3 replies", pass: r.replies.length === 3, note: `${r.replies.length}` });
  out.push({ name: "1 recommended", pass: r.replies.filter((x) => x.recommended).length === 1 });
  out.push({ name: `mode = ${s.expectMode}`, pass: r.mode === s.expectMode, note: `got ${r.mode}` });

  const all = [r.read, r.next_move, ...r.replies.map((x) => x.text)].join(" \n ");
  const hit = BANNED.find((b) => b.test(all));
  out.push({ name: "no banned phrases / 'Jack'", pass: !hit, note: hit ? String(hit) : undefined });
  out.push({ name: "replies short (<=280 chars)", pass: r.replies.every((x) => x.text.length <= 280) });

  if (s.expectMode === "opener") {
    const bad = r.replies.find((x) => /^(hey|hi|hello)\b[\s,!.]*(how|there|beautiful|gorgeous)?/i.test(x.text.trim()) && x.text.trim().length < 30);
    out.push({ name: "opener is not a bare hey/hi", pass: !bad, note: bad?.text });
  }
  if (s.expectNoProfileNote) {
    out.push({
      name: "says it hasn't seen her profile",
      pass: /(haven'?t|have not|not) (seen|got|been given)|upload|screenshot|profile/i.test(r.read) ,
    });
  }
  if (s.expectRecStyle) {
    out.push({
      name: `recommended style in ${s.expectRecStyle.join("/")}`,
      pass: s.expectRecStyle.includes(rec.style),
      note: `got ${rec.style}`,
    });
  }
  if (s.expectDate) {
    out.push({ name: "recommended reply proposes a date", pass: DATE_WORDS.test(rec.text), note: rec.text });
  }
  if (s.expectNoDate) {
    out.push({ name: "no date push", pass: !/\b(drink|dinner|coffee|date)\b/i.test(rec.text), note: rec.text });
  }
  if (s.id === "G1") {
    out.push({ name: "single light follow-up (no '?' alone)", pass: rec.text.trim().length > 8 && rec.text.trim() !== "?" });
  }
  return out;
}

// ── run ──────────────────────────────────────────────────
type Row = { scenario: Scenario; run: number; result?: BetaResult; error?: string; checks: Check[]; ms: number };

async function main() {
  const list = SCENARIOS.filter((s) => !only || only.has(s.id));
  if (list.length === 0) {
    console.error("No scenarios matched --only.");
    process.exit(1);
  }
  console.log(`Running ${list.length} scenario(s) x ${RUNS} run(s)\n`);

  const rows: Row[] = [];
  for (const s of list) {
    for (let run = 1; run <= RUNS; run++) {
      const t0 = Date.now();
      try {
        const result = await withRetry(() =>
          runBetaPipeline({
            requestedMode: s.tab,
            text: s.text,
            history: s.history,
            firstMover: s.firstMover ?? "auto",
          }),
        );
        const checks = check(s, result);
        const failed = checks.filter((c) => !c.pass).length;
        console.log(`${failed ? "✗" : "✓"} ${s.id} ${s.title}${failed ? `  (${failed} check(s) failed)` : ""}`);
        rows.push({ scenario: s, run, result, checks, ms: Date.now() - t0 });
      } catch (err) {
        console.log(`! ${s.id} ${s.title}  ERROR ${(err as Error).message}`);
        rows.push({ scenario: s, run, error: (err as Error).message, checks: [], ms: Date.now() - t0 });
      }
      await sleep(PAUSE_MS);
    }
  }

  // ── report ──
  const passed = rows.filter((r) => r.result && r.checks.every((c) => c.pass)).length;
  const lines: string[] = [];
  lines.push(`# Holla beta scenario report`);
  lines.push(`Generated ${new Date().toISOString()}  |  ${passed}/${rows.length} runs passed all automatic checks\n`);
  lines.push(`Automatic checks only cover rules (mode, banned phrases, date asked, style). **Whether each reply is actually good still needs a human read.**\n`);
  lines.push(`## Summary\n`);
  lines.push(`| ID | Scenario | Mode | Recommended style | Checks |`);
  lines.push(`|---|---|---|---|---|`);
  for (const r of rows) {
    const f = r.checks.filter((c) => !c.pass);
    lines.push(
      `| ${r.scenario.id} | ${r.scenario.title.replace(/\|/g, "/")} | ${r.result?.mode ?? "-"} | ${r.result?.replies[0]?.style ?? "-"} | ${r.error ? "ERROR" : f.length ? "FAIL: " + f.map((c) => c.name).join("; ") : "pass"} |`,
    );
  }
  lines.push(`\n## Detail (actual vs brief)\n`);
  for (const r of rows) {
    const s = r.scenario;
    lines.push(`### ${s.id}. ${s.title}${RUNS > 1 ? ` (run ${r.run})` : ""}`);
    lines.push(`**Input (${s.tab} tab):** ${s.text}`);
    if (s.history?.length) lines.push(`**Earlier chat:** ${s.history.map((h) => `${h.sender === "her" ? "Her" : "Him"}: ${h.text}`).join(" / ")}`);
    if (r.error || !r.result) {
      lines.push(`\n**ERROR:** ${r.error}\n`);
      continue;
    }
    const x = r.result;
    lines.push(`\n**Holla's read:** ${x.read || "(none)"}`);
    if (x.mode_note) lines.push(`**Mode note:** ${x.mode_note}`);
    lines.push(`**Stage:** ${x.stage}  |  **Her action:** ${x.understanding.her_action}  |  **Interest:** ${x.understanding.interest}`);
    lines.push(`\n**Holla replies:**`);
    x.replies.forEach((p) => lines.push(`- ${p.recommended ? "★ " : ""}(${p.style}) ${p.text}`));
    lines.push(`**Next move:** ${x.next_move}`);
    lines.push(`\n**Brief example:**${s.brief.read ? ` _${s.brief.read}_` : ""}`);
    s.brief.replies.forEach((p) => lines.push(`- (${p.style}) ${p.text}`));
    lines.push(`\n**Coaching pulled:** ${x.retrieved_sources.map((c) => `${c.coach} ${c.similarity}`).join(", ") || "none"}`);
    const fails = r.checks.filter((c) => !c.pass);
    lines.push(`**Checks:** ${fails.length ? fails.map((c) => `❌ ${c.name}${c.note ? ` (${c.note})` : ""}`).join("; ") : "all passed"}\n`);
  }

  const dir = path.join(process.cwd(), "scripts", "beta-tests", "out");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "report.md"), lines.join("\n"));
  writeFileSync(
    path.join(dir, "report.json"),
    JSON.stringify(rows.map((r) => ({ id: r.scenario.id, run: r.run, error: r.error, checks: r.checks, result: r.result && { ...r.result, understanding: undefined } })), null, 2),
  );
  console.log(`\n${passed}/${rows.length} passed automatic checks.`);
  console.log(`Report: ${path.join(dir, "report.md")}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});