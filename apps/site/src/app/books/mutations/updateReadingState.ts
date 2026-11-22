import { gql } from "@apollo/client";

export const UPDATE_READING_STATE = gql`
  mutation updateReadingState(
    $bookId: String!
    $readingStatus: ReadingStatus!
  ) {
    updateReadingState(bookId: $bookId, readingStatus: $readingStatus) {
      ...ReadingStateParts
      book {
        ...BookParts
      }
    }
  }

  fragment ReadingStateParts on ReadingState {
    id
    status
    bookId
    profileId
    createdAt
  }

  fragment BookParts on Book {
    id
    slug
    title
    subtitle
    description
    isbn10
    isbn13
    language
    pageCount
    publishedDate
    publisher
    cover
    authors {
      id
      name
    }
    gradientColors
  }
`;
