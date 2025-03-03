import { AuthState } from '../types';

// Constants
const MEETUP_API_URL = 'https://api.meetup.com';
const REDIRECT_URI = 'https://yashrajnayak.github.io/meetup';
const STORAGE_KEY = 'meetup_auth';

// Get client ID from environment variables
const CLIENT_ID = import.meta.env.VITE_MEETUP_CLIENT_ID;
if (!CLIENT_ID) {
  console.error('Missing VITE_MEETUP_CLIENT_ID environment variable');
}

// Auth state management
export const initialAuthState: AuthState = {
  isAuthenticated: false,
  accessToken: null,
  user: null,
  error: null,
};

// Initialize auth from storage
export const initializeAuth = (): AuthState => {
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
  const scope = 'basic event_management';
  const authUrl = `https://secure.meetup.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}`;
  window.location.href = authUrl;
};

// Handle auth callback
export const handleAuthCallback = (): AuthState | null => {
  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token')) return null;

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get('access_token');
  
  if (!accessToken) return null;

  // Clear hash from URL
  window.history.replaceState(null, '', window.location.pathname);
  
  return {
    isAuthenticated: true,
    accessToken,
    user: null,
    error: null,
  };
};

// Fetch user profile
export const fetchUserProfile = async (accessToken: string): Promise<AuthState> => {
  try {
    const response = await fetch(`${MEETUP_API_URL}/members/self`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const user = await response.json();
    
    return {
      isAuthenticated: true,
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        photo: user.photo ? {
          id: user.photo.id,
          baseUrl: user.photo.baseUrl,
        } : undefined,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return {
      isAuthenticated: false,
      accessToken: null,
      user: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Logout
export const logout = (): AuthState => {
  clearAuth();
  return initialAuthState;
};