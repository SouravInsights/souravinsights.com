export interface MovieQuote {
  id: string;
  text: string;
}

export interface MovieLink {
  id: string;
  url: string;
  label: string;
}

export interface MovieEntry {
  id: string;
  title: string;
  posterData?: string;
  personalNote: string;
  quotes: MovieQuote[];
  tags: string[];
  links: MovieLink[];
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
  personalNote: "What did this film make you feel? Why does it stay with you?",
  quotes: [{ id: generateId(), text: "A line that stayed with you..." }],
  tags: [],
  links: [],
});
