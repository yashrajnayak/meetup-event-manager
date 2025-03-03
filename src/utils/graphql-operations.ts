import { gql } from '@apollo/client';

// Fragments for reusable pieces
export const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    name
    email
    bio
    isOrganizer
  }
`;

export const EVENT_FIELDS = gql`
  fragment EventFields on Event {
    id
    title
    description
    dateTime
    duration
    status
    eventType
    venue {
      id
      name
      address
      city
      state
      country
      lat
      lng
    }
    group {
      id
      name
      urlname
      description
      link
      status
      memberships {
        count
      }
    }
    going
    waiting
    maxTickets
    fee {
      amount
      currency
    }
    images {
      id
      baseUrl
    }
  }
`;

export const MEMBER_FIELDS = gql`
  fragment MemberFields on Member {
    id
    name
    profileUrl
    joinedAt
    role
  }
`;

// Queries
export const GET_SELF = gql`
  query GetSelf {
    self {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

export const GET_ORGANIZED_EVENTS = gql`
  query GetOrganizedEvents {
    self {
      isOrganizer
      hostedEvents {
        edges {
          node {
            id
            title
            description
            dateTime
            duration
            status
            eventType
            venue {
              id
              name
              address
              city
              state
              country
              lat
              lng
              radius
            }
            group {
              id
              name
              urlname
              description
              link
              status
              memberships {
                count
              }
            }
            going
            waiting
            maxTickets
            fee
            images {
              id
              baseUrl
            }
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        count
      }
    }
  }
`;

export const GET_EVENT_MEMBERS = gql`
  query GetEventMembers($eventId: ID!, $first: Int!, $after: String) {
    event(id: $eventId) {
      id
      members(first: $first, after: $after) {
        edges {
          node {
            ...MemberFields
            status
          }
          cursor
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        count
      }
    }
  }
  ${MEMBER_FIELDS}
`;

export const GET_EVENT_WAITLIST = gql`
  query GetEventWaitlist($eventId: ID!, $first: Int!, $after: String) {
    event(id: $eventId) {
      id
      waiting(first: $first, after: $after) {
        edges {
          node {
            ...MemberFields
          }
          cursor
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        count
      }
    }
  }
  ${MEMBER_FIELDS}
`;

// Mutations
export const UPDATE_MEMBER_STATUS = gql`
  mutation UpdateMemberStatus($input: RsvpInput!) {
    rsvp(input: $input) {
      member {
        ...MemberFields
        status
      }
      errors {
        message
        code
        field
      }
    }
  }
  ${MEMBER_FIELDS}
`;

// Bulk update mutation - using the same mutation but keeping it separate for clarity
export const BULK_UPDATE_MEMBER_STATUS = gql`
  mutation BulkUpdateMemberStatus($input: RsvpInput!) {
    rsvp(input: $input) {
      member {
        ...MemberFields
        status
      }
      errors {
        message
        code
        field
      }
    }
  }
  ${MEMBER_FIELDS}
`; 