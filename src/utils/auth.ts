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
    return {
      ...initialAuthState,
      error: 'Missing Meetup Client ID. Please check your environment configuration.',
    };
  }

  const storedAuth = localStorage.getItem(STORAGE_KEY);
  if (storedAuth) {
    try {
      const parsedAuth = JSON.parse(storedAuth) as AuthState;
      // Check if token is still valid (simple check)
      if (parsedAuth.accessToken) {
        return parsedAuth;
      }
    } catch (e) {
      console.error('Failed to parse stored auth', e);
    }
  }
  return initialAuthState;
};

// Save auth to storage
export const saveAuth = (auth: AuthState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
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

// Handle auth callback
export const handleAuthCallback = (): AuthState | null => {
  if (!CLIENT_ID) {
    return {
      ...initialAuthState,
      error: 'Missing Meetup Client ID. Please check your environment configuration.',
    };
  }

  console.log('Handling auth callback:', { 
    hash: window.location.hash,
    pathname: window.location.pathname,
    href: window.location.href
  });

  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token')) return null;

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get('access_token');
  
  if (!accessToken) return null;

  // Clear hash from URL but maintain the base path
  window.history.replaceState(null, '', isDevelopment ? '/' : APP_PATH);
  
  const authState = {
    isAuthenticated: true,
    accessToken,
    user: null,
    error: null,
  };

  // Debug log
  console.log('Auth successful:', { isAuthenticated: true, hasToken: !!accessToken });

  return authState;
};

const GET_USER_PROFILE = gql`
  query GetUserProfile {
    self {
      id
      name
      email
      bio
      isPro
      isOrganizer
    }
  }
`;

export async function fetchUserProfile(token: string): Promise<any> {
  try {
    const response = await client.query({
      query: GET_USER_PROFILE,
      context: {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    });

    if (response.errors) {
      console.error('GraphQL errors:', response.errors);
      throw new Error('Failed to fetch user profile');
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