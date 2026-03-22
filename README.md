# jikan-anime-mcp-server

Repository: https://github.com/lakshya4568/jikan-anime-mcp-server

TypeScript MCP (Model Context Protocol) server for the Jikan API (unofficial MyAnimeList REST API).

This server is read-only and does not require an API key.

## Quick Setup

### 1) Clone and build

```bash
git clone https://github.com/lakshya4568/jikan-anime-mcp-server.git
cd jikan-anime-mcp-server
npm install
npm run build
```

### 2) Add to your MCP JSON config file

Use the absolute path to `dist/index.js` from your machine.

```json
{
  "mcpServers": {
    "jikan-anime": {
      "command": "node",
      "args": ["/absolute/path/to/jikan-anime-mcp-server/dist/index.js"]
    }
  }
}
```

### 2b) Connect through npx (no local clone path needed)
# RECOMMENDED for ease of use and integration in MCP clients without local file dependencies.

If you prefer running from npm directly in Claude Code, VS Code, or other MCP clients, use:

```json
{
  "mcpServers": {
    "jikan-anime": {
      "command": "npx",
      "args": ["-y", "jikan-anime-mcp-server"]
    }
  }
}
```

The `-y` flag auto-confirms npm prompts so the MCP client can start the server without interaction.

### 3) Use in Claude Code, VS Code, or any MCP client

- Claude Code: paste the block into Claude Code MCP JSON config.
- VS Code: paste the block into your MCP/agent client JSON config used by your extension.
- Any MCP client agent: paste the same block into that client MCP servers config.

If your client supports environment variables in MCP config, you can also set:

- `TRANSPORT=stdio` (default)

## What This Server Does

- Exposes 26 MCP tools for anime, manga, people, discovery, and recommendation workflows.
- Returns structured, read-only data from Jikan endpoints.
- Supports MCP stdio transport for agent integrations.

## Tool Details

### Anime Tools

- `anime_search`: Search anime with filters such as type, status, rating, score, genres, and sorting.
- `anime_get_by_id`: Fetch complete details for a specific anime by MAL ID.
- `anime_get_characters`: Fetch anime cast with character and voice actor information.
- `anime_get_episodes`: Fetch paginated episode list with episode metadata.
- `anime_get_reviews`: Fetch community reviews for an anime.
- `anime_get_recommendations`: Fetch recommendation entries related to an anime.

### Character and People Tools

- `characters_search`: Search characters by name.
- `characters_get_by_id`: Fetch full character profile by MAL ID.
- `people_search`: Search people such as voice actors and staff.
- `people_get_by_id`: Fetch full person profile and related credits by MAL ID.

### Discovery Tools

- `anime_season_now`: List currently airing seasonal anime.
- `anime_season_upcoming`: List upcoming season anime.
- `anime_season_archive`: List anime for a specific year and season.
- `anime_top`: List top anime with optional filters.
- `anime_schedule`: List scheduled anime for a selected day.
- `anime_random`: Fetch one random anime entry.
- `manga_top`: List top manga with optional filters.
- `manga_random`: Fetch one random manga entry.

### Manga Tools

- `manga_search`: Search manga with filters such as type, status, score, and genres.
- `manga_get_by_id`: Fetch complete details for a specific manga by MAL ID.

### Custom Utility Tools

- `genres_list`: Return genre names and IDs for anime and manga filters.
- `anime_compare`: Compare two anime side-by-side by MAL IDs.
- `anime_recommend_by_preferences`: Return recommendations from preference inputs (genre, score, type, era).
- `anime_get_streaming`: Return available streaming platform links for an anime.
- `anime_get_stats`: Return anime statistics such as score and watching distribution.
- `anime_get_news`: Return recent news items related to an anime.

## What This Server Does Not Do

- Does not write to MyAnimeList or perform account actions.
- Does not bypass Jikan availability constraints or upstream limits.
- Does not require OAuth or user login.

## License

MIT
