import { Book, BookWithReadwiseId, ReadwiseBook } from "../types/bookTypes";

/**
 * Matches books from Literal's API with books from Readwise's API.
 * This function is crucial for linking highlights from Readwise to the correct books in Literal.
 *
 * @param literalBooks - Array of books from Literal's API
 * @param readwiseBooks - Array of books from Readwise's API
 * @returns An array of Literal books, potentially enhanced with Readwise IDs
 */
export function matchBooks(
  literalBooks: Book[],
  readwiseBooks: ReadwiseBook[]
): BookWithReadwiseId[] {
  // Create a Map for O(1) lookup time when matching books
  const bookMap = new Map<string, number>();

  // Populate the map with Readwise books
  // The key is a combination of lowercase title and author, the value is the Readwise book ID
  readwiseBooks.forEach((readwiseBook) => {
    const key = generateBookKey(readwiseBook.title, readwiseBook.author);
    bookMap.set(key, readwiseBook.id);
  });

  // Iterate through Literal books, attempting to find matches in the Readwise map
  return literalBooks.map((literalBook) => {
    // Combine all authors into a single string, mimicking Readwise's author format
    const authors = literalBook.authors.map((a) => a.name).join(", ");
    const key = generateBookKey(literalBook.title, authors);

    // Attempt to find a matching Readwise ID
    const readwiseId = bookMap.get(key);

    // Return the Literal book, potentially enhanced with a Readwise ID
    return {
      ...literalBook,
      readwiseId,
    };
  });
}

/**
 * Generates a standardized key for book matching.
 * This function creates a consistent string representation of a book's title and author
 * to improve matching accuracy across different API responses.
 *
 * @param title - The book's title
 * @param author - The book's author(s)
 * @returns A lowercase, trimmed string in the format "title|author"
 */
function generateBookKey(title: string, author: string): string {
  return `${title.toLowerCase().trim()}|${author.toLowerCase().trim()}`;
}

/**
 * Finds the best matching Readwise book for a given Literal book.
 * This function implements a simple scoring system based on title and author similarity.
 * It's more lenient than the exact matching in matchBooks, potentially useful for fuzzy matching.
 *
 * Note: This function is currently not used in the main matchBooks function.
 * It's here as a potential fallback for when exact matches aren't found.
 *
 * @param literalBook - A book from Literal's API
 * @param readwiseBooks - Array of books from Readwise's API
 * @returns The ID of the best matching Readwise book, if any
 */
function findBestMatch(
  literalBook: Book,
  readwiseBooks: ReadwiseBook[]
): number | undefined {
  const literalTitle = literalBook.title.toLowerCase();
  const literalAuthors = literalBook.authors.map((a) => a.name.toLowerCase());

  let bestMatch: ReadwiseBook | undefined;
  let highestScore = 0;

  // Iterate through all Readwise books to find the best match
  for (const readwiseBook of readwiseBooks) {
    const readwiseTitle = readwiseBook.title.toLowerCase();
    const readwiseAuthor = readwiseBook.author.toLowerCase();

    let score = 0;

    // Score 2 points for title similarity
    if (
      literalTitle.includes(readwiseTitle) ||
      readwiseTitle.includes(literalTitle)
    ) {
      score += 2;
    }

    // Score 1 point for author similarity
    if (
      literalAuthors.some(
        (author) =>
          readwiseAuthor.includes(author) || author.includes(readwiseAuthor)
      )
    ) {
      score += 1;
    }

    // Update the best match if this book has a higher score
    if (score > highestScore) {
      highestScore = score;
      bestMatch = readwiseBook;
    }
  }

  // Return the ID of the best match, if one was found
  return bestMatch?.id;
}
