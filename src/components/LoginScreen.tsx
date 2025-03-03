import React from 'react';
import { Users, Calendar, ArrowRight } from 'lucide-react';
import { loginWithMeetup } from '../utils/auth';

const LoginScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <div className="flex justify-center">
            <Calendar className="w-16 h-16 text-indigo-600" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold text-gray-900">Meetup Event Manager</h1>
          <p className="mt-2 text-gray-600">
            Manage your event waitlists with ease
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center p-3 bg-indigo-50 rounded-lg">
              <Calendar className="w-5 h-5 text-indigo-600 mr-3" />
              <p className="text-sm text-gray-700">Select from your organized events</p>
            </div>
            
            <div className="flex items-center p-3 bg-indigo-50 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600 mr-3" />
              <p className="text-sm text-gray-700">Manage waitlist members with ease</p>
            </div>
            
            <div className="flex items-center p-3 bg-indigo-50 rounded-lg">
              <ArrowRight className="w-5 h-5 text-indigo-600 mr-3" />
              <p className="text-sm text-gray-700">Move members from waitlist to going</p>
            </div>
          </div>

          <button
            onClick={loginWithMeetup}
            className="w-full flex items-center justify-center px-4 py-3 text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.978 11.982c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 6.627 5.373 12 12 12s12-5.373 12-12zm-12 10.5c-5.79 0-10.5-4.71-10.5-10.5s4.71-10.5 10.5-10.5 10.5 4.71 10.5 10.5-4.71 10.5-10.5 10.5zm-2.625-10.5c0 1.45-1.175 2.625-2.625 2.625s-2.625-1.175-2.625-2.625 1.175-2.625 2.625-2.625 2.625 1.175 2.625 2.625zm10.5 0c0 1.45-1.175 2.625-2.625 2.625s-2.625-1.175-2.625-2.625 1.175-2.625 2.625-2.625 2.625 1.175 2.625 2.625z" />
            </svg>
            Login with Meetup
          </button>
        </div>

        <p className="text-xs text-center text-gray-500 mt-8">
          This app uses the Meetup API to help you manage your events.
          <br />Your data is not stored on our servers.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;