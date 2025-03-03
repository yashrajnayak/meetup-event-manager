export interface GraphQLError {
  message: string;
  locations: { line: number; column: number }[];
  path: string[];
  extensions: {
    code: string;
    consumedPoints?: number;
    resetAt?: string;
    [key: string]: unknown;
  };
}

export interface MeetupUser {
  id: string;
  name: string;
  email?: string;
  bio?: string;
  isProMember?: boolean;
  isOrganizer?: boolean;
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
  radius?: number;
}

export interface MeetupGroup {
  id: string;
  name: string;
  urlname: string;
  description?: string;
  link: string;
  status: string;
  membershipCount: number;
}

export interface MeetupEvent {
  id: string;
  title: string;
  description?: string;
  dateTime: string;
  duration?: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  eventType: 'ONLINE' | 'IN_PERSON' | 'HYBRID';
  venue?: MeetupVenue;
  group: MeetupGroup;
  going: number;
  waitlist: number;
  maxTickets?: number;
  fee?: {
    amount: number;
    currency: string;
  };
  images?: Array<{
    id: string;
    baseUrl: string;
  }>;
}

export interface MeetupMember {
  id: string;
  name: string;
  profileUrl: string;
  status: 'going' | 'waitlist' | 'not_found';
  joinedAt?: string;
  role?: 'MEMBER' | 'ORGANIZER' | 'CO_ORGANIZER' | 'EVENT_ORGANIZER';
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

// GraphQL specific types
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string;
  endCursor: string;
}

export interface Edge<T> {
  node: T;
  cursor: string;
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