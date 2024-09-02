export type BookStatus = "IS_READING" | "FINISHED" | "WANTS_TO_READ";

export interface Author {
  name: string;
}

export interface Book {
  id: string;
  title: string;
  cover: string;
  authors: { name: string }[];
  publishedDate: string;
  pageCount?: number;
}

export interface BookEdge {
  node: Book;
}

export interface MyBooksData {
  myBooks: {
    edges: BookEdge[];
  };
}

export interface MyBooksVars {
  status: BookStatus;
}
