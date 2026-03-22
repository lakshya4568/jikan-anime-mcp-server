# Jikan Anime MCP Server

A TypeScript MCP (Model Context Protocol) server for the Jikan API (unofficial MyAnimeList REST API).

No API key is required.

## What This Server Does

- Exposes 26 read-only MCP tools for anime, manga, character/person lookup, discovery, and recommendation workflows.
- Supports both transports:
  - stdio (default) for MCP clients such as Claude Desktop
  - Streamable HTTP via `POST /mcp`
- Provides a simple health endpoint for HTTP mode: `GET /health`

## What This Server Does Not Do

- Does not write to MyAnimeList or mutate external state
- Does not require OAuth or API keys
- Does not bypass upstream Jikan availability or rate limits
- Does not include persistent local database storage

## Tool Inventory (26)

### Anime

- `anime_search`
- `anime_get_by_id`
- `anime_get_characters`
- `anime_get_episodes`
- `anime_get_reviews`
- `anime_get_recommendations`

### Character and People

- `characters_search`
- `characters_get_by_id`
- `people_search`
- `people_get_by_id`

### Discovery

- `anime_season_now`
- `anime_season_upcoming`
- `anime_season_archive`
- `anime_top`
- `anime_schedule`
- `anime_random`

### Manga

- `manga_top`
- `manga_random`
- `manga_search`
- `manga_get_by_id`

### Custom

- `genres_list`
- `anime_compare`
- `anime_recommend_by_preferences`
- `anime_get_streaming`
- `anime_get_stats`
- `anime_get_news`

## Prerequisites

- Node.js 18+
- npm

## Installation

```bash
git clone https://github.com/YOUR_USERNAME/jikan-anime-mcp-server.git
cd jikan-anime-mcp-server
npm install
npm run build
```

## Run

### stdio mode (default)

```bash
npm start
```

### HTTP mode

```bash
TRANSPORT=http PORT=3000 npm start
```

MCP endpoint: `http://localhost:3000/mcp`

## Claude Desktop Example

Add this entry to your Claude Desktop MCP configuration:

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

## NPX Usage (Recommended)

After publishing to npm, users can run this MCP server directly via `npx` (no manual install):

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

## Publishing to npm

```bash
npm run build
npm login
npm publish --access public
```

## Development

```bash
npm run dev
npm run lint
npm run build
```

## Project Structure

```text
src/
  index.ts
  constants.ts
  types.ts
  services/
    formatters.ts
    jikanClient.ts
  tools/
    animeTools.ts
    characterTools.ts
    customTools.ts
    discoveryTools.ts
    mangaTools.ts
```

## License

MIT (see `LICENSE`)
