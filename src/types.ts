export interface GraphQLError {
  message: string;
  code: string;
}

export interface MeetupUser {
  id: string;
  name: string;
  email?: string;
  bio?: string;
  memberships?: {
    edges: Array<{
      node: {
        role: string;
        group: {
          id: string;
          name: string;
          urlname: string;
          status: string;
          memberships: {
            count: number;
          };
        };
      };
    }>;
  };
  hostedEvents?: {
    edges: Array<{
      node: MeetupEvent;
    }>;
  };
}

export interface MeetupVenue {
  id: string;
  name: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface MeetupGroup {
  id: string;
  name: string;
  urlname: string;
  status: string;
  memberships: {
    count: number;
  };
}

export interface MeetupEvent {
  id: string;
  title: string;
  description?: string;
  dateTime: string;
  eventType: 'ONLINE' | 'IN_PERSON' | 'HYBRID';
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  group: MeetupGroup;
  going: number;
  maxTickets?: number;
  venue?: MeetupVenue;
}

export interface MeetupMember {
  id: string;
  name: string;
  role?: 'MEMBER' | 'ORGANIZER' | 'CO_ORGANIZER' | 'EVENT_ORGANIZER';
  joinedAt?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: MeetupUser | null;
  error: string | null;
}

export interface AppState {
  step: 'login' | 'events' | 'members' | 'processing' | 'results';
  events: MeetupEvent[];
  selectedEvent: MeetupEvent | null;
  memberUrls: string[];
  members: MeetupMember[];
  results: {
    success: MeetupMember[];
    failed: MeetupMember[];
  };
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string;
}

export interface Edge<T> {
  node: T;
}

export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  count: number;
}

export interface BulkOperationProgress {
  total: number;
  current: number;
  success: string[];
  failed: string[];
  inProgress: boolean;
  currentMember?: {
    id: string;
    name: string;
  };
}

export interface BulkOperationResult {
  success: string[];
  failed: string[];
}

export interface RsvpInput {
  eventId: string;
  response: 'YES' | 'NO';
  proEmailShareOptin: boolean;
  guestsCount: number;
  optToPay: boolean;
}