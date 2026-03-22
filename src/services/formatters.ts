import { CHARACTER_LIMIT } from "../constants.js";
import type {
  Anime,
  Manga,
  Character,
  Person,
  FormattedAnime,
  FormattedManga,
} from "../types.js";

// ─── Anime Formatters ──────────────────────────────────────────────────────

export function formatAnime(a: Anime): FormattedAnime {
  return {
    mal_id: a.mal_id,
    title: a.title,
    title_english: a.title_english,
    title_japanese: a.title_japanese,
    type: a.type,
    episodes: a.episodes,
    status: a.status,
    score: a.score,
    rank: a.rank,
    popularity: a.popularity,
    synopsis: a.synopsis ? truncate(a.synopsis, 600) : undefined,
    genres: a.genres?.map((g) => g.name),
    studios: a.studios?.map((s) => s.name),
    season: a.season,
    year: a.year,
    rating: a.rating,
    url: a.url,
    image_url: a.images?.jpg?.large_image_url ?? a.images?.jpg?.image_url,
  };
}

export function formatAnimeList(list: Anime[]): FormattedAnime[] {
  return list.map(formatAnime);
}

export function animeToMarkdown(a: FormattedAnime): string {
  const lines: string[] = [
    `## ${a.title}${a.title_english && a.title_english !== a.title ? ` (${a.title_english})` : ""}`,
    `- **MAL ID**: ${a.mal_id}`,
    `- **Type**: ${a.type ?? "Unknown"} | **Episodes**: ${a.episodes ?? "?"}`,
    `- **Status**: ${a.status ?? "Unknown"}`,
    `- **Score**: ${a.score ?? "N/A"} | **Rank**: #${a.rank ?? "?"}  | **Popularity**: #${a.popularity ?? "?"}`,
  ];
  if (a.season || a.year) lines.push(`- **Season**: ${a.season ?? ""} ${a.year ?? ""}`);
  if (a.rating) lines.push(`- **Rating**: ${a.rating}`);
  if (a.genres?.length) lines.push(`- **Genres**: ${a.genres.join(", ")}`);
  if (a.studios?.length) lines.push(`- **Studios**: ${a.studios.join(", ")}`);
  if (a.synopsis) lines.push(`\n**Synopsis**: ${a.synopsis}`);
  lines.push(`\n🔗 ${a.url}`);
  if (a.image_url) lines.push(`🖼  ${a.image_url}`);
  return lines.join("\n");
}

// ─── Manga Formatters ─────────────────────────────────────────────────────

export function formatManga(m: Manga): FormattedManga {
  return {
    mal_id: m.mal_id,
    title: m.title,
    title_english: m.title_english,
    type: m.type,
    chapters: m.chapters,
    volumes: m.volumes,
    status: m.status,
    score: m.score,
    rank: m.rank,
    synopsis: m.synopsis ? truncate(m.synopsis, 600) : undefined,
    genres: m.genres?.map((g) => g.name),
    authors: m.authors?.map((a) => a.name),
    url: m.url,
    image_url: m.images?.jpg?.large_image_url ?? m.images?.jpg?.image_url,
  };
}

export function formatMangaList(list: Manga[]): FormattedManga[] {
  return list.map(formatManga);
}

export function mangaToMarkdown(m: FormattedManga): string {
  const lines: string[] = [
    `## ${m.title}${m.title_english && m.title_english !== m.title ? ` (${m.title_english})` : ""}`,
    `- **MAL ID**: ${m.mal_id}`,
    `- **Type**: ${m.type ?? "Unknown"} | **Chapters**: ${m.chapters ?? "?"} | **Volumes**: ${m.volumes ?? "?"}`,
    `- **Status**: ${m.status ?? "Unknown"}`,
    `- **Score**: ${m.score ?? "N/A"} | **Rank**: #${m.rank ?? "?"}`,
  ];
  if (m.authors?.length) lines.push(`- **Authors**: ${m.authors.join(", ")}`);
  if (m.genres?.length) lines.push(`- **Genres**: ${m.genres.join(", ")}`);
  if (m.synopsis) lines.push(`\n**Synopsis**: ${m.synopsis}`);
  lines.push(`\n🔗 ${m.url}`);
  if (m.image_url) lines.push(`🖼  ${m.image_url}`);
  return lines.join("\n");
}

// ─── Character Formatter ──────────────────────────────────────────────────

export function characterToMarkdown(c: Character): string {
  const lines: string[] = [
    `## ${c.name}${c.name_kanji ? ` (${c.name_kanji})` : ""}`,
    `- **MAL ID**: ${c.mal_id}`,
    `- **Favorites**: ${c.favorites.toLocaleString()}`,
  ];
  if (c.nicknames?.length) lines.push(`- **Nicknames**: ${c.nicknames.join(", ")}`);
  if (c.anime?.length) {
    const roles = c.anime.slice(0, 5).map((a) => `${a.anime.title} (${a.role})`);
    lines.push(`- **Appears in (anime)**: ${roles.join(", ")}`);
  }
  if (c.voices?.length) {
    const va = c.voices
      .slice(0, 5)
      .map((v) => `${v.person.name} [${v.language}]`)
      .join(", ");
    lines.push(`- **Voice Actors**: ${va}`);
  }
  if (c.about) lines.push(`\n**About**: ${truncate(c.about, 500)}`);
  lines.push(`\n🔗 ${c.url}`);
  if (c.images?.jpg?.image_url) lines.push(`🖼  ${c.images.jpg.image_url}`);
  return lines.join("\n");
}

// ─── Person Formatter ─────────────────────────────────────────────────────

export function personToMarkdown(p: Person): string {
  const lines: string[] = [
    `## ${p.name}`,
    `- **MAL ID**: ${p.mal_id}`,
    `- **Favorites**: ${p.favorites.toLocaleString()}`,
  ];
  if (p.birthday) lines.push(`- **Birthday**: ${p.birthday}`);
  if (p.alternate_names?.length)
    lines.push(`- **Also known as**: ${p.alternate_names.join(", ")}`);
  if (p.voices?.length) {
    const roles = p.voices
      .slice(0, 5)
      .map((v) => `${v.character.name} in *${v.anime.title}* (${v.role})`);
    lines.push(`- **Voice Roles**: ${roles.join("; ")}`);
  }
  if (p.anime?.length) {
    const positions = p.anime
      .slice(0, 5)
      .map((a) => `${a.anime.title} (${a.position})`);
    lines.push(`- **Anime Staff**: ${positions.join("; ")}`);
  }
  if (p.about) lines.push(`\n**About**: ${truncate(p.about, 500)}`);
  lines.push(`\n🔗 ${p.url}`);
  if (p.images?.jpg?.image_url) lines.push(`🖼  ${p.images.jpg.image_url}`);
  return lines.join("\n");
}

// ─── Pagination Info ──────────────────────────────────────────────────────

export function paginationInfo(
  currentPage: number,
  hasNextPage: boolean,
  lastPage: number,
  total: number
): string {
  return `\n---\n📄 Page ${currentPage} of ${lastPage} | Total: ${total} | ${hasNextPage ? "More pages available" : "No more pages"}`;
}

// ─── Utility ──────────────────────────────────────────────────────────────

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

export function truncateResponse(text: string): string {
  return truncate(text, CHARACTER_LIMIT);
}
