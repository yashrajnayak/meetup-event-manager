import { MeetupEvent, Edge, BulkOperationProgress, BulkOperationResult } from '../types';
import { client } from './graphql-client';
import {
  GET_ORGANIZED_EVENTS,
  GET_EVENT_MEMBERS,
  GET_EVENT_WAITLIST,
  UPDATE_MEMBER_STATUS
} from './graphql-operations';

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
  group: {
    ...event.group,
    membershipCount: event.group.memberships?.totalCount || 0
  },
  going: event.going?.totalCount || 0,
  waitlist: event.waiting?.totalCount || 0,
  maxTickets: event.maxTickets,
  fee: event.fee,
  images: event.images,
});

// Fetch events organized by the user
export const fetchOrganizedEvents = async (accessToken: string): Promise<MeetupEvent[]> => {
  try {
    const { data } = await client.query({
      query: GET_ORGANIZED_EVENTS,
      variables: {
        first: 20, // Adjust based on your needs
      },
      context: {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    });

    if (!data.self.isOrganizer) {
      console.log('User is not an organizer');
      return [];
    }

    const events = data.self.organizedEvents.edges.map((edge: Edge<any>) => 
      processEventData(edge.node)
    );

    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
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
    // Check waitlist
    const waitlistResult = await client.query({
      query: GET_EVENT_WAITLIST,
      variables: {
        eventId,
        first: 100, // Adjust based on your needs
      },
      context: {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    });

    const onWaitlist = waitlistResult.data.event.waiting.edges.some(
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
      context: {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
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
): Promise<{ name: string; } | null> => {
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
      name: member.name
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
    const { data } = await client.mutate({
      mutation: UPDATE_MEMBER_STATUS,
      variables: {
        input: {
          eventId,
          response: 'YES'
        },
      },
      context: {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    });

    if (data.rsvp.errors?.length > 0) {
      console.error('Errors updating member status:', data.rsvp.errors);
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