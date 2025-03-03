import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Users, Loader } from 'lucide-react';
import { MeetupEvent } from '../types';
import { fetchOrganizedEvents } from '../utils/api';

interface EventsScreenProps {
  accessToken: string;
  onSelectEvent: (event: MeetupEvent) => void;
  onLogout: () => void;
}

const EventsScreen: React.FC<EventsScreenProps> = ({ accessToken, onSelectEvent, onLogout }) => {
  const [events, setEvents] = useState<MeetupEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const fetchedEvents = await fetchOrganizedEvents(accessToken);
        setEvents(fetchedEvents);
        setError(null);
      } catch (err) {
        setError('Failed to load events. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [accessToken]);

  const formatDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <Loader className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="mt-4 text-gray-600">Loading your events...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Your Upcoming Events</h1>
          <button
            onClick={onLogout}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {events.length === 0 && !loading && !error ? (
          <div className="text-center p-8 bg-white rounded-lg shadow">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-700">No upcoming events found</h2>
            <p className="mt-2 text-gray-500">
              You don't have any upcoming events where you're an organizer.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onSelectEvent(event)}
              >
                <div className="p-5">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2 line-clamp-2">
                    {event.title}
                  </h2>
                  
                  <div className="flex items-start mt-4 text-gray-600">
                    <Calendar className="w-5 h-5 mr-2 flex-shrink-0 text-indigo-500" />
                    <span>{formatDate(event.dateTime)}</span>
                  </div>
                  
                  {event.venue && (
                    <div className="flex items-start mt-2 text-gray-600">
                      <MapPin className="w-5 h-5 mr-2 flex-shrink-0 text-indigo-500" />
                      <span className="line-clamp-1">{event.venue.name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center text-green-600">
                      <Users className="w-5 h-5 mr-1" />
                      <span className="font-medium">{event.going}</span>
                      <span className="ml-1 text-sm text-gray-500">going</span>
                    </div>
                    
                    <div className="flex items-center text-orange-500">
                      <Users className="w-5 h-5 mr-1" />
                      <span className="font-medium">{event.waitlist}</span>
                      <span className="ml-1 text-sm text-gray-500">waitlist</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-indigo-50 px-5 py-3 text-center text-indigo-700 font-medium">
                  Select this event
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsScreen;