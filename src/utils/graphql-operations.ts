import { gql } from '@apollo/client';

// Fragments for reusable pieces
export const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    name
    email
    bio
    photo {
      id
      baseUrl
      preview
    }
    membershipCount
    isProMember
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
      radius
    }
    group {
      id
      name
      urlname
      description
      link
      status
      membershipCount
      photo {
        id
        baseUrl
        preview
      }
    }
    going
    waitlist
    maxTickets
    fee {
      amount
      currency
    }
    images {
      id
      baseUrl
      preview
    }
  }
`;

export const MEMBER_FIELDS = gql`
  fragment MemberFields on Member {
    id
    name
    profileUrl
    photo {
      id
      baseUrl
      preview
    }
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
  query GetOrganizedEvents($first: Int!, $after: String) {
    self {
      eventsOrganized(first: $first, after: $after) {
        edges {
          node {
            ...EventFields
          }
          cursor
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        totalCount
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
        totalCount
      }
    }
  }
  ${MEMBER_FIELDS}
`;

export const GET_EVENT_WAITLIST = gql`
  query GetEventWaitlist($eventId: ID!, $first: Int!, $after: String) {
    event(id: $eventId) {
      id
      waitlist(first: $first, after: $after) {
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
        totalCount
      }
    }
  }
  ${MEMBER_FIELDS}
`;

// Mutations
export const UPDATE_MEMBER_STATUS = gql`
  mutation UpdateMemberStatus($input: UpdateMemberStatusInput!) {
    updateMemberStatus(input: $input) {
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

// Bulk update mutation
export const BULK_UPDATE_MEMBER_STATUS = gql`
  mutation BulkUpdateMemberStatus($input: BulkUpdateMemberStatusInput!) {
    bulkUpdateMemberStatus(input: $input) {
      members {
        ...MemberFields
        status
      }
      errors {
        message
        code
        field
        memberId
      }
    }
  }
  ${MEMBER_FIELDS}
`; 