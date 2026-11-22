export interface MovieQuote {
  id: string;
  text: string;
}

export interface MovieEntry {
  id: string;
  title: string;
  posterData?: string;
  /** One free-form body. No split between "why it stays" and "notes". */
  notes: string;
  /** Lines worth keeping. */
  quotes: MovieQuote[];
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export interface MoviesHeader {
  title: string;
  description: string;
}

export interface MoviesData {
  header: MoviesHeader;
  movies: MovieEntry[];
}

export const defaultMoviesHeader: MoviesHeader = {
  title: "The Films That Stay",
  description:
    "I don't watch movies to pass time. I watch them to feel something real — to be unsettled, reshaped, and reminded that other lives, other truths exist. These are the ones that left a mark.",
};

export const emptyMoviesData: MoviesData = {
  header: defaultMoviesHeader,
  movies: [],
};

export const emptyMovie = (id: string): MovieEntry => ({
  id,
  title: "",
  posterData: undefined,
  notes: "",
  quotes: [],
});

/**
 * Records saved before the fields were merged carried two prose fields, tags
 * and links. Fold the prose into `notes` and drop the rest so a stored
 * collection keeps its words the first time this version loads it.
 */
type LegacyMovieEntry = Partial<MovieEntry> & {
  id: string;
  personalNote?: string;
  longNote?: string;
};

// The old empty-state copy was written into every saved record. It is not the
// user's writing, so it is dropped rather than folded into `notes`.
const LEGACY_NOTES_PLACEHOLDER =
  "What did this film make you feel? Why does it stay with you?";
const LEGACY_QUOTE_PLACEHOLDER = "A line that stayed with you...";

export function normalizeMovieEntry(raw: LegacyMovieEntry): MovieEntry {
  const merged =
    raw.notes ??
    [raw.personalNote, raw.longNote].filter(Boolean).join("\n\n");
  const notes = merged.trim() === LEGACY_NOTES_PLACEHOLDER ? "" : merged;

  return {
    id: raw.id,
    title: raw.title ?? "",
    posterData: raw.posterData,
    notes,
    quotes: (raw.quotes ?? [])
      .filter(
        (quote) =>
          quote?.text?.trim() &&
          quote.text.trim() !== LEGACY_QUOTE_PLACEHOLDER
      )
      .map((quote) => ({
        id: quote.id || generateId(),
        text: quote.text,
      })),
  };
}

/** Normalize a whole payload, header included. */
export function normalizeMoviesData(raw: MoviesData): MoviesData {
  return {
    header: {
      title: raw.header?.title ?? defaultMoviesHeader.title,
      description: raw.header?.description ?? defaultMoviesHeader.description,
    },
    movies: (raw.movies ?? []).map((movie) =>
      normalizeMovieEntry(movie as LegacyMovieEntry)
    ),
  };
}
