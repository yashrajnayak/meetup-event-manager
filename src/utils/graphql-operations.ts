import { gql } from '@apollo/client';

// Base fragments for reusable pieces
export const GROUP_FIELDS = gql`
  fragment GroupFields on Group {
    id
    name
    urlname
    status
    memberships {
      totalCount
    }
  }
`;

export const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    name
    email
    bio
    memberships(first: 100) {
      totalCount
      edges {
        node {
          id
          status
          membershipRole: role
          memberGroup: group {
            ...GroupFields
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${GROUP_FIELDS}
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
    eventGroup: group {
      ...GroupFields
    }
    going
    maxTickets
    rsvpSettings {
      openTime: rsvpOpenTime
      closeTime: rsvpCloseTime
      maxTickets
      guestsPerMember
    }
    tickets(first: 0) {
      totalCount
    }
  }
  ${GROUP_FIELDS}
`;

export const MEMBER_FIELDS = gql`
  fragment MemberFields on Member {
    id
    name
    joinedAt
    memberships(first: 10) {
      totalCount
      edges {
        node {
          id
          status
          membershipRole: role
        }
      }
      pageInfo {
        hasNextPage
        endCursor
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
      memberships(first: 100) {
        totalCount
        edges {
          node {
            id
            status
            membershipRole: role
            memberGroup: group {
              ...GroupFields
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
      hostedEvents(first: 50) {
        totalCount
        edges {
          node {
            ...EventFields
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
  ${GROUP_FIELDS}
  ${EVENT_FIELDS}
`;

export const GET_EVENT_MEMBERS = gql`
  query GetEventMembers($eventId: ID!, $first: Int!, $after: String) {
    event(id: $eventId) {
      id
      members(first: $first, after: $after) {
        totalCount
        edges {
          node {
            ...MemberFields
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
  ${MEMBER_FIELDS}
`;

export const GET_EVENT_WAITLIST = gql`
  query GetEventWaitlist($eventId: ID!, $first: Int!, $after: String) {
    event(id: $eventId) {
      id
      tickets(first: $first, after: $after, status: WAITLIST) {
        totalCount
        edges {
          node {
            id
            status
            member {
              ...MemberFields
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
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