import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jikanGet } from "../services/jikanClient.js";
import {
  characterToMarkdown,
  personToMarkdown,
  truncateResponse,
  paginationInfo,
} from "../services/formatters.js";
import type {
  Character,
  Person,
  JikanListResponse,
  JikanSingleResponse,
} from "../types.js";

export function registerCharacterAndPersonTools(server: McpServer): void {
  // ─── 1. Search Characters ───────────────────────────────────────────────

  server.registerTool(
    "characters_search",
    {
      title: "Search Characters",
      description: `Search for anime/manga characters by name.

Args:
  - q (string): Character name query
  - page / limit (number): Pagination
  - order_by (string): favorites or mal_id
  - sort (string): asc or desc

Returns:
  List of characters with names, images, favorites, and anime/manga appearances.`,
      inputSchema: z.object({
        q: z.string().min(1).max(200).describe("Character name query"),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(25).default(10),
        order_by: z.enum(["favorites", "mal_id"]).optional(),
        sort: z.enum(["asc", "desc"]).optional().default("desc"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const res = await jikanGet<JikanListResponse<Character>>("/characters", {
        q: params.q,
        page: params.page,
        limit: params.limit,
        order_by: params.order_by,
        sort: params.sort,
      });

      if (!res.data.length)
        return { content: [{ type: "text", text: "No characters found." }] };

      const md = res.data.map(characterToMarkdown).join("\n\n---\n\n");
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
              `# Character Search: "${params.q}"\n\n${md}${pg}`,
            ),
          },
        ],
        structuredContent: { results: res.data, pagination: res.pagination },
      };
    },
  );

  // ─── 2. Get Character by ID ────────────────────────────────────────────

  server.registerTool(
    "characters_get_by_id",
    {
      title: "Get Character by MAL ID",
      description: `Retrieve full details of an anime/manga character by MAL ID.

Args:
  - mal_id (number): MyAnimeList character ID

Returns:
  Character details: name, about, anime/manga appearances, voice actors, images.

Examples:
  - Naruto Uzumaki: mal_id=17
  - Monkey D. Luffy: mal_id=40
  - Goku: mal_id=246`,
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
      const res = await jikanGet<JikanSingleResponse<Character>>(
        `/characters/${mal_id}/full`,
      );
      const md = characterToMarkdown(res.data);
      return {
        content: [{ type: "text", text: truncateResponse(md) }],
        structuredContent: res.data as unknown as Record<string, unknown>,
      };
    },
  );

  // ─── 3. Search People ──────────────────────────────────────────────────

  server.registerTool(
    "people_search",
    {
      title: "Search People (Voice Actors / Staff)",
      description: `Search for anime industry people — voice actors, directors, composers, etc.

Args:
  - q (string): Name query
  - page / limit (number): Pagination
  - order_by (string): favorites, mal_id, birthday
  - sort (string): asc or desc

Returns:
  List of people with names, favorites, birthday, and anime/voice role credits.`,
      inputSchema: z.object({
        q: z.string().min(1).max(200),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(25).default(10),
        order_by: z.enum(["favorites", "mal_id", "birthday"]).optional(),
        sort: z.enum(["asc", "desc"]).optional().default("desc"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      const res = await jikanGet<JikanListResponse<Person>>("/people", {
        q: params.q,
        page: params.page,
        limit: params.limit,
        order_by: params.order_by,
        sort: params.sort,
      });

      if (!res.data.length)
        return { content: [{ type: "text", text: "No people found." }] };

      const md = res.data.map(personToMarkdown).join("\n\n---\n\n");
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
              `# People Search: "${params.q}"\n\n${md}${pg}`,
            ),
          },
        ],
        structuredContent: { results: res.data, pagination: res.pagination },
      };
    },
  );

  // ─── 4. Get Person by ID ──────────────────────────────────────────────

  server.registerTool(
    "people_get_by_id",
    {
      title: "Get Person by MAL ID",
      description: `Retrieve full details of an anime industry person by MAL ID.

Args:
  - mal_id (number): MyAnimeList person ID

Returns:
  Full person profile: voice roles, staff credits, biography, birthday.

Examples:
  - Mamoru Miyano (VA): mal_id=185
  - Hayao Miyazaki (Director): mal_id=1870`,
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
      const res = await jikanGet<JikanSingleResponse<Person>>(
        `/people/${mal_id}/full`,
      );
      const md = personToMarkdown(res.data);
      return {
        content: [{ type: "text", text: truncateResponse(md) }],
        structuredContent: res.data as unknown as Record<string, unknown>,
      };
    },
  );
}
