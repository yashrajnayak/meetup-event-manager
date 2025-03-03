import { AuthState } from '../types';
import { client } from './graphql-client';
import { gql } from '@apollo/client';

// Constants
const isDevelopment = import.meta.env.MODE === 'development';
const BASE_URL = isDevelopment ? 'http://localhost:5174' : 'https://yashrajnayak.github.io';
const APP_PATH = isDevelopment ? '' : '/meetup';
const REDIRECT_URI = `${BASE_URL}${APP_PATH}`;
const STORAGE_KEY = 'meetup_auth';

// Get client ID from environment variables
const CLIENT_ID = import.meta.env.VITE_MEETUP_CLIENT_ID;

// Debug logging for deployment
console.log('Auth Configuration:', {
  mode: import.meta.env.MODE,
  baseUrl: BASE_URL,
  appPath: APP_PATH,
  redirectUri: REDIRECT_URI,
  hasClientId: !!CLIENT_ID,
});

// Auth state management
export const initialAuthState: AuthState = {
  isAuthenticated: false,
  accessToken: null,
  user: null,
  error: CLIENT_ID ? null : 'Missing Meetup Client ID. Please check your environment configuration.',
};

// Initialize auth from storage
export const initializeAuth = (): AuthState => {
  if (!CLIENT_ID) {
    console.warn('Missing Meetup Client ID');
    return {
      ...initialAuthState,
      error: 'Missing Meetup Client ID. Please check your environment configuration.',
    };
  }

  try {
    const storedAuth = localStorage.getItem(STORAGE_KEY);
    if (!storedAuth) {
      return initialAuthState;
    }

    const parsedAuth = JSON.parse(storedAuth) as AuthState;
    // Check if token exists and auth state is valid
    if (parsedAuth && parsedAuth.accessToken && parsedAuth.isAuthenticated) {
      return parsedAuth;
    }

    // If invalid auth state, clear storage and return initial state
    clearAuth();
    return initialAuthState;
  } catch (e) {
    console.error('Failed to parse stored auth', e);
    // Clear potentially corrupted auth data
    clearAuth();
    return initialAuthState;
  }
};

// Save auth to storage with validation
export const saveAuth = (auth: AuthState): void => {
  if (!auth || !auth.accessToken) {
    console.warn('Attempting to save invalid auth state');
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  } catch (e) {
    console.error('Failed to save auth state', e);
  }
};

// Clear auth from storage
export const clearAuth = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

// Login with Meetup
export const loginWithMeetup = (): void => {
  if (!CLIENT_ID) {
    console.error('Cannot login: Missing Meetup Client ID');
    return;
  }

  const scope = 'basic event_management';
  const authUrl = `https://secure.meetup.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}`;
  
  // Debug log
  console.log('Initiating login:', {
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
    scope
  });
  
  window.location.href = authUrl;
};

// Handle auth callback with improved error handling
export const handleAuthCallback = (): AuthState | null => {
  if (!CLIENT_ID) {
    console.warn('Missing Meetup Client ID');
    return {
      ...initialAuthState,
      error: 'Missing Meetup Client ID. Please check your environment configuration.',
    };
  }

  try {
    console.log('Handling auth callback:', { 
      hash: window.location.hash,
      pathname: window.location.pathname,
      href: window.location.href
    });

    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) {
      return null;
    }

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    
    if (!accessToken) {
      console.warn('No access token found in callback');
      return null;
    }

    // Clear hash from URL but maintain the base path
    window.history.replaceState(null, '', isDevelopment ? '/' : APP_PATH);
    
    const authState: AuthState = {
      isAuthenticated: true,
      accessToken,
      user: null,
      error: null,
    };

    // Save the auth state immediately
    saveAuth(authState);

    console.log('Auth successful:', { isAuthenticated: true, hasToken: !!accessToken });

    return authState;
  } catch (error) {
    console.error('Error handling auth callback:', error);
    return {
      ...initialAuthState,
      error: 'Failed to process authentication. Please try again.',
    };
  }
};

const GET_USER_PROFILE = gql`
  query GetUserProfile {
    self {
      id
      name
      email
      bio
      memberships {
        edges {
          node {
            role
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
            }
            going
            maxTickets
          }
        }
      }
    }
  }
`;

export async function fetchUserProfile(token: string): Promise<any> {
  try {
    console.log('Fetching user profile with token:', token ? 'present' : 'missing');
    
    const response = await client.query({
      query: GET_USER_PROFILE,
      context: {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      },
      fetchPolicy: 'network-only' // Force network request, bypass cache
    });

    console.log('User profile response:', {
      hasData: !!response.data,
      hasErrors: !!response.errors,
      self: response.data?.self ? 'present' : 'missing'
    });

    if (response.errors) {
      console.error('GraphQL errors:', response.errors);
      throw new Error('Failed to fetch user profile: ' + response.errors.map(e => e.message).join(', '));
    }

    if (!response.data?.self) {
      console.error('No user data returned in response:', response);
      throw new Error('User profile data is missing from response');
    }

    return response.data.self;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

// Logout
export const logout = (): AuthState => {
  clearAuth();
  return initialAuthState;
};