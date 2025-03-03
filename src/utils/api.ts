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
    membershipCount: event.group.memberships?.count || 0
  },
  going: event.going || 0,
  waitlist: event.waiting || 0,
  maxTickets: event.maxTickets,
  fee: event.fee ? {
    amount: event.fee.amount,
    currency: event.fee.currency
  } : undefined,
  images: event.images,
});

// Fetch events organized by the user
export const fetchOrganizedEvents = async (accessToken: string): Promise<MeetupEvent[]> => {
  try {
    const { data } = await client.query({
      query: GET_ORGANIZED_EVENTS,
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

    // hostedEvents is now a direct array, no need to process edges
    const events = data.self.hostedEvents.map((event: any) => ({
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
        membershipCount: event.group.memberships?.count || 0
      },
      going: event.going || 0,
      waitlist: event.waiting || 0,
      maxTickets: event.maxTickets,
      fee: event.fee,
      images: event.images,
    }));

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
const POINTS_PER_WINDOW = 500;
const RATE_LIMIT_WINDOW = 60000; // 60 seconds
const MIN_DELAY = 500; // Minimum delay between requests
const OPERATION_COSTS = {
  QUERY: 5,
  MUTATION: 10
} as const;

// Rate limit tracking with proper reset
let pointsUsed = 0;
let windowStartTime = Date.now();
let lastResetTime = Date.now();

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to manage rate limiting with better tracking
const checkRateLimit = async (operationType: keyof typeof OPERATION_COSTS) => {
  const now = Date.now();
  const windowElapsed = now - windowStartTime;
  const pointCost = OPERATION_COSTS[operationType];
  
  // Reset window if needed
  if (windowElapsed >= RATE_LIMIT_WINDOW) {
    pointsUsed = 0;
    windowStartTime = now;
    lastResetTime = now;
    return;
  }

  // Check if adding this operation would exceed the limit
  if (pointsUsed + pointCost >= POINTS_PER_WINDOW) {
    const waitTime = RATE_LIMIT_WINDOW - windowElapsed;
    console.log(`Rate limit approaching. Waiting ${waitTime}ms before next operation.`);
    await wait(waitTime);
    pointsUsed = 0;
    windowStartTime = Date.now();
    lastResetTime = Date.now();
    return;
  }

  pointsUsed += pointCost;
  
  // Add minimum delay between requests
  const timeSinceLastReset = now - lastResetTime;
  if (timeSinceLastReset < MIN_DELAY) {
    await wait(MIN_DELAY - timeSinceLastReset);
  }
  lastResetTime = Date.now();
};

// Helper function to handle GraphQL errors
const handleGraphQLError = (error: any, operation: string): Error => {
  let errorMessage = `GraphQL ${operation} failed`;
  
  if (error.graphQLErrors) {
    const rateLimitError = error.graphQLErrors.find(
      (e: any) => e.extensions?.code === 'RATE_LIMITED'
    );
    
    if (rateLimitError) {
      const resetAt = new Date(rateLimitError.extensions.resetAt);
      const waitTime = Math.max(resetAt.getTime() - Date.now(), RATE_LIMIT_WINDOW);
      return new Error(`RATE_LIMITED:${waitTime}`);
    }
    
    errorMessage = error.graphQLErrors.map((e: any) => e.message).join(', ');
  } else if (error.networkError) {
    errorMessage = `Network error: ${error.networkError.message}`;
  }
  
  return new Error(errorMessage);
};

// Fetch all waitlist members with pagination
export const fetchWaitlistMembers = async (
  accessToken: string,
  eventId: string,
  onProgress?: (progress: BulkOperationProgress) => void
): Promise<Array<{ id: string; name: string }>> => {
  const members: Array<{ id: string; name: string }> = [];
  let hasNextPage = true;
  let after: string | null = null;
  let totalFetched = 0;

  try {
    while (hasNextPage) {
      await checkRateLimit('QUERY');

      interface WaitlistQueryResponse {
        event: {
          waiting: {
            edges: Array<{
              node: {
                id: string;
                name: string;
              };
            }>;
            pageInfo: {
              hasNextPage: boolean;
              endCursor: string;
            };
            count: number;
          };
        };
      }

      interface QueryResult {
        data: WaitlistQueryResponse;
      }

      const result: QueryResult = await client.query<WaitlistQueryResponse>({
        query: GET_EVENT_WAITLIST,
        variables: {
          eventId,
          first: 50,
          after
        },
        context: {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      });

      const { edges, pageInfo, count } = result.data.event.waiting;

      members.push(...edges.map(edge => ({
        id: edge.node.id,
        name: edge.node.name
      })));

      totalFetched += edges.length;
      if (onProgress) {
        onProgress({
          total: count,
          current: totalFetched,
          success: [],
          failed: [],
          inProgress: true
        });
      }

      hasNextPage = pageInfo.hasNextPage;
      after = pageInfo.endCursor;
    }

    return members;
  } catch (error: unknown) {
    console.error('Error fetching waitlist members:', error);
    if (error instanceof Error) {
      throw handleGraphQLError(error, 'fetchWaitlistMembers');
    }
    throw new Error('Unknown error fetching waitlist members');
  }
};

// Helper function to process a batch of members with improved error handling
const processMemberBatch = async (
  accessToken: string,
  eventId: string,
  members: Array<{ id: string; name: string }>,
  onProgress?: (progress: BulkOperationProgress) => void
): Promise<BulkOperationResult> => {
  const results: BulkOperationResult = {
    success: [],
    failed: [],
  };

  for (const member of members) {
    try {
      await checkRateLimit('MUTATION');

      const success = await changeRsvpStatus(
        accessToken,
        eventId,
        member.id,
        member.name,
        onProgress
      );

      if (success) {
        results.success.push(member.id);
      } else {
        results.failed.push(member.id);
      }
    } catch (error: unknown) {
      console.error(`Error processing member ${member.id}:`, error);
      results.failed.push(member.id);
      
      // Handle rate limiting errors
      if (error instanceof Error && error.message.startsWith('RATE_LIMITED:')) {
        const waitTime = parseInt(error.message.split(':')[1], 10);
        await wait(waitTime);
      }
    }
  }

  return results;
};

// Bulk change RSVP status with improved batch processing and error handling
export const bulkChangeRsvpStatus = async (
  accessToken: string,
  eventId: string,
  members: Array<{ id: string; name: string }>,
  onProgress?: (progress: BulkOperationProgress) => void
): Promise<BulkOperationResult> => {
  const BATCH_SIZE = 10;
  const results: BulkOperationResult = {
    success: [],
    failed: [],
  };

  const total = members.length;
  let processed = 0;

  try {
    for (let i = 0; i < members.length; i += BATCH_SIZE) {
      const batch = members.slice(i, i + BATCH_SIZE);
      const batchResults = await processMemberBatch(
        accessToken,
        eventId,
        batch,
        (batchProgress) => {
          if (onProgress) {
            onProgress({
              total,
              current: processed + batchProgress.current,
              success: [...results.success, ...batchProgress.success],
              failed: [...results.failed, ...batchProgress.failed],
              inProgress: true,
              currentMember: batchProgress.currentMember,
            });
          }
        }
      );

      results.success.push(...batchResults.success);
      results.failed.push(...batchResults.failed);
      processed += batch.length;

      if (onProgress) {
        onProgress({
          total,
          current: processed,
          success: results.success,
          failed: results.failed,
          inProgress: true,
        });
      }
    }
  } catch (error) {
    console.error('Error in bulk operation:', error);
    // Add remaining unprocessed members to failed list
    const remainingMembers = members.slice(processed);
    results.failed.push(...remainingMembers.map(m => m.id));
  }

  if (onProgress) {
    onProgress({
      total,
      current: processed,
      success: results.success,
      failed: results.failed,
      inProgress: false,
    });
  }

  return results;
};

// Change RSVP status for a single member with improved error handling
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
          response: 'YES',
          proEmailShareOptin: false,
          guestsCount: 0,
          optToPay: false
        },
      },
      context: {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    });

    if (data.rsvp.errors?.length > 0) {
      const error = handleGraphQLError({ graphQLErrors: data.rsvp.errors }, 'changeRsvpStatus');
      throw error;
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
    throw error;
  }
};