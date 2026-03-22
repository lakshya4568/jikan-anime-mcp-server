// ─── Shared / Pagination ───────────────────────────────────────────────────

export interface PaginationData {
  last_visible_page: number;
  has_next_page: boolean;
  current_page: number;
  items: {
    count: number;
    total: number;
    per_page: number;
  };
}

export interface JikanListResponse<T> {
  pagination: PaginationData;
  data: T[];
}

export interface JikanSingleResponse<T> {
  data: T;
}

// ─── Image ─────────────────────────────────────────────────────────────────

export interface JikanImage {
  jpg?: { image_url?: string; small_image_url?: string; large_image_url?: string };
  webp?: { image_url?: string; small_image_url?: string; large_image_url?: string };
}

// ─── Anime ─────────────────────────────────────────────────────────────────

export interface AnimeTitle {
  type: string;
  title: string;
}

export interface Genre {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface Studio {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface Anime {
  mal_id: number;
  url: string;
  images: JikanImage;
  trailer?: { youtube_id?: string; url?: string; embed_url?: string };
  approved: boolean;
  titles: AnimeTitle[];
  title: string;
  title_english?: string;
  title_japanese?: string;
  type?: string;
  source?: string;
  episodes?: number;
  status?: string;
  airing: boolean;
  aired?: { from?: string; to?: string; string?: string };
  duration?: string;
  rating?: string;
  score?: number;
  scored_by?: number;
  rank?: number;
  popularity?: number;
  members?: number;
  favorites?: number;
  synopsis?: string;
  background?: string;
  season?: string;
  year?: number;
  broadcast?: { day?: string; time?: string; timezone?: string; string?: string };
  producers?: Studio[];
  licensors?: Studio[];
  studios?: Studio[];
  genres?: Genre[];
  explicit_genres?: Genre[];
  themes?: Genre[];
  demographics?: Genre[];
}

export interface AnimeCharacter {
  character: {
    mal_id: number;
    url: string;
    images: JikanImage;
    name: string;
  };
  role: string;
  favorites: number;
  voice_actors?: Array<{
    person: { mal_id: number; url: string; images: JikanImage; name: string };
    language: string;
  }>;
}

export interface AnimeEpisode {
  mal_id: number;
  url?: string;
  title: string;
  title_japanese?: string;
  title_romanji?: string;
  aired?: string;
  score?: number;
  filler: boolean;
  recap: boolean;
  forum_url?: string;
}

export interface AnimeReview {
  mal_id: number;
  url: string;
  type: string;
  reactions: Record<string, number>;
  date: string;
  review: string;
  score: number;
  tags: string[];
  is_spoiler: boolean;
  is_preliminary: boolean;
  episodes_watched?: number;
  user: { url: string; username: string; images: JikanImage };
}

export interface AnimeRecommendation {
  entry: { mal_id: number; url: string; images: JikanImage; title: string };
  url: string;
  votes: number;
}

// ─── Manga ─────────────────────────────────────────────────────────────────

export interface Manga {
  mal_id: number;
  url: string;
  images: JikanImage;
  approved: boolean;
  titles: AnimeTitle[];
  title: string;
  title_english?: string;
  title_japanese?: string;
  type?: string;
  chapters?: number;
  volumes?: number;
  status?: string;
  publishing: boolean;
  published?: { from?: string; to?: string; string?: string };
  score?: number;
  scored?: number;
  scored_by?: number;
  rank?: number;
  popularity?: number;
  members?: number;
  favorites?: number;
  synopsis?: string;
  background?: string;
  authors?: Array<{ mal_id: number; type: string; name: string; url: string }>;
  serializations?: Array<{ mal_id: number; type: string; name: string; url: string }>;
  genres?: Genre[];
  explicit_genres?: Genre[];
  themes?: Genre[];
  demographics?: Genre[];
}

// ─── Character ─────────────────────────────────────────────────────────────

export interface Character {
  mal_id: number;
  url: string;
  images: JikanImage;
  name: string;
  name_kanji?: string;
  nicknames: string[];
  favorites: number;
  about?: string;
  anime?: Array<{ role: string; anime: { mal_id: number; url: string; images: JikanImage; title: string } }>;
  manga?: Array<{ role: string; manga: { mal_id: number; url: string; images: JikanImage; title: string } }>;
  voices?: Array<{ language: string; person: { mal_id: number; url: string; images: JikanImage; name: string } }>;
}

// ─── Person ────────────────────────────────────────────────────────────────

export interface Person {
  mal_id: number;
  url: string;
  images: JikanImage;
  name: string;
  given_name?: string;
  family_name?: string;
  alternate_names: string[];
  birthday?: string;
  favorites: number;
  about?: string;
  anime?: Array<{ position: string; anime: { mal_id: number; url: string; images: JikanImage; title: string } }>;
  manga?: Array<{ position: string; manga: { mal_id: number; url: string; images: JikanImage; title: string } }>;
  voices?: Array<{ role: string; anime: { mal_id: number; url: string; images: JikanImage; title: string }; character: { mal_id: number; url: string; images: JikanImage; name: string } }>;
}

// ─── Schedule ──────────────────────────────────────────────────────────────

export interface ScheduleDay {
  monday?: Anime[];
  tuesday?: Anime[];
  wednesday?: Anime[];
  thursday?: Anime[];
  friday?: Anime[];
  saturday?: Anime[];
  sunday?: Anime[];
}

// ─── Formatted tool outputs ─────────────────────────────────────────────────

export interface FormattedAnime {
  mal_id: number;
  title: string;
  title_english?: string;
  title_japanese?: string;
  type?: string;
  episodes?: number;
  status?: string;
  score?: number;
  rank?: number;
  popularity?: number;
  synopsis?: string;
  genres?: string[];
  studios?: string[];
  season?: string;
  year?: number;
  rating?: string;
  url: string;
  image_url?: string;
}

export interface FormattedManga {
  mal_id: number;
  title: string;
  title_english?: string;
  type?: string;
  chapters?: number;
  volumes?: number;
  status?: string;
  score?: number;
  rank?: number;
  synopsis?: string;
  genres?: string[];
  authors?: string[];
  url: string;
  image_url?: string;
}
