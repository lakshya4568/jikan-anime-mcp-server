import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jikanGet } from "../services/jikanClient.js";
import {
  formatAnime,
  formatAnimeList,
  animeToMarkdown,
  paginationInfo,
  truncateResponse,
} from "../services/formatters.js";
import type {
  Anime,
  AnimeCharacter,
  AnimeEpisode,
  AnimeReview,
  AnimeRecommendation,
  JikanListResponse,
  JikanSingleResponse,
} from "../types.js";
import {
  ANIME_TYPES,
  ANIME_STATUS,
  ANIME_RATINGS,
  DEFAULT_PAGE_SIZE,
} from "../constants.js";

export function registerAnimeTools(server: McpServer): void {
  // ─── 1. Search Anime ────────────────────────────────────────────────────

  server.registerTool(
    "anime_search",
    {
      title: "Search Anime",
      description: `Search for anime on MyAnimeList using the Jikan API.

Supports filtering by type, status, rating, score, genres, and more. Returns paginated results.

Args:
  - q (string): Search query (title keyword)
  - type (string): Anime format — tv, movie, ova, special, ona, music
  - status (string): Airing status — airing, complete, upcoming
  - rating (string): Age rating — g, pg, pg13, r17, r, rx
  - min_score / max_score (number): Filter by score range (0–10)
  - genres (string): Comma-separated genre IDs (e.g. "1,2" for Action,Adventure)
  - order_by (string): Sort field — score, popularity, rank, members, episodes, start_date
  - sort (string): asc or desc
  - page / limit (number): Pagination (default page=1, limit=10)

Returns:
  List of matching anime with titles, scores, genres, synopsis, URLs.

Examples:
  - "Find top shonen anime" → q="shonen", genres="27"
  - "Search for action movies" → q="action", type="movie"`,
      inputSchema: z.object({
        q: z.string().min(1).max(200).optional().describe("Search query"),
        type: z.enum(ANIME_TYPES).optional().describe("Anime type"),
        status: z.enum(ANIME_STATUS).optional().describe("Airing status"),
        rating: z.enum(ANIME_RATINGS).optional().describe("Age rating"),
        min_score: z.number().min(0).max(10).optional(),
        max_score: z.number().min(0).max(10).optional(),
        genres: z.string().optional().describe("Comma-separated genre IDs"),
        order_by: z
          .enum([
            "score",
            "popularity",
            "rank",
            "members",
            "episodes",
            "start_date",
            "title",
          ])
          .optional(),
        sort: z.enum(["asc", "desc"]).optional().default("desc"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(25).default(DEFAULT_PAGE_SIZE),
        sfw: z
          .boolean()
          .optional()
          .default(true)
          .describe("Filter adult content"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const res = await jikanGet<JikanListResponse<Anime>>("/anime", {
        q: params.q,
        type: params.type,
        status: params.status,
        rating: params.rating,
        min_score: params.min_score,
        max_score: params.max_score,
        genres: params.genres,
        order_by: params.order_by,
        sort: params.sort,
        page: params.page,
        limit: params.limit,
        sfw: params.sfw ? "true" : undefined,
      });

      const formatted = formatAnimeList(res.data);
      if (!formatted.length) {
        return {
          content: [
            { type: "text", text: "No anime found matching your search." },
          ],
        };
      }

      const md = formatted.map(animeToMarkdown).join("\n\n---\n\n");
      const pagination = paginationInfo(
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
              `# Anime Search Results\n\n${md}${pagination}`,
            ),
          },
        ],
        structuredContent: {
          results: formatted,
          pagination: res.pagination,
        },
      };
    },
  );

  // ─── 2. Get Anime by ID ─────────────────────────────────────────────────

  server.registerTool(
    "anime_get_by_id",
    {
      title: "Get Anime by MAL ID",
      description: `Retrieve full details of an anime by its MyAnimeList ID.

Returns comprehensive information: titles, synopsis, score, ranking, genres, studios, episodes, broadcast schedule, trailer, and more.

Args:
  - mal_id (number): The MyAnimeList anime ID

Returns:
  Full anime detail object.

Examples:
  - Get Naruto: mal_id=20
  - Get Attack on Titan: mal_id=16498
  - Get One Piece: mal_id=21`,
      inputSchema: z.object({
        mal_id: z.number().int().min(1).describe("MyAnimeList anime ID"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ mal_id }) => {
      const res = await jikanGet<JikanSingleResponse<Anime>>(
        `/anime/${mal_id}`,
      );
      const formatted = formatAnime(res.data);
      const raw = res.data;

      // Add extra details not in formatted
      const extras: string[] = [];
      if (raw.trailer?.url) extras.push(`🎬 **Trailer**: ${raw.trailer.url}`);
      if (raw.broadcast?.string)
        extras.push(`📡 **Broadcast**: ${raw.broadcast.string}`);
      if (raw.source) extras.push(`📖 **Source**: ${raw.source}`);
      if (raw.duration) extras.push(`⏱ **Duration**: ${raw.duration}`);
      if (raw.themes?.length)
        extras.push(
          `🎭 **Themes**: ${raw.themes.map((t) => t.name).join(", ")}`,
        );
      if (raw.demographics?.length)
        extras.push(
          `👥 **Demographics**: ${raw.demographics.map((d) => d.name).join(", ")}`,
        );
      if (raw.members)
        extras.push(`👤 **Members**: ${raw.members.toLocaleString()}`);
      if (raw.favorites)
        extras.push(`❤️ **Favorites**: ${raw.favorites.toLocaleString()}`);

      const md = `${animeToMarkdown(formatted)}\n\n${extras.join("\n")}`;

      return {
        content: [{ type: "text", text: truncateResponse(md) }],
        structuredContent: formatted as unknown as Record<string, unknown>,
      };
    },
  );

  // ─── 3. Get Anime Characters ─────────────────────────────────────────────

  server.registerTool(
    "anime_get_characters",
    {
      title: "Get Anime Characters",
      description: `Get the characters of an anime by its MyAnimeList ID, with their roles and voice actors.

Args:
  - mal_id (number): MyAnimeList anime ID

Returns:
  List of characters with role (Main/Supporting), voice actors, and favorites count.`,
      inputSchema: z.object({
        mal_id: z.number().int().min(1).describe("MyAnimeList anime ID"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ mal_id }) => {
      const res = await jikanGet<{ data: AnimeCharacter[] }>(
        `/anime/${mal_id}/characters`,
      );
      const chars = res.data;
      if (!chars.length) {
        return { content: [{ type: "text", text: "No characters found." }] };
      }

      const sorted = [...chars].sort((a, b) => b.favorites - a.favorites);
      const lines = sorted.slice(0, 30).map((c) => {
        const va = c.voice_actors
          ?.filter((v) => v.language === "Japanese")
          .map((v) => v.person.name)
          .join(", ");
        return `- **${c.character.name}** (${c.role})${va ? ` — VA: ${va}` : ""} | ❤️ ${c.favorites}`;
      });

      return {
        content: [
          {
            type: "text",
            text: `# Characters for Anime #${mal_id}\n\n${lines.join("\n")}`,
          },
        ],
        structuredContent: { mal_id, characters: sorted.slice(0, 30) },
      };
    },
  );

  // ─── 4. Get Anime Episodes ────────────────────────────────────────────────

  server.registerTool(
    "anime_get_episodes",
    {
      title: "Get Anime Episodes",
      description: `Get the episode list of an anime by its MyAnimeList ID.

Args:
  - mal_id (number): MyAnimeList anime ID
  - page (number): Page of episodes (100 per page)

Returns:
  Paginated list of episodes with title, air date, score, and filler/recap flags.`,
      inputSchema: z.object({
        mal_id: z.number().int().min(1).describe("MyAnimeList anime ID"),
        page: z.number().int().min(1).default(1),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ mal_id, page }) => {
      const res = await jikanGet<JikanListResponse<AnimeEpisode>>(
        `/anime/${mal_id}/episodes`,
        { page },
      );
      const eps = res.data;
      if (!eps.length) {
        return { content: [{ type: "text", text: "No episodes found." }] };
      }

      const lines = eps.map((e) => {
        const flags = [e.filler ? "🔄 Filler" : "", e.recap ? "📝 Recap" : ""]
          .filter(Boolean)
          .join(" ");
        return `- **Ep ${e.mal_id}**: ${e.title}${e.aired ? ` (${e.aired.slice(0, 10)})` : ""}${e.score ? ` ⭐${e.score}` : ""}${flags ? ` ${flags}` : ""}`;
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
              `# Episodes for Anime #${mal_id}\n\n${lines.join("\n")}${pg}`,
            ),
          },
        ],
        structuredContent: {
          mal_id,
          episodes: eps,
          pagination: res.pagination,
        },
      };
    },
  );

  // ─── 5. Get Anime Reviews ─────────────────────────────────────────────────

  server.registerTool(
    "anime_get_reviews",
    {
      title: "Get Anime Reviews",
      description: `Get user reviews for an anime by its MyAnimeList ID.

Args:
  - mal_id (number): MyAnimeList anime ID
  - page (number): Page number

Returns:
  List of reviews with scores, tags, spoiler flags, and excerpts.`,
      inputSchema: z.object({
        mal_id: z.number().int().min(1),
        page: z.number().int().min(1).default(1),
        preliminary: z.boolean().optional().default(false),
        spoilers: z.boolean().optional().default(false),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ mal_id, page, preliminary, spoilers }) => {
      const res = await jikanGet<JikanListResponse<AnimeReview>>(
        `/anime/${mal_id}/reviews`,
        {
          page,
          preliminary: preliminary ? "true" : undefined,
          spoilers: spoilers ? "true" : undefined,
        },
      );

      if (!res.data.length)
        return { content: [{ type: "text", text: "No reviews found." }] };

      const lines = res.data.slice(0, 5).map((r) => {
        const spoilerFlag = r.is_spoiler ? "⚠️ SPOILERS" : "";
        const epWatched = r.episodes_watched
          ? `(${r.episodes_watched} eps watched)`
          : "";
        const excerpt =
          r.review.slice(0, 400).replace(/\n+/g, " ") +
          (r.review.length > 400 ? "..." : "");
        return `### @${r.user.username} — Score: ${r.score}/10 ${spoilerFlag} ${epWatched}\n*${r.tags.join(", ")}*\n> ${excerpt}\n🔗 ${r.url}`;
      });

      return {
        content: [
          {
            type: "text",
            text: truncateResponse(
              `# Reviews for Anime #${mal_id}\n\n${lines.join("\n\n---\n\n")}`,
            ),
          },
        ],
        structuredContent: { mal_id, reviews: res.data.slice(0, 5) },
      };
    },
  );

  // ─── 6. Get Anime Recommendations ────────────────────────────────────────

  server.registerTool(
    "anime_get_recommendations",
    {
      title: "Get Anime Recommendations",
      description: `Get community recommendations for an anime (i.e., "if you liked this, watch these").

Args:
  - mal_id (number): MyAnimeList anime ID

Returns:
  List of recommended anime with vote counts.`,
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
      const res = await jikanGet<{ data: AnimeRecommendation[] }>(
        `/anime/${mal_id}/recommendations`,
      );
      if (!res.data.length)
        return {
          content: [{ type: "text", text: "No recommendations found." }],
        };

      const lines = res.data
        .slice(0, 15)
        .map(
          (r) => `- **${r.entry.title}** (${r.votes} votes) — ${r.entry.url}`,
        );

      return {
        content: [
          {
            type: "text",
            text: `# Recommendations for Anime #${mal_id}\n\n${lines.join("\n")}`,
          },
        ],
        structuredContent: { mal_id, recommendations: res.data.slice(0, 15) },
      };
    },
  );
}
