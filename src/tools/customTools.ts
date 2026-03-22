/**
 * Custom bonus tools built on top of the Jikan API:
 * - Genre explorer with ID lookup
 * - Anime comparison tool
 * - Streaming platform checker via external links
 * - Watchlist/recommendation engine (by genre + score)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jikanGet } from "../services/jikanClient.js";
import {
  formatAnimeList,
  animeToMarkdown,
  formatMangaList,
  mangaToMarkdown,
  truncateResponse,
} from "../services/formatters.js";
import type {
  Anime,
  Manga,
  JikanListResponse,
  JikanSingleResponse,
} from "../types.js";

// Hardcoded genre map (Jikan v4 genre IDs for anime)
const ANIME_GENRE_MAP: Record<string, number> = {
  action: 1,
  adventure: 2,
  "avant garde": 5,
  "award winning": 46,
  "boys love": 28,
  comedy: 4,
  drama: 8,
  fantasy: 10,
  "girls love": 26,
  gourmet: 47,
  horror: 14,
  mystery: 7,
  romance: 22,
  "sci-fi": 24,
  "slice of life": 36,
  sports: 30,
  supernatural: 37,
  suspense: 41,
  ecchi: 9,
  erotica: 49,
  hentai: 12,
  kids: 15,
  mecha: 18,
  music: 19,
  parody: 20,
  samurai: 21,
  school: 23,
  psychological: 40,
  military: 38,
  historical: 13,
  magic: 16,
  martial_arts: 17,
  space: 29,
  vampire: 32,
};

const MANGA_GENRE_MAP: Record<string, number> = {
  action: 1,
  adventure: 2,
  "avant garde": 5,
  comedy: 4,
  drama: 8,
  fantasy: 10,
  horror: 14,
  mystery: 7,
  romance: 22,
  "sci-fi": 24,
  "slice of life": 36,
  sports: 30,
  supernatural: 37,
  psychological: 40,
  historical: 13,
  magic: 16,
  mecha: 18,
  music: 19,
  school: 23,
};

export function registerCustomTools(server: McpServer): void {
  // ─── 1. Genre Explorer ─────────────────────────────────────────────────

  server.registerTool(
    "genres_list",
    {
      title: "List Available Genres",
      description: `Returns the available Jikan genre categories for anime or manga, with their IDs.
Useful to find genre IDs for use in anime_search, manga_search, and other filtered queries.

Args:
  - type (string): anime or manga

Returns:
  List of genre names and their Jikan MAL IDs.`,
      inputSchema: z.object({
        type: z.enum(["anime", "manga"]).default("anime"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ type }) => {
      const map = type === "anime" ? ANIME_GENRE_MAP : MANGA_GENRE_MAP;
      const lines = Object.entries(map)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, id]) => `- **${name}** → ID: \`${id}\``);

      return {
        content: [
          {
            type: "text",
            text: `# ${type === "anime" ? "Anime" : "Manga"} Genres\n\nUse the ID in the \`genres\` parameter (e.g. \`genres="1,4"\` for Action + Comedy).\n\n${lines.join("\n")}`,
          },
        ],
        structuredContent: { type, genres: map },
      };
    },
  );

  // ─── 2. Anime Comparison ───────────────────────────────────────────────

  server.registerTool(
    "anime_compare",
    {
      title: "Compare Two Anime",
      description: `Compare two anime side-by-side by their MAL IDs. Shows score, rank, episodes, genres, studios, and synopsis for both.

Args:
  - mal_id_1 (number): First anime MAL ID
  - mal_id_2 (number): Second anime MAL ID

Returns:
  Side-by-side comparison of both anime with a verdict on which scores higher.`,
      inputSchema: z.object({
        mal_id_1: z.number().int().min(1).describe("First anime MAL ID"),
        mal_id_2: z.number().int().min(1).describe("Second anime MAL ID"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ mal_id_1, mal_id_2 }) => {
      const [res1, res2] = await Promise.all([
        jikanGet<JikanSingleResponse<Anime>>(`/anime/${mal_id_1}`),
        jikanGet<JikanSingleResponse<Anime>>(`/anime/${mal_id_2}`),
      ]);

      const a = res1.data;
      const b = res2.data;

      const row = (
        label: string,
        v1: string | number | undefined,
        v2: string | number | undefined,
      ) => `| **${label}** | ${v1 ?? "–"} | ${v2 ?? "–"} |`;

      const genresA = a.genres?.map((g) => g.name).join(", ") ?? "–";
      const genresB = b.genres?.map((g) => g.name).join(", ") ?? "–";
      const studiosA = a.studios?.map((s) => s.name).join(", ") ?? "–";
      const studiosB = b.studios?.map((s) => s.name).join(", ") ?? "–";

      const table = [
        `| | **${a.title}** | **${b.title}** |`,
        `|---|---|---|`,
        row("Type", a.type, b.type),
        row("Episodes", a.episodes, b.episodes),
        row("Status", a.status, b.status),
        row("Score", a.score, b.score),
        row("Rank", a.rank ? `#${a.rank}` : "–", b.rank ? `#${b.rank}` : "–"),
        row(
          "Popularity",
          a.popularity ? `#${a.popularity}` : "–",
          b.popularity ? `#${b.popularity}` : "–",
        ),
        row(
          "Season",
          `${a.season ?? "–"} ${a.year ?? ""}`,
          `${b.season ?? "–"} ${b.year ?? ""}`,
        ),
        row("Rating", a.rating, b.rating),
        row("Genres", genresA, genresB),
        row("Studios", studiosA, studiosB),
      ].join("\n");

      // Verdict
      let verdict = "";
      if (a.score !== undefined && b.score !== undefined) {
        if (a.score > b.score)
          verdict = `\n\n🏆 **${a.title}** scores higher (${a.score} vs ${b.score})`;
        else if (b.score > a.score)
          verdict = `\n\n🏆 **${b.title}** scores higher (${b.score} vs ${a.score})`;
        else verdict = `\n\n🤝 Both anime are tied at **${a.score}**!`;
      }

      const synopsisA = a.synopsis?.slice(0, 300) ?? "No synopsis.";
      const synopsisB = b.synopsis?.slice(0, 300) ?? "No synopsis.";

      const full = `# Anime Comparison\n\n${table}${verdict}\n\n**${a.title} Synopsis**: ${synopsisA}\n\n**${b.title} Synopsis**: ${synopsisB}`;

      return {
        content: [{ type: "text", text: truncateResponse(full) }],
        structuredContent: {
          anime_1: {
            mal_id: a.mal_id,
            title: a.title,
            score: a.score,
            rank: a.rank,
          },
          anime_2: {
            mal_id: b.mal_id,
            title: b.title,
            score: b.score,
            rank: b.rank,
          },
        },
      };
    },
  );

  // ─── 3. Smart Recommendation Engine ───────────────────────────────────

  server.registerTool(
    "anime_recommend_by_preferences",
    {
      title: "Get Anime Recommendations by Preferences",
      description: `Custom recommendation engine: finds top-rated anime based on genre preferences, type, min score, and era.

This tool builds a personalized anime recommendation list based on your criteria — useful when a user says "recommend me anime" with some preferences.

Args:
  - genres (string[]): Preferred genre names (e.g. ["action", "fantasy"])
  - type (string): tv, movie, ova, etc.
  - min_score (number): Minimum score threshold (e.g. 8.0)
  - year_from / year_to (number): Optional year range
  - limit (number): How many results to return (default 8)

Returns:
  Curated list of top-rated anime matching your preferences.`,
      inputSchema: z.object({
        genres: z
          .array(z.string())
          .min(1)
          .max(5)
          .describe(
            "Genre names from the genres_list tool (e.g. ['action', 'fantasy'])",
          ),
        type: z
          .enum(["tv", "movie", "ova", "special", "ona", "music"])
          .optional(),
        min_score: z.number().min(5).max(10).optional().default(7.5),
        year_from: z.number().int().min(1960).max(2030).optional(),
        year_to: z.number().int().min(1960).max(2030).optional(),
        limit: z.number().int().min(1).max(20).default(8),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      // Resolve genre names to IDs
      const genreIds: number[] = [];
      const unresolved: string[] = [];
      for (const name of params.genres) {
        const id = ANIME_GENRE_MAP[name.toLowerCase()];
        if (id) genreIds.push(id);
        else unresolved.push(name);
      }

      if (!genreIds.length) {
        return {
          content: [
            {
              type: "text",
              text: `Could not resolve any genre names to IDs. Unknown: ${unresolved.join(", ")}. Use genres_list tool to see available genres.`,
            },
          ],
        };
      }

      const res = await jikanGet<JikanListResponse<Anime>>("/anime", {
        genres: genreIds.join(","),
        type: params.type,
        min_score: params.min_score,
        start_date: params.year_from ? `${params.year_from}-01-01` : undefined,
        end_date: params.year_to ? `${params.year_to}-12-31` : undefined,
        order_by: "score",
        sort: "desc",
        limit: params.limit,
        sfw: "true",
      });

      const formatted = formatAnimeList(res.data);
      if (!formatted.length) {
        return {
          content: [
            {
              type: "text",
              text: `No anime found matching genres: ${params.genres.join(", ")} with score ≥ ${params.min_score}. Try lowering the min_score or broadening the genres.`,
            },
          ],
        };
      }

      const header = `# 🎯 Personalized Recommendations\n**Genres**: ${params.genres.join(", ")}${params.type ? ` | **Type**: ${params.type}` : ""}${params.min_score ? ` | **Min Score**: ${params.min_score}` : ""}\n\n`;
      const md = formatted.map(animeToMarkdown).join("\n\n---\n\n");

      const warning = unresolved.length
        ? `\n\n⚠️ Unrecognized genre names (ignored): ${unresolved.join(", ")}`
        : "";

      return {
        content: [
          { type: "text", text: truncateResponse(`${header}${md}${warning}`) },
        ],
        structuredContent: {
          recommendations: formatted,
          resolved_genres: genreIds,
          unresolved_genres: unresolved,
        },
      };
    },
  );

  // ─── 4. Get Anime External Links ──────────────────────────────────────

  server.registerTool(
    "anime_get_streaming",
    {
      title: "Get Anime Streaming Links",
      description: `Get streaming platform links and external site links for an anime (e.g. Crunchyroll, Netflix, Funimation, official website).

Args:
  - mal_id (number): MyAnimeList anime ID

Returns:
  External site links and streaming service URLs for the anime.`,
      inputSchema: z.object({
        mal_id: z.number().int().min(1),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ mal_id }) => {
      const [externalRes, streamingRes] = await Promise.all([
        jikanGet<{ data: Array<{ name: string; url: string }> }>(
          `/anime/${mal_id}/external`,
        ),
        jikanGet<{ data: Array<{ name: string; url: string }> }>(
          `/anime/${mal_id}/streaming`,
        ),
      ]);

      const streaming = streamingRes.data;
      const external = externalRes.data;

      if (!streaming.length && !external.length) {
        return {
          content: [
            {
              type: "text",
              text: "No streaming or external links found for this anime.",
            },
          ],
        };
      }

      const streamLines = streaming.map((s) => `- 📺 **${s.name}**: ${s.url}`);
      const extLines = external.map((e) => `- 🔗 **${e.name}**: ${e.url}`);

      const text = [
        streaming.length
          ? `## Streaming Platforms\n${streamLines.join("\n")}`
          : "",
        external.length ? `## External Links\n${extLines.join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: `# Streaming & Links for Anime #${mal_id}\n\n${text}`,
          },
        ],
        structuredContent: { mal_id, streaming, external },
      };
    },
  );

  // ─── 5. Anime Statistics ──────────────────────────────────────────────

  server.registerTool(
    "anime_get_stats",
    {
      title: "Get Anime Statistics",
      description: `Get detailed watch statistics for an anime — how many users are watching, completed, dropped, etc.

Args:
  - mal_id (number): MyAnimeList anime ID

Returns:
  Statistics: watching, completed, on_hold, dropped, plan_to_watch, total, score distribution.`,
      inputSchema: z.object({
        mal_id: z.number().int().min(1),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ mal_id }) => {
      interface AnimeStats {
        watching: number;
        completed: number;
        on_hold: number;
        dropped: number;
        plan_to_watch: number;
        total: number;
        scores: Record<string, { votes: number; percentage: number }>;
      }
      const res = await jikanGet<{ data: AnimeStats }>(
        `/anime/${mal_id}/statistics`,
      );
      const s = res.data;

      const scoreLines = Object.entries(s.scores ?? {})
        .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
        .map(
          ([score, d]) =>
            `  - **${score}/10**: ${d.votes.toLocaleString()} votes (${d.percentage}%)`,
        );

      const text = [
        `# Statistics for Anime #${mal_id}`,
        ``,
        `| Status | Users |`,
        `|--------|-------|`,
        `| 👀 Watching | ${s.watching?.toLocaleString() ?? "–"} |`,
        `| ✅ Completed | ${s.completed?.toLocaleString() ?? "–"} |`,
        `| ⏸ On Hold | ${s.on_hold?.toLocaleString() ?? "–"} |`,
        `| ❌ Dropped | ${s.dropped?.toLocaleString() ?? "–"} |`,
        `| 📋 Plan to Watch | ${s.plan_to_watch?.toLocaleString() ?? "–"} |`,
        `| 👥 **Total** | **${s.total?.toLocaleString() ?? "–"}** |`,
        ``,
        `## Score Distribution`,
        ...scoreLines,
      ].join("\n");

      return {
        content: [{ type: "text", text: text }],
        structuredContent: s as unknown as Record<string, unknown>,
      };
    },
  );

  // ─── 6. Anime News ────────────────────────────────────────────────────

  server.registerTool(
    "anime_get_news",
    {
      title: "Get Anime News",
      description: `Get recent news articles about an anime from MyAnimeList.

Args:
  - mal_id (number): MyAnimeList anime ID
  - page (number): Page number

Returns:
  Recent news articles with titles, dates, and links.`,
      inputSchema: z.object({
        mal_id: z.number().int().min(1),
        page: z.number().int().min(1).default(1),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ mal_id, page }) => {
      interface NewsItem {
        mal_id: number;
        url: string;
        title: string;
        date: string;
        author_username: string;
        forum_url: string;
        images?: { jpg?: { image_url?: string } };
        comments: number;
        excerpt: string;
      }
      const res = await jikanGet<JikanListResponse<NewsItem>>(
        `/anime/${mal_id}/news`,
        { page },
      );

      if (!res.data.length)
        return { content: [{ type: "text", text: "No news found." }] };

      const lines = res.data.map(
        (n) =>
          `### ${n.title}\n*${n.date?.slice(0, 10)} by @${n.author_username} | 💬 ${n.comments} comments*\n${n.excerpt?.slice(0, 300) ?? ""}\n🔗 ${n.url}`,
      );

      return {
        content: [
          {
            type: "text",
            text: truncateResponse(
              `# News for Anime #${mal_id}\n\n${lines.join("\n\n---\n\n")}`,
            ),
          },
        ],
        structuredContent: { mal_id, news: res.data },
      };
    },
  );
}
