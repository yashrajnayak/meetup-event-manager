import React, { useState } from 'react';
import { ArrowLeft, Users, AlertCircle } from 'lucide-react';
import { MeetupEvent } from '../types';

interface MembersScreenProps {
  event: MeetupEvent;
  onBack: () => void;
  onSubmit: (urls: string[]) => void;
}

const MembersScreen: React.FC<MembersScreenProps> = ({ event, onBack, onSubmit }) => {
  const [memberUrls, setMemberUrls] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    if (!memberUrls.trim()) {
      setError('Please enter at least one member URL');
      return;
    }
    
    // Split by newline and filter empty lines
    const urls = memberUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);
    
    // Validate URLs
    const invalidUrls = urls.filter(url => !url.includes('meetup.com/members/'));
    
    if (invalidUrls.length > 0) {
      setError(`Some URLs are invalid. Please ensure all URLs are in the format: https://www.meetup.com/members/123456789/`);
      return;
    }
    
    // Submit valid URLs
    onSubmit(urls);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center text-indigo-600 mb-6 hover:text-indigo-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to events
        </button>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            <div className="flex items-center mt-2 text-gray-600">
              <Users className="w-5 h-5 mr-2 text-indigo-500" />
              <span>{event.waitlist} members on waitlist</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <label htmlFor="memberUrls" className="block text-sm font-medium text-gray-700 mb-2">
                Paste Meetup Profile URLs (one per line)
              </label>
              <textarea
                id="memberUrls"
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="https://www.meetup.com/members/123456789/&#10;https://www.meetup.com/members/987654321/"
                value={memberUrls}
                onChange={(e) => {
                  setMemberUrls(e.target.value);
                  setError(null);
                }}
              />
              <p className="mt-2 text-sm text-gray-500">
                Enter one Meetup profile URL per line. We'll check if these members are on the waitlist.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Check Members
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MembersScreen;