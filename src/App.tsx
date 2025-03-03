import React, { useEffect, useState } from 'react';
import { AppState, AuthState, MeetupEvent, MeetupMember } from './types';
import { initializeAuth, handleAuthCallback, fetchUserProfile, saveAuth, logout } from './utils/auth';
import LoginScreen from './components/LoginScreen';
import EventsScreen from './components/EventsScreen';
import MembersScreen from './components/MembersScreen';
import ProcessingScreen from './components/ProcessingScreen';
import ResultsScreen from './components/ResultsScreen';

function App() {
  const [auth, setAuth] = useState<AuthState>(initializeAuth());
  const [appState, setAppState] = useState<AppState>({
    step: 'login',
    events: [],
    selectedEvent: null,
    memberUrls: [],
    members: [],
    results: {
      success: [],
      failed: [],
    },
  });

  // Handle auth callback
  useEffect(() => {
    try {
      const callbackAuth = handleAuthCallback();
      if (callbackAuth) {
        setAuth(callbackAuth);
      }
    } catch (error) {
      console.error('Error in auth callback:', error);
      setAuth(prev => ({
        ...prev,
        error: 'Authentication failed. Please try again.',
      }));
    }
  }, []);

  // Fetch user profile if authenticated but no user data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!auth?.isAuthenticated || !auth?.accessToken || auth?.user) {
        return;
      }

      try {
        const user = await fetchUserProfile(auth.accessToken);
        if (user) {
          const updatedAuth = {
            ...auth,
            user,
          };
          setAuth(updatedAuth);
          saveAuth(updatedAuth);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setAuth(prev => ({
          ...prev,
          error: 'Failed to load user profile. Please try logging in again.',
        }));
      }
    };

    loadUserProfile();
  }, [auth?.isAuthenticated, auth?.accessToken, auth?.user]);

  // Update step based on auth state
  useEffect(() => {
    if (!auth) {
      setAppState(prev => ({ ...prev, step: 'login' }));
      return;
    }

    if (auth.isAuthenticated && auth.accessToken) {
      setAppState(prev => ({
        ...prev,
        step: prev.step === 'login' ? 'events' : prev.step,
      }));
    } else {
      setAppState(prev => ({
        ...prev,
        step: 'login',
      }));
    }
  }, [auth?.isAuthenticated, auth?.accessToken]);

  const handleLogout = () => {
    setAuth(logout());
    setAppState({
      step: 'login',
      events: [],
      selectedEvent: null,
      memberUrls: [],
      members: [],
      results: {
        success: [],
        failed: [],
      },
    });
  };

  const handleSelectEvent = (event: MeetupEvent) => {
    setAppState(prev => ({
      ...prev,
      step: 'members',
      selectedEvent: event,
    }));
  };

  const handleSubmitMembers = (urls: string[]) => {
    setAppState(prev => ({
      ...prev,
      step: 'processing',
      memberUrls: urls,
    }));
  };

  const handleProcessingComplete = (members: MeetupMember[]) => {
    setAppState(prev => ({
      ...prev,
      step: 'results',
      members,
    }));
  };

  const handleBackToEvents = () => {
    setAppState(prev => ({
      ...prev,
      step: 'events',
      selectedEvent: null,
      memberUrls: [],
      members: [],
    }));
  };

  const handleBackToMembers = () => {
    setAppState(prev => ({
      ...prev,
      step: 'members',
      members: [],
    }));
  };

  const handleReset = () => {
    setAppState(prev => ({
      ...prev,
      step: 'events',
      selectedEvent: null,
      memberUrls: [],
      members: [],
      results: {
        success: [],
        failed: [],
      },
    }));
  };

  // Render the appropriate screen based on the current step
  const renderScreen = () => {
    if (!auth.isAuthenticated) {
      return <LoginScreen error={auth.error} />;
    }

    switch (appState.step) {
      case 'events':
        return (
          <EventsScreen
            accessToken={auth.accessToken!}
            onSelectEvent={handleSelectEvent}
            onLogout={handleLogout}
          />
        );
      case 'members':
        return (
          <MembersScreen
            event={appState.selectedEvent!}
            onBack={handleBackToEvents}
            onSubmit={handleSubmitMembers}
          />
        );
      case 'processing':
        return (
          <ProcessingScreen
            accessToken={auth.accessToken!}
            event={appState.selectedEvent!}
            memberUrls={appState.memberUrls}
            onComplete={handleProcessingComplete}
            onBack={handleBackToMembers}
          />
        );
      case 'results':
        return (
          <ResultsScreen
            accessToken={auth.accessToken!}
            event={appState.selectedEvent!}
            members={appState.members}
            onBack={handleBackToMembers}
            onReset={handleReset}
          />
        );
      default:
        return <LoginScreen error={auth.error} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderScreen()}
    </div>
  );
}

export default App;