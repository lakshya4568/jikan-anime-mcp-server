import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jikanGet } from "../services/jikanClient.js";
import {
  formatManga,
  formatMangaList,
  mangaToMarkdown,
  paginationInfo,
  truncateResponse,
} from "../services/formatters.js";
import type {
  Manga,
  JikanListResponse,
  JikanSingleResponse,
} from "../types.js";
import { MANGA_TYPES, MANGA_STATUS, DEFAULT_PAGE_SIZE } from "../constants.js";

export function registerMangaTools(server: McpServer): void {
  // ─── 1. Search Manga ────────────────────────────────────────────────────

  server.registerTool(
    "manga_search",
    {
      title: "Search Manga",
      description: `Search for manga on MyAnimeList using the Jikan API.

Args:
  - q (string): Search query
  - type (string): manga, novel, lightnovel, oneshot, doujin, manhwa, manhua
  - status (string): publishing, complete, hiatus, discontinued, upcoming
  - min_score / max_score (number): Score range (0–10)
  - genres (string): Comma-separated genre IDs
  - order_by (string): score, rank, popularity, members, start_date
  - sort (string): asc or desc
  - page / limit (number): Pagination

Returns:
  Paginated list of manga with titles, scores, genres, synopsis, URLs.`,
      inputSchema: z.object({
        q: z.string().min(1).max(200).optional(),
        type: z.enum(MANGA_TYPES).optional(),
        status: z.enum(MANGA_STATUS).optional(),
        min_score: z.number().min(0).max(10).optional(),
        max_score: z.number().min(0).max(10).optional(),
        genres: z.string().optional().describe("Comma-separated genre IDs"),
        order_by: z
          .enum([
            "score",
            "rank",
            "popularity",
            "members",
            "chapters",
            "start_date",
            "title",
          ])
          .optional(),
        sort: z.enum(["asc", "desc"]).optional().default("desc"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(25).default(DEFAULT_PAGE_SIZE),
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
      const res = await jikanGet<JikanListResponse<Manga>>("/manga", {
        q: params.q,
        type: params.type,
        status: params.status,
        min_score: params.min_score,
        max_score: params.max_score,
        genres: params.genres,
        order_by: params.order_by,
        sort: params.sort,
        page: params.page,
        limit: params.limit,
        sfw: params.sfw ? "true" : undefined,
      });

      const formatted = formatMangaList(res.data);
      if (!formatted.length)
        return { content: [{ type: "text", text: "No manga found." }] };

      const md = formatted.map(mangaToMarkdown).join("\n\n---\n\n");
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
            text: truncateResponse(`# Manga Search Results\n\n${md}${pg}`),
          },
        ],
        structuredContent: { results: formatted, pagination: res.pagination },
      };
    },
  );

  // ─── 2. Get Manga by ID ─────────────────────────────────────────────────

  server.registerTool(
    "manga_get_by_id",
    {
      title: "Get Manga by MAL ID",
      description: `Retrieve full details of a manga by its MyAnimeList ID.

Args:
  - mal_id (number): The MyAnimeList manga ID

Returns:
  Full manga details: title, score, rank, synopsis, authors, genres, chapters/volumes.

Examples:
  - One Piece manga: mal_id=13
  - Berserk: mal_id=2
  - Fullmetal Alchemist: mal_id=25`,
      inputSchema: z.object({
        mal_id: z.number().int().min(1).describe("MyAnimeList manga ID"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ mal_id }) => {
      const res = await jikanGet<JikanSingleResponse<Manga>>(
        `/manga/${mal_id}`,
      );
      const formatted = formatManga(res.data);
      const raw = res.data;

      const extras: string[] = [];
      if (raw.members)
        extras.push(`👤 **Members**: ${raw.members.toLocaleString()}`);
      if (raw.favorites)
        extras.push(`❤️ **Favorites**: ${raw.favorites.toLocaleString()}`);
      if (raw.serializations?.length)
        extras.push(
          `📰 **Serialized in**: ${raw.serializations.map((s) => s.name).join(", ")}`,
        );
      if (raw.themes?.length)
        extras.push(
          `🎭 **Themes**: ${raw.themes.map((t) => t.name).join(", ")}`,
        );
      if (raw.demographics?.length)
        extras.push(
          `👥 **Demographics**: ${raw.demographics.map((d) => d.name).join(", ")}`,
        );

      const md = `${mangaToMarkdown(formatted)}\n\n${extras.join("\n")}`;
      return {
        content: [{ type: "text", text: truncateResponse(md) }],
        structuredContent: formatted as unknown as Record<string, unknown>,
      };
    },
  );
}
