import React, { useEffect, useState } from 'react';
import { Loader, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { MeetupEvent, MeetupMember } from '../types';
import { extractMemberId, checkMemberStatus, getMemberDetails } from '../utils/api';

interface ProcessingScreenProps {
  accessToken: string;
  event: MeetupEvent;
  memberUrls: string[];
  onComplete: (members: MeetupMember[]) => void;
  onBack: () => void;
}

const ProcessingScreen: React.FC<ProcessingScreenProps> = ({
  accessToken,
  event,
  memberUrls,
  onComplete,
  onBack,
}) => {
  const [processedCount, setProcessedCount] = useState(0);
  const [members, setMembers] = useState<MeetupMember[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processMembers = async () => {
      try {
        const processedMembers: MeetupMember[] = [];
        
        for (let i = 0; i < memberUrls.length; i++) {
          const url = memberUrls[i];
          const memberId = extractMemberId(url);
          
          if (!memberId) {
            processedMembers.push({
              id: `invalid-${i}`,
              name: 'Invalid URL',
              profileUrl: url,
              status: 'not_found',
            });
            setProcessedCount(i + 1);
            continue;
          }
          
          // Get member details
          const details = await getMemberDetails(accessToken, memberId);
          
          // Check member status
          const status = await checkMemberStatus(accessToken, event.id, memberId);
          
          processedMembers.push({
            id: memberId,
            name: details?.name || 'Unknown Member',
            profileUrl: url,
            photo: details?.photo,
            status,
          });
          
          setProcessedCount(i + 1);
        }
        
        setMembers(processedMembers);
        onComplete(processedMembers);
      } catch (err) {
        setError('An error occurred while processing members. Please try again.');
        console.error(err);
      }
    };
    
    processMembers();
  }, [accessToken, event.id, memberUrls, onComplete]);

  const progress = memberUrls.length > 0 
    ? Math.round((processedCount / memberUrls.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center text-indigo-600 mb-6 hover:text-indigo-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to member selection
        </button>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Processing Members</h1>
            <p className="mt-2 text-gray-600">
              Checking {memberUrls.length} members for event: {event.title}
            </p>
          </div>

          <div className="p-6">
            {error ? (
              <div className="p-4 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Processing: {processedCount} of {memberUrls.length}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center p-3 border border-gray-200 rounded-md">
                      {member.photo ? (
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="w-10 h-10 rounded-full mr-3"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                          <span className="text-gray-500 text-sm">{member.name.charAt(0)}</span>
                        </div>
                      )}
                      
                      <div className="flex-grow">
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-gray-500 truncate">{member.profileUrl}</div>
                      </div>
                      
                      {member.status === 'waitlist' ? (
                        <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                          Waitlist
                        </span>
                      ) : member.status === 'going' ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Going
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          Not Found
                        </span>
                      )}
                    </div>
                  ))}
                  
                  {processedCount < memberUrls.length && (
                    <div className="flex items-center justify-center p-4">
                      <Loader className="w-6 h-6 text-indigo-600 animate-spin mr-2" />
                      <span>Processing...</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingScreen;