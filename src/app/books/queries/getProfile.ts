import { gql } from "@apollo/client";

export const GET_PROFILE = gql`
  query getProfileParts($handle: String!) {
    profile(where: { handle: $handle }) {
      ...ProfileParts
    }
  }

  fragment ProfileParts on Profile {
    id
    handle
    name
    bio
    image
    invitedByProfileId
  }
`;
