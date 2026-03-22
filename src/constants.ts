// Jikan API v4 base URL (no API key needed)
export const JIKAN_BASE_URL = "https://api.jikan.moe/v4";

// Max character limit for text responses
export const CHARACTER_LIMIT = 8000;

// Default request timeout in milliseconds
export const REQUEST_TIMEOUT_MS = 15000;

// Jikan rate limits: 3 req/sec, 60 req/min — add light delay between concurrent calls
export const RATE_LIMIT_DELAY_MS = 400;

// Default pagination sizes
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 25;

// Anime types
export const ANIME_TYPES = ["tv", "movie", "ova", "special", "ona", "music"] as const;
export type AnimeType = (typeof ANIME_TYPES)[number];

// Anime status
export const ANIME_STATUS = ["airing", "complete", "upcoming"] as const;
export type AnimeStatus = (typeof ANIME_STATUS)[number];

// Anime ratings
export const ANIME_RATINGS = ["g", "pg", "pg13", "r17", "r", "rx"] as const;
export type AnimeRating = (typeof ANIME_RATINGS)[number];

// Seasons
export const SEASONS = ["winter", "spring", "summer", "fall"] as const;
export type Season = (typeof SEASONS)[number];

// Manga types
export const MANGA_TYPES = ["manga", "novel", "lightnovel", "oneshot", "doujin", "manhwa", "manhua"] as const;
export type MangaType = (typeof MANGA_TYPES)[number];

// Manga status
export const MANGA_STATUS = ["publishing", "complete", "hiatus", "discontinued", "upcoming"] as const;
export type MangaStatus = (typeof MANGA_STATUS)[number];

// Top filter types
export const TOP_ANIME_FILTERS = ["airing", "upcoming", "bypopularity", "favorite"] as const;
export const TOP_MANGA_FILTERS = ["publishing", "upcoming", "bypopularity", "favorite"] as const;
