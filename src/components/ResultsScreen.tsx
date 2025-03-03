import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, ArrowLeft, RefreshCw, Home } from 'lucide-react';
import { MeetupEvent, MeetupMember } from '../types';
import { changeRsvpStatus } from '../utils/api';

interface ResultsScreenProps {
  accessToken: string;
  event: MeetupEvent;
  members: MeetupMember[];
  onBack: () => void;
  onReset: () => void;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({
  accessToken,
  event,
  members,
  onBack,
  onReset,
}) => {
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [results, setResults] = useState<{
    success: MeetupMember[];
    failed: MeetupMember[];
  }>({
    success: [],
    failed: [],
  });

  const waitlistMembers = members.filter(member => member.status === 'waitlist');
  const nonWaitlistMembers = members.filter(member => member.status !== 'waitlist');

  const handleProcessWaitlist = async () => {
    setProcessing(true);
    
    const successMembers: MeetupMember[] = [];
    const failedMembers: MeetupMember[] = [];
    
    for (const member of waitlistMembers) {
      try {
        const success = await changeRsvpStatus(accessToken, event.id, member.id);
        
        if (success) {
          successMembers.push(member);
        } else {
          failedMembers.push(member);
        }
      } catch (error) {
        console.error(`Error processing member ${member.id}:`, error);
        failedMembers.push(member);
      }
    }
    
    setResults({
      success: successMembers,
      failed: failedMembers,
    });
    
    setProcessing(false);
    setProcessed(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center text-indigo-600 mb-6 hover:text-indigo-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to processing
        </button>

        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Results</h1>
            <p className="mt-2 text-gray-600">
              Event: {event.title}
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center text-green-700 mb-2">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Waitlist Members</span>
                </div>
                <p className="text-2xl font-bold text-green-800">{waitlistMembers.length}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center text-gray-700 mb-2">
                  <XCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Not on Waitlist</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{nonWaitlistMembers.length}</p>
              </div>
            </div>

            {!processed && (
              <div className="mb-6">
                <button
                  onClick={handleProcessWaitlist}
                  disabled={processing || waitlistMembers.length === 0}
                  className={`w-full py-3 px-4 rounded-md flex items-center justify-center ${
                    waitlistMembers.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Move Waitlist Members to Going'
                  )}
                </button>
                
                {waitlistMembers.length === 0 && (
                  <p className="text-sm text-center text-gray-500 mt-2">
                    No members on the waitlist to process
                  </p>
                )}
              </div>
            )}

            {processed && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center text-green-700 mb-2">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span className="font-medium">Success</span>
                    </div>
                    <p className="text-2xl font-bold text-green-800">{results.success.length}</p>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center text-red-700 mb-2">
                      <XCircle className="w-5 h-5 mr-2" />
                      <span className="font-medium">Failed</span>
                    </div>
                    <p className="text-2xl font-bold text-red-800">{results.failed.length}</p>
                  </div>
                </div>

                {results.success.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Successfully Moved to Going</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {results.success.map(member => (
                        <div key={member.id} className="flex items-center p-2 border border-green-200 rounded bg-green-50">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                          <span>{member.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.failed.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Failed to Move</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {results.failed.map(member => (
                        <div key={member.id} className="flex items-center p-2 border border-red-200 rounded bg-red-50">
                          <XCircle className="w-4 h-4 text-red-600 mr-2" />
                          <span>{member.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onReset}
            className="flex items-center px-4 py-2 text-indigo-600 hover:text-indigo-800"
          >
            <Home className="w-4 h-4 mr-2" />
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;