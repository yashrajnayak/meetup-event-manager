import { gql } from '@apollo/client';

// Fragments for reusable pieces
export const MEMBERSHIP_FIELDS = gql`
  fragment MembershipFields on MembershipEdge {
    node {
      id
      status
      group {
        id
        name
        urlname
        status
        memberships {
          count
        }
      }
    }
  }
`;

export const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    name
    email
    bio
    memberships {
      edges {
        node {
          id
          membershipInfo {
            role
            status
          }
          group {
            id
            name
            urlname
            status
            memberships {
              count
            }
          }
        }
      }
    }
  }
`;

export const EVENT_FIELDS = gql`
  fragment EventFields on Event {
    id
    title
    description
    dateTime
    eventType
    status
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
      status
      memberships {
        count
      }
    }
    going
    maxTickets
  }
`;

export const MEMBER_FIELDS = gql`
  fragment MemberFields on Member {
    id
    name
    joinedAt
    memberships {
      edges {
        node {
          id
          membershipInfo {
            role
            status
          }
        }
      }
    }
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
      id
      name
      memberships {
        edges {
          node {
            id
            membershipInfo {
              role
              status
            }
            group {
              id
              name
              urlname
              status
              memberships {
                count
              }
            }
          }
        }
      }
      hostedEvents {
        edges {
          node {
            ...EventFields
          }
        }
      }
    }
  }
  ${EVENT_FIELDS}
`;

export const GET_EVENT_MEMBERS = gql`
  query GetEventMembers($eventId: ID!, $first: Int!, $after: String) {
    event(id: $eventId) {
      id
      members(first: $first, after: $after) {
        edges {
          node {
            ...MemberFields
          }
        }
        pageInfo {
          hasNextPage
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
      tickets(first: $first, after: $after, status: [WAITLIST]) {
        edges {
          node {
            id
            member {
              ...MemberFields
            }
          }
        }
        pageInfo {
          hasNextPage
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
      event {
        ...EventFields
      }
      errors {
        message
        code
      }
    }
  }
  ${EVENT_FIELDS}
`;

// Bulk update mutation - using the same mutation but keeping it separate for clarity
export const BULK_UPDATE_MEMBER_STATUS = gql`
  mutation BulkUpdateMemberStatus($input: RsvpInput!) {
    rsvp(input: $input) {
      member {
        ...MemberFields
      }
      errors {
        message
        code
      }
    }
  }
  ${MEMBER_FIELDS}
`;