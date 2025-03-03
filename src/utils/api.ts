import { ApolloClient } from '@apollo/client';
import { MeetupEvent, MeetupMember, Connection, Edge, BulkOperationProgress, BulkOperationResult } from '../types';
import { createApolloClient } from './graphql-client';
import {
  GET_ORGANIZED_EVENTS,
  GET_EVENT_MEMBERS,
  GET_EVENT_WAITLIST,
  UPDATE_MEMBER_STATUS,
  BULK_UPDATE_MEMBER_STATUS
} from './graphql-operations';

// Create Apollo Client instance
let apolloClient: ApolloClient<any> | null = null;

const getClient = async (accessToken: string) => {
  if (!apolloClient) {
    apolloClient = await createApolloClient(accessToken);
  }
  return apolloClient;
};

// Reset client (useful when changing proxies)
export const resetClient = () => {
  apolloClient = null;
};

// Helper function to process event data
const processEventData = (event: any): MeetupEvent => ({
  id: event.id,
  title: event.title,
  description: event.description,
  dateTime: event.dateTime,
  duration: event.duration,
  status: event.status,
  eventType: event.eventType,
  venue: event.venue,
  group: event.group,
  going: event.going,
  waitlist: event.waitlist,
  maxTickets: event.maxTickets,
  fee: event.fee,
  images: event.images,
});

// Helper function to process member data
const processMemberData = (member: any): MeetupMember => ({
  id: member.id,
  name: member.name,
  profileUrl: member.profileUrl,
  photo: member.photo,
  status: member.status || 'not_found',
  joinedAt: member.joinedAt,
  role: member.role,
});

// Fetch events organized by the user
export const fetchOrganizedEvents = async (accessToken: string): Promise<MeetupEvent[]> => {
  try {
    const client = await getClient(accessToken);
    const { data } = await client.query({
      query: GET_ORGANIZED_EVENTS,
      variables: {
        first: 20, // Adjust based on your needs
      },
    });

    const events = data.self.eventsOrganized.edges.map((edge: Edge<any>) => 
      processEventData(edge.node)
    );

    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    // If there's a client error, reset the client to try a different proxy next time
    if (error instanceof Error && error.message.includes('No healthy proxy available')) {
      resetClient();
    }
    return [];
  }
};

// Extract member ID from profile URL
export const extractMemberId = (url: string): string | null => {
  const regex = /members\/(\d+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Check member status for an event
export const checkMemberStatus = async (
  accessToken: string,
  eventId: string,
  memberId: string
): Promise<'going' | 'waitlist' | 'not_found'> => {
  try {
    const client = await getClient(accessToken);

    // Check waitlist
    const waitlistResult = await client.query({
      query: GET_EVENT_WAITLIST,
      variables: {
        eventId,
        first: 100, // Adjust based on your needs
      },
    });

    const onWaitlist = waitlistResult.data.event.waitlist.edges.some(
      (edge: Edge<any>) => edge.node.id === memberId
    );

    if (onWaitlist) {
      return 'waitlist';
    }

    // Check members
    const membersResult = await client.query({
      query: GET_EVENT_MEMBERS,
      variables: {
        eventId,
        first: 100, // Adjust based on your needs
      },
    });

    const isGoing = membersResult.data.event.members.edges.some(
      (edge: Edge<any>) => edge.node.id === memberId
    );

    return isGoing ? 'going' : 'not_found';
  } catch (error) {
    console.error('Error checking member status:', error);
    return 'not_found';
  }
};

// Get member details
export const getMemberDetails = async (
  accessToken: string,
  memberId: string
): Promise<{ name: string; photo?: string } | null> => {
  try {
    const response = await fetch(`https://api.meetup.com/members/${memberId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch member details');
    }

    const member = await response.json();
    
    return {
      name: member.name,
      photo: member.photo?.thumb_link,
    };
  } catch (error) {
    console.error('Error fetching member details:', error);
    return null;
  }
};

// Constants for rate limiting
const RATE_LIMIT_DELAY = 1000; // 1 second delay between requests

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Change RSVP status for a single member with progress callback
export const changeRsvpStatus = async (
  accessToken: string,
  eventId: string,
  memberId: string,
  memberName: string,
  onProgress?: (progress: BulkOperationProgress) => void
): Promise<boolean> => {
  try {
    const client = await getClient(accessToken);
    const { data } = await client.mutate({
      mutation: UPDATE_MEMBER_STATUS,
      variables: {
        input: {
          eventId,
          memberId,
          status: 'going',
        },
      },
    });

    if (data.updateMemberStatus.errors?.length > 0) {
      console.error('Errors updating member status:', data.updateMemberStatus.errors);
      if (onProgress) {
        onProgress({
          current: 1,
          total: 1,
          success: [],
          failed: [memberId],
          inProgress: false,
          currentMember: { id: memberId, name: memberName },
        });
      }
      return false;
    }

    if (onProgress) {
      onProgress({
        current: 1,
        total: 1,
        success: [memberId],
        failed: [],
        inProgress: false,
        currentMember: { id: memberId, name: memberName },
      });
    }
    return true;
  } catch (error) {
    console.error('Error changing RSVP status:', error);
    if (onProgress) {
      onProgress({
        current: 1,
        total: 1,
        success: [],
        failed: [memberId],
        inProgress: false,
        currentMember: { id: memberId, name: memberName },
      });
    }
    return false;
  }
};

// Bulk change RSVP status from waitlist to going with sequential processing
export const bulkChangeRsvpStatus = async (
  accessToken: string,
  eventId: string,
  members: Array<{ id: string; name: string }>,
  onProgress?: (progress: BulkOperationProgress) => void
): Promise<BulkOperationResult> => {
  const results: BulkOperationResult = {
    success: [],
    failed: [],
  };

  const total = members.length;
  let current = 0;

  for (const member of members) {
    current++;
    
    if (onProgress) {
      onProgress({
        total,
        current,
        success: results.success,
        failed: results.failed,
        inProgress: true,
        currentMember: member,
      });
    }

    const success = await changeRsvpStatus(
      accessToken,
      eventId,
      member.id,
      member.name
    );

    if (success) {
      results.success.push(member.id);
    } else {
      results.failed.push(member.id);
    }

    // Wait before processing next member to respect rate limits
    if (current < total) {
      await wait(RATE_LIMIT_DELAY);
    }
  }

  if (onProgress) {
    onProgress({
      total,
      current,
      success: results.success,
      failed: results.failed,
      inProgress: false,
    });
  }

  return results;
};