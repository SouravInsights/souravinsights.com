import { and, asc, eq, ilike, sql } from "drizzle-orm";
import { generateText, stepCountIs } from "ai";
import { normalizeUrl } from "@/app/insights/utils/urlUtils";
import { db } from "@/db";
import { links, linkChunks } from "@/db/schema";
import { agentTools, MAX_STEPS, SEARCH_LIMIT } from "./agent";
import { chatModel } from "./model";
import { SYSTEM_PROMPT } from "./prompt";
import { search } from "./search";

/**
 * Inspection for the two questions a knowledge base raises.
 *
 *   1. **Inspect a link** — what did we store for this page, and does it look
 *      sane? No model, no embeddings, no cost. This is the one that catches a
 *      page that rotted after it was saved: a spam directory grew to 1,071
 *      passages and 1.7MB inside a 2,794-passage index, because nothing ever
 *      looked at one link and asked "is this a normal size?".
 *   2. **Trace a question** — what did the agent actually do? The queries it
 *      chose, the links it was handed, and whether those links had any business
 *      being there. Answers "why did it say that", which the UI cannot show.
 *
 * Both return plain data, so a CLI, a test or a page can render them. Rendering
 * lives at the edges, not here.
 */

/** Above this many passages, one link owns enough of the index to distort it. */
export const HEAVY_CHUNKS = 200;
/** A page whose text is this large is usually a directory, not a document. */
export const HEAVY_RAW_CHARS = 500_000;
/** Below this, a passage is a line of description rather than a paragraph. */
export const THIN_TOKENS = 40;

export interface InspectionWarning {
  level: "warn" | "info";
  message: string;
}

export interface LinkCandidate {
  urlKey: string;
  title: string;
  channel: string;
  passages: number;
}

/** `%` and `_` are LIKE wildcards; a title containing them must not match anything. */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

/**
 * Links whose key, url or title contains the query.
 *
 * This exists so nobody has to know that `url_key` is the URL with its scheme
 * and `www.` removed. Paste a whole URL, type a domain, or type any fragment of
 * a title.
 */
export async function findLinks(
  query: string,
  limit = 20
): Promise<LinkCandidate[]> {
  const q = `%${escapeLike(query)}%`;
  const rows = (await db.execute(sql`
    select l.url_key, l.title, l.channel, count(c.id)::int as passages
    from links l left join link_chunks c on c.link_id = l.id
    where l.url_key ilike ${q} or l.url ilike ${q} or l.title ilike ${q}
    group by 1, 2, 3
    order by (l.url_key = ${query}) desc, count(c.id) desc, l.url_key
    limit ${limit}
  `).then((r) => r.rows)) as any;

  return rows.map((r: any) => ({
    urlKey: r.url_key,
    title: r.title,
    channel: r.channel,
    passages: r.passages,
  }));
}

/** No exact key, and either nothing or more than one thing looked like it. */
export class LinkNotFoundError extends Error {
  constructor(
    readonly query: string,
    readonly candidates: LinkCandidate[]
  ) {
    super(
      candidates.length
        ? `No exact match for "${query}". ${candidates.length} link(s) look like it.`
        : `No link matches "${query}".`
    );
  }
}

/**
 * Whatever was typed → the one `url_key` it means.
 *
 * The key is `normalizeUrl(url)` — the same function intake, the API and the UI
 * use (see `urlUtils.ts`), so a pasted `https://www.time.fyi/` lands on
 * `time.fyi`. A single loose hit is accepted; anything else is the caller's
 * problem to present.
 */
export async function resolveUrlKey(
  input: string
): Promise<{ urlKey: string; matched: "exact" | "loose" } | null> {
  const key = normalizeUrl(input.trim());

  const [exact] = await db
    .select({ urlKey: links.urlKey })
    .from(links)
    .where(eq(links.urlKey, key))
    .limit(1);
  if (exact) return { urlKey: exact.urlKey, matched: "exact" };

  const loose = await findLinks(key, 2);
  if (loose.length === 1) return { urlKey: loose[0].urlKey, matched: "loose" };

  return null;
}

export interface LinkInspection {
  link: {
    id: number;
    urlKey: string;
    url: string;
    title: string;
    description: string;
    channel: string;
    extractStatus: string;
    health: string;
    hidden: boolean;
    addedAt: string;
    extractedAt: string | null;
    rawChars: number;
    contentHash: string | null;
  };
  stats: {
    passages: number;
    indexPassages: number;
    pctOfIndex: number;
    totalTokens: number;
    minTokens: number;
    medianTokens: number;
    maxTokens: number;
  };
  warnings: InspectionWarning[];
  /** How the passage text was prefixed before embedding — reconstructed. */
  embeddingHeader: string;
  passages: {
    index: number;
    tokens: number;
    chars: number;
    content: string;
  }[];
  /** How many passages the current filter matches. */
  matched: number;
}

/**
 * Everything stored for one link.
 *
 * @param input  a `url_key`, a full URL, or any fragment of a key or title —
 *               `time.fyi`, `https://www.time.fyi/` and `time` all work.
 * @param grep   only passages containing this substring — how you find the one
 *               passage an answer came from, in a 1,071-passage page.
 */
export async function inspectLink(
  input: string,
  opts: { limit?: number; grep?: string } = {}
): Promise<LinkInspection> {
  const resolved = await resolveUrlKey(input);
  if (!resolved) {
    throw new LinkNotFoundError(input, await findLinks(input, 20));
  }

  const [row] = await db
    .select({
      id: links.id,
      urlKey: links.urlKey,
      url: links.url,
      title: links.title,
      description: links.description,
      channel: links.channel,
      extractStatus: links.extractStatus,
      health: links.health,
      hiddenAt: links.hiddenAt,
      addedAt: links.addedAt,
      extractedAt: links.extractedAt,
      contentHash: links.contentHash,
      rawChars: sql<number>`coalesce(length(${links.rawText}), 0)`,
    })
    .from(links)
    .where(eq(links.urlKey, resolved.urlKey))
    .limit(1);

  if (!row) {
    // Only reachable if the row vanished between resolve and read.
    throw new LinkNotFoundError(input, []);
  }

  const [stats] = (await db.execute(sql`
    select count(*)::int as passages,
           coalesce(sum(token_count), 0)::int as total_tokens,
           coalesce(min(token_count), 0)::int as min_tokens,
           coalesce(percentile_cont(0.5) within group (order by token_count)::int, 0) as median_tokens,
           coalesce(max(token_count), 0)::int as max_tokens
    from link_chunks
    where link_id = ${row.id}
  `).then((r) => r.rows)) as any;

  const [index] = (await db.execute(sql`
    select count(*)::int as passages from link_chunks
  `).then((r) => r.rows)) as any;

  const [matched] = (await db.execute(sql`
    select count(*)::int as n from link_chunks
    where link_id = ${row.id}
      ${opts.grep ? sql`and content ilike ${"%" + opts.grep + "%"}` : sql``}
  `).then((r) => r.rows)) as any;

  const passages = await db
    .select({
      index: linkChunks.chunkIndex,
      tokens: linkChunks.tokenCount,
      content: linkChunks.content,
    })
    .from(linkChunks)
    .where(
      opts.grep
        ? and(eq(linkChunks.linkId, row.id), ilike(linkChunks.content, `%${opts.grep}%`))
        : eq(linkChunks.linkId, row.id)
    )
    .orderBy(asc(linkChunks.chunkIndex))
    .limit(opts.limit ?? 5);

  const warnings: InspectionWarning[] = [];
  const pct = index.passages ? (stats.passages / index.passages) * 100 : 0;
  // The raw-SQL row is snake_case; read it once here so the checks below can't
  // silently compare `undefined` against a number.
  const median = Number(stats.median_tokens);

  if (stats.passages === 0) {
    warnings.push({
      level: "warn",
      message:
        row.extractStatus === "skipped"
          ? "Not indexed. A never-fetched channel is indexed by title + description; a skipped row with no text is invisible to search."
          : `Not indexed (${row.extractStatus}). This link can never be retrieved.`,
    });
  }
  if (stats.passages > HEAVY_CHUNKS) {
    warnings.push({
      level: "warn",
      message: `${stats.passages} passages — ${pct.toFixed(1)}% of the whole index from one link. Check the text before trusting any score involving it.`,
    });
  }
  if (Number(row.rawChars) > HEAVY_RAW_CHARS) {
    warnings.push({
      level: "warn",
      message: `${Number(row.rawChars).toLocaleString()} characters of stored text. That is a directory or a dump, not an article.`,
    });
  }
  if (median > 0 && median < THIN_TOKENS) {
    warnings.push({
      level: "info",
      message: `Median passage is ${median} tokens — a description line, not a paragraph. Only "is there one about X" questions are fair to this link.`,
    });
  }
  if (row.hiddenAt) {
    warnings.push({
      level: "info",
      message: "Hidden — excluded from search, feeds and the page.",
    });
  }
  if (row.health === "dead") {
    warnings.push({ level: "info", message: "Marked dead — excluded from search." });
  }

  const header = [row.title, row.channel].filter(Boolean).join(" — ");

  return {
    link: {
      id: row.id,
      urlKey: row.urlKey,
      url: row.url,
      title: row.title,
      description: row.description,
      channel: row.channel,
      extractStatus: row.extractStatus,
      health: row.health,
      hidden: row.hiddenAt !== null,
      addedAt: row.addedAt?.toISOString() ?? "",
      extractedAt: row.extractedAt?.toISOString() ?? null,
      rawChars: Number(row.rawChars),
      contentHash: row.contentHash,
    },
    stats: {
      passages: stats.passages,
      indexPassages: index.passages,
      pctOfIndex: pct,
      totalTokens: stats.total_tokens,
      minTokens: stats.min_tokens,
      medianTokens: stats.median_tokens,
      maxTokens: stats.max_tokens,
    },
    warnings,
    embeddingHeader: header ? `${header}: ` : "",
    passages: passages.map((p) => ({
      index: p.index,
      tokens: p.tokens,
      chars: p.content.length,
      content: p.content,
    })),
    matched: matched.n,
  };
}

export interface OverviewRow {
  urlKey: string;
  channel: string;
  extractStatus: string;
  passages: number;
  pctOfIndex: number;
  rawChars: number;
}

/** The shape of the whole index: totals, per channel, and the heaviest links. */
export async function kbOverview() {
  const [totals] = (await db.execute(sql`
    select (select count(*) from links)::int as links,
           (select count(*) from links where hidden_at is null)::int as visible,
           (select count(*) from link_chunks)::int as passages,
           (select count(*) from links l
              where l.hidden_at is null and not exists (
                select 1 from link_chunks c where c.link_id = l.id))::int as not_indexed
  `).then((r) => r.rows)) as any;

  const channels = (await db.execute(sql`
    select l.channel,
           count(distinct l.id)::int as links,
           count(c.id)::int as passages,
           coalesce(percentile_cont(0.5) within group (order by c.token_count)::int, 0) as median_tokens
    from links l left join link_chunks c on c.link_id = l.id
    where l.hidden_at is null
    group by 1 order by 3 desc
  `).then((r) => r.rows)) as any;

  const heaviest = (await db.execute(sql`
    select l.url_key, l.channel, l.extract_status,
           count(c.id)::int as passages,
           round(100.0 * count(c.id) / greatest((select count(*) from link_chunks), 1), 1) as pct,
           coalesce(length(l.raw_text), 0)::int as raw_chars
    from links l join link_chunks c on c.link_id = l.id
    where l.hidden_at is null
    group by 1,2,3,6
    order by 4 desc
    limit 15
  `).then((r) => r.rows)) as any;

  const unindexed = (await db.execute(sql`
    select l.url_key, l.channel, l.extract_status
    from links l
    where l.hidden_at is null
      and not exists (select 1 from link_chunks c where c.link_id = l.id)
    order by l.channel, l.url_key
  `).then((r) => r.rows)) as any;

  return {
    totals,
    channels: channels as {
      channel: string;
      links: number;
      passages: number;
      median_tokens: number;
    }[],
    unindexed: unindexed.map((u: any) => ({
      urlKey: u.url_key,
      channel: u.channel,
      extractStatus: u.extract_status,
    })) as { urlKey: string; channel: string; extractStatus: string }[],
    heaviest: heaviest.map((h: any) => ({
      urlKey: h.url_key,
      channel: h.channel,
      extractStatus: h.extract_status,
      passages: h.passages,
      pctOfIndex: Number(h.pct),
      rawChars: h.raw_chars,
    })) as OverviewRow[],
  };
}


/* -------------------------------------------------------------------------- */
/*  Tracing one question                                                      */
/* -------------------------------------------------------------------------- */

export interface TracePassage {
  url: string;
  urlKey: string;
  title: string;
  channel: string;
  passageChars: number;
}

export interface TraceToolResult {
  name: string;
  matches?: TracePassage[];
  note?: string;
  url?: string;
  textChars?: number;
  error?: string;
}

export interface TraceStep {
  stepNumber: number;
  toolCalls: { name: string; input: unknown }[];
  toolResults: TraceToolResult[];
  text: string;
  finishReason: string;
  tokens: { input: number; output: number; total: number };
}

export interface ScoredQuery {
  query: string;
  channel?: string;
  /** The links the tool actually returned — `limit` of them. */
  handedOver: {
    rank: number;
    score: number;
    urlKey: string;
    title: string;
    passageChars: number;
  }[];
  /** Ranks past the cut. These were reachable, and the model never saw them. */
  cut: { rank: number; score: number; urlKey: string }[];
}

export interface TraceResult {
  question: string;
  steps: TraceStep[];
  answer: string;
  /** One entry per distinct search the model ran, with the scores it never saw. */
  scored: ScoredQuery[];
  totals: {
    steps: number;
    inputTokens: number;
    outputTokens: number;
    ms: number;
  };
}

const urlKeyOf = (url: string) =>
  url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

function summarise(name: string, output: unknown): TraceToolResult {
  const o = (output ?? {}) as {
    matches?: {
      url: string;
      title: string;
      channel: string;
      passage: string;
    }[];
    note?: string;
    url?: string;
    text?: string;
    error?: string;
  };

  if (name === "search_knowledge") {
    return {
      name,
      matches: (o.matches ?? []).map((m) => ({
        url: m.url,
        urlKey: urlKeyOf(m.url),
        title: m.title,
        channel: m.channel,
        passageChars: (m.passage ?? "").length,
      })),
      note: o.note,
    };
  }

  if (name === "fetch_link") {
    return {
      name,
      url: o.url,
      textChars: o.text?.length,
      error: o.error,
    };
  }

  return { name };
}

/**
 * Run the real agent on one question and record the path.
 *
 * The agent's own tool results carry no score — that is a gap worth closing, and
 * until it is, this re-runs each search wider (`limit: 25`) to show the scores
 * and the ranks that were cut. Embeddings are deterministic, so the re-run's
 * first 6 links are the 6 the model was handed; pass `score: false` to skip the
 * extra calls and see only the agent's own view.
 */
export async function traceQuestion(
  question: string,
  opts: { limit?: number; score?: boolean } = {}
): Promise<TraceResult> {
  const limit = opts.limit ?? SEARCH_LIMIT;
  const started = Date.now();

  const result = await generateText({
    model: chatModel(),
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: question }],
    tools: agentTools(),
    stopWhen: stepCountIs(MAX_STEPS),
  });

  const steps: TraceStep[] = result.steps.map((s) => ({
    stepNumber: s.stepNumber,
    toolCalls: s.toolCalls.map((c) => ({ name: c.toolName, input: c.input })),
    toolResults: s.toolResults.map((r) =>
      summarise(
        (r as { toolName: string }).toolName,
        (r as { output: unknown }).output
      )
    ),
    text: s.text,
    finishReason: String(s.finishReason),
    tokens: {
      input: s.usage.inputTokens ?? 0,
      output: s.usage.outputTokens ?? 0,
      total: s.usage.totalTokens ?? 0,
    },
  }));

  const scored: ScoredQuery[] = [];
  if (opts.score !== false) {
    const seen = new Set<string>();
    for (const step of result.steps) {
      for (const call of step.toolCalls) {
        if (call.toolName !== "search_knowledge") continue;
        const input = call.input as { query?: string; channel?: string };
        if (!input?.query) continue;
        const key = `${input.query}|${input.channel ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const wide = await search(input.query, {
          channel: input.channel,
          limit: 25,
        });

        scored.push({
          query: input.query,
          channel: input.channel,
          handedOver: wide.slice(0, limit).map((h, i) => ({
            rank: i + 1,
            score: h.score,
            urlKey: h.urlKey,
            title: h.title,
            passageChars: h.passages[0]?.content.length ?? 0,
          })),
          cut: wide.slice(limit).map((h, i) => ({
            rank: limit + i + 1,
            score: h.score,
            urlKey: h.urlKey,
          })),
        });
      }
    }
  }

  return {
    question,
    steps,
    answer: result.text,
    scored,
    totals: {
      steps: result.steps.length,
      inputTokens: result.totalUsage.inputTokens ?? 0,
      outputTokens: result.totalUsage.outputTokens ?? 0,
      ms: Date.now() - started,
    },
  };
}

