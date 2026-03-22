import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jikanGet } from "../services/jikanClient.js";
import {
  formatAnimeList,
  formatMangaList,
  animeToMarkdown,
  mangaToMarkdown,
  truncateResponse,
  paginationInfo,
} from "../services/formatters.js";
import type { Anime, Manga, JikanListResponse } from "../types.js";
import { SEASONS, ANIME_TYPES } from "../constants.js";

export function registerDiscoveryTools(server: McpServer): void {
  // ─── 1. Get Current Season Anime ───────────────────────────────────────

  server.registerTool(
    "anime_season_now",
    {
      title: "Get Currently Airing Season Anime",
      description: `Get the anime airing in the current season on MyAnimeList.

Args:
  - filter (string): Filter by type — tv, movie, ova, special, ona, music
  - page / limit (number): Pagination (default page=1, limit=12)
  - sfw (boolean): Filter adult content (default true)

Returns:
  List of currently airing anime with scores, genres, studios.`,
      inputSchema: z.object({
        filter: z.enum(ANIME_TYPES).optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(25).default(12),
        sfw: z.boolean().optional().default(true),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      const res = await jikanGet<JikanListResponse<Anime>>("/seasons/now", {
        filter: params.filter,
        page: params.page,
        limit: params.limit,
        sfw: params.sfw ? "true" : undefined,
      });

      const formatted = formatAnimeList(res.data);
      if (!formatted.length)
        return {
          content: [{ type: "text", text: "No seasonal anime found." }],
        };

      const md = formatted.map(animeToMarkdown).join("\n\n---\n\n");
      const pg = paginationInfo(
        res.pagination.current_page,
        res.pagination.has_next_page,
        res.pagination.last_visible_page,
        res.pagination.items.total,
      );

      return {
        content: [
          {
            type: "text",
            text: truncateResponse(
              `# Currently Airing Anime (This Season)\n\n${md}${pg}`,
            ),
          },
        ],
        structuredContent: { results: formatted, pagination: res.pagination },
      };
    },
  );

  // ─── 2. Get Upcoming Season Anime ─────────────────────────────────────

  server.registerTool(
    "anime_season_upcoming",
    {
      title: "Get Upcoming Season Anime",
      description: `Get anime airing in the upcoming season (preview of what's coming next).

Args:
  - filter (string): Filter by type — tv, movie, ova, special, ona, music
  - page / limit (number): Pagination

Returns:
  List of upcoming anime.`,
      inputSchema: z.object({
        filter: z.enum(ANIME_TYPES).optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(25).default(12),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      const res = await jikanGet<JikanListResponse<Anime>>(
        "/seasons/upcoming",
        {
          filter: params.filter,
          page: params.page,
          limit: params.limit,
        },
      );

      const formatted = formatAnimeList(res.data);
      if (!formatted.length)
        return {
          content: [{ type: "text", text: "No upcoming anime found." }],
        };

      const md = formatted.map(animeToMarkdown).join("\n\n---\n\n");
      const pg = paginationInfo(
        res.pagination.current_page,
        res.pagination.has_next_page,
        res.pagination.last_visible_page,
        res.pagination.items.total,
      );

      return {
        content: [
          {
            type: "text",
            text: truncateResponse(`# Upcoming Season Anime\n\n${md}${pg}`),
          },
        ],
        structuredContent: { results: formatted, pagination: res.pagination },
      };
    },
  );

  // ─── 3. Get Seasonal Archive ───────────────────────────────────────────

  server.registerTool(
    "anime_season_archive",
    {
      title: "Get Anime by Season",
      description: `Get anime from a specific past or current season (year + season name).

Args:
  - year (number): Year (e.g., 2023)
  - season (string): winter, spring, summer, fall
  - filter (string): Optional type filter
  - page / limit (number): Pagination

Returns:
  List of anime from that season.`,
      inputSchema: z.object({
        year: z.number().int().min(1917).max(2030),
        season: z.enum(SEASONS),
        filter: z.enum(ANIME_TYPES).optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(25).default(12),
        sfw: z.boolean().optional().default(true),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const res = await jikanGet<JikanListResponse<Anime>>(
        `/seasons/${params.year}/${params.season}`,
        {
          filter: params.filter,
          page: params.page,
          limit: params.limit,
          sfw: params.sfw ? "true" : undefined,
        },
      );

      const formatted = formatAnimeList(res.data);
      if (!formatted.length)
        return {
          content: [{ type: "text", text: "No anime found for this season." }],
        };

      const md = formatted.map(animeToMarkdown).join("\n\n---\n\n");
      const pg = paginationInfo(
        res.pagination.current_page,
        res.pagination.has_next_page,
        res.pagination.last_visible_page,
        res.pagination.items.total,
      );

      return {
        content: [
          {
            type: "text",
            text: truncateResponse(
              `# ${params.season.toUpperCase()} ${params.year} Anime\n\n${md}${pg}`,
            ),
          },
        ],
        structuredContent: { results: formatted, pagination: res.pagination },
      };
    },
  );

  // ─── 4. Get Top Anime ──────────────────────────────────────────────────

  server.registerTool(
    "anime_top",
    {
      title: "Get Top Anime",
      description: `Get the top-ranked anime on MyAnimeList, with optional filters.

Args:
  - type (string): tv, movie, ova, special, ona, music
  - filter (string): airing, upcoming, bypopularity, favorite
  - rating (string): Age rating filter
  - page / limit (number): Pagination

Returns:
  Top-ranked anime sorted by score by default.`,
      inputSchema: z.object({
        type: z.enum(ANIME_TYPES).optional(),
        filter: z
          .enum(["airing", "upcoming", "bypopularity", "favorite"])
          .optional(),
        rating: z.enum(["g", "pg", "pg13", "r17", "r", "rx"]).optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(25).default(10),
        sfw: z.boolean().optional().default(true),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const res = await jikanGet<JikanListResponse<Anime>>("/top/anime", {
        type: params.type,
        filter: params.filter,
        rating: params.rating,
        page: params.page,
        limit: params.limit,
        sfw: params.sfw ? "true" : undefined,
      });

      const formatted = formatAnimeList(res.data);
      const md = formatted.map(animeToMarkdown).join("\n\n---\n\n");
      const pg = paginationInfo(
        res.pagination.current_page,
        res.pagination.has_next_page,
        res.pagination.last_visible_page,
        res.pagination.items.total,
      );

      return {
        content: [
          { type: "text", text: truncateResponse(`# Top Anime\n\n${md}${pg}`) },
        ],
        structuredContent: { results: formatted, pagination: res.pagination },
      };
    },
  );

  // ─── 5. Get Top Manga ──────────────────────────────────────────────────

  server.registerTool(
    "manga_top",
    {
      title: "Get Top Manga",
      description: `Get the top-ranked manga on MyAnimeList.

Args:
  - type (string): manga, novel, lightnovel, oneshot, doujin, manhwa, manhua
  - filter (string): publishing, upcoming, bypopularity, favorite
  - page / limit (number): Pagination

Returns:
  Top-ranked manga sorted by score by default.`,
      inputSchema: z.object({
        type: z
          .enum([
            "manga",
            "novel",
            "lightnovel",
            "oneshot",
            "doujin",
            "manhwa",
            "manhua",
          ])
          .optional(),
        filter: z
          .enum(["publishing", "upcoming", "bypopularity", "favorite"])
          .optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(25).default(10),
        sfw: z.boolean().optional().default(true),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const res = await jikanGet<JikanListResponse<Manga>>("/top/manga", {
        type: params.type,
        filter: params.filter,
        page: params.page,
        limit: params.limit,
        sfw: params.sfw ? "true" : undefined,
      });

      const formatted = formatMangaList(res.data);
      const md = formatted.map(mangaToMarkdown).join("\n\n---\n\n");
      const pg = paginationInfo(
        res.pagination.current_page,
        res.pagination.has_next_page,
        res.pagination.last_visible_page,
        res.pagination.items.total,
      );

      return {
        content: [
          { type: "text", text: truncateResponse(`# Top Manga\n\n${md}${pg}`) },
        ],
        structuredContent: { results: formatted, pagination: res.pagination },
      };
    },
  );

  // ─── 6. Get Weekly Anime Schedule ─────────────────────────────────────

  server.registerTool(
    "anime_schedule",
    {
      title: "Get Weekly Anime Schedule",
      description: `Get the weekly broadcast schedule of currently airing anime.

Args:
  - filter (string): Day of week — monday, tuesday, wednesday, thursday, friday, saturday, sunday, other, unknown
  - kids (boolean): Include kids shows (default false)
  - sfw (boolean): Safe for work filter (default true)
  - page / limit (number): Pagination

Returns:
  Anime schedule grouped by or filtered to a specific day.`,
      inputSchema: z.object({
        filter: z
          .enum([
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
            "other",
            "unknown",
          ])
          .optional()
          .describe("Filter by day of week"),
        kids: z.boolean().optional().default(false),
        sfw: z.boolean().optional().default(true),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(25).default(15),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      const res = await jikanGet<JikanListResponse<Anime>>("/schedules", {
        filter: params.filter,
        kids: params.kids ? "true" : "false",
        sfw: params.sfw ? "true" : undefined,
        page: params.page,
        limit: params.limit,
      });

      const formatted = formatAnimeList(res.data);
      if (!formatted.length)
        return {
          content: [{ type: "text", text: "No scheduled anime found." }],
        };

      const dayLabel = params.filter
        ? params.filter.charAt(0).toUpperCase() + params.filter.slice(1)
        : "All Days";

      const lines = formatted.map((a) => {
        const genres = a.genres?.join(", ") ?? "–";
        return `- **${a.title}** | Score: ${a.score ?? "N/A"} | ${genres}\n  ${a.url}`;
      });

      const pg = paginationInfo(
        res.pagination.current_page,
        res.pagination.has_next_page,
        res.pagination.last_visible_page,
        res.pagination.items.total,
      );

      return {
        content: [
          {
            type: "text",
            text: truncateResponse(
              `# Anime Schedule — ${dayLabel}\n\n${lines.join("\n")}${pg}`,
            ),
          },
        ],
        structuredContent: {
          results: formatted,
          day: params.filter ?? "all",
          pagination: res.pagination,
        },
      };
    },
  );

  // ─── 7. Random Anime ──────────────────────────────────────────────────

  server.registerTool(
    "anime_random",
    {
      title: "Get Random Anime",
      description: `Get a completely random anime from MyAnimeList — great for discovery and recommendations.

Returns:
  A single random anime with full details.`,
      inputSchema: z.object({
        sfw: z
          .boolean()
          .optional()
          .default(true)
          .describe("Only return safe-for-work anime"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ sfw }) => {
      interface RandomAnimeResponse {
        data: Anime;
      }
      const res = await jikanGet<RandomAnimeResponse>(
        "/random/anime",
        sfw ? { sfw: "true" } : undefined,
      );
      const formatted = require("../services/formatters.js").formatAnime(
        res.data,
      );
      // Re-import to avoid circular
      const { formatAnime: fa, animeToMarkdown: atm } =
        await import("../services/formatters.js");
      const fmted = fa(res.data);
      const md = atm(fmted);
      return {
        content: [{ type: "text", text: `# 🎲 Random Anime Pick\n\n${md}` }],
        structuredContent: fmted as unknown as Record<string, unknown>,
      };
    },
  );

  // ─── 8. Random Manga ──────────────────────────────────────────────────

  server.registerTool(
    "manga_random",
    {
      title: "Get Random Manga",
      description: `Get a completely random manga from MyAnimeList.

Returns:
  A single random manga with full details.`,
      inputSchema: z.object({
        sfw: z.boolean().optional().default(true),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ sfw }) => {
      interface RandomMangaResponse {
        data: Manga;
      }
      const res = await jikanGet<RandomMangaResponse>(
        "/random/manga",
        sfw ? { sfw: "true" } : undefined,
      );
      const { formatManga: fm, mangaToMarkdown: mtm } =
        await import("../services/formatters.js");
      const fmted = fm(res.data);
      const md = mtm(fmted);
      return {
        content: [{ type: "text", text: `# 🎲 Random Manga Pick\n\n${md}` }],
        structuredContent: fmted as unknown as Record<string, unknown>,
      };
    },
  );
}
