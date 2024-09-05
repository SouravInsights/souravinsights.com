import { gql } from "@apollo/client";

export const GET_BOOKS_BY_STATUS = gql`
  query booksByReadingStateAndProfile(
    $limit: Int!
    $offset: Int!
    $readingStatus: ReadingStatus!
    $profileId: String!
  ) {
    booksByReadingStateAndProfile(
      limit: $limit
      offset: $offset
      readingStatus: $readingStatus
      profileId: $profileId
    ) {
      ...BookParts
    }
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

export const GET_ALL_BOOKS = gql`
  query books($limit: Int!, $offset: Int!, $profileId: String!) {
    isReading: booksByReadingStateAndProfile(
      limit: $limit
      offset: $offset
      readingStatus: IS_READING
      profileId: $profileId
    ) {
      ...BookParts
    }
    wantsToRead: booksByReadingStateAndProfile(
      limit: $limit
      offset: $offset
      readingStatus: WANTS_TO_READ
      profileId: $profileId
    ) {
      ...BookParts
    }
    finished: booksByReadingStateAndProfile(
      limit: $limit
      offset: $offset
      readingStatus: FINISHED
      profileId: $profileId
    ) {
      ...BookParts
    }
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
