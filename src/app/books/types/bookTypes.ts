export interface Author {
  __typename: string;
  id: string;
  name: string;
}

export interface Book {
  __typename: string;
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  isbn10?: string;
  isbn13?: string;
  language?: string;
  pageCount?: number;
  publishedDate?: string | null;
  publisher?: string | null;
  cover: string;
  authors: Author[];
  gradientColors: string[];
}

export interface BookWithReadwiseId extends Book {
  readwiseId?: number;
}

export interface ReadwiseBook {
  id: number;
  title: string;
  author: string;
  category?: string;
  source?: string;
  num_highlights?: number;
  last_highlight_at?: string;
  updated?: string;
  cover_image_url?: string;
  highlights_url?: string;
}

export interface Highlight {
  id: number;
  text: string;
  note?: string;
  location: number;
  location_type: string;
  highlighted_at: string;
  updated: string;
  color: string;
  book_id: number;
  tags: Tag[];
  url: string | null;
}

export interface Tag {
  id: number;
  name: string;
}
