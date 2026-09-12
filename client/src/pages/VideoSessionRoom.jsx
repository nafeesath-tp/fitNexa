import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { videoSessionsApi } from '../services/videoSessionsApi';
import { 
  LiveKitRoom, 
  VideoConference, 
  PreJoin,
  useLocalParticipant,
  RoomAudioRenderer,
  ControlBar
} from '@livekit/components-react';
import '@livekit/components-styles';

const SessionTimer = ({ startedAt }) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startedAt]);

  const mins = Math.floor(duration / 60).toString().padStart(2, '0');
  const secs = (duration % 60).toString().padStart(2, '0');
  
  return <div className="text-white font-mono text-xl">{mins}:{secs}</div>;
};

const VideoSessionRoom = () => {
  const { sessionId } = useParams();
  const { user, role } = useAuthStore();
  const navigate = useNavigate();

  const [preJoinComplete, setPreJoinComplete] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [connectionDetails, setConnectionDetails] = useState(null);
  const [error, setError] = useState(null);

  const isTrainer = role === 'TRAINER';

  const fetchSessionData = useCallback(async () => {
    try {
      const data = await videoSessionsApi.getSessionDetails(sessionId);
      setSessionInfo(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load session details.");
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  // If client and waiting, poll every 5 seconds until LIVE
  useEffect(() => {
    let interval;
    if (preJoinComplete && sessionInfo && sessionInfo.status !== 'LIVE' && sessionInfo.status !== 'ENDED' && !isTrainer) {
      interval = setInterval(() => {
        fetchSessionData();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [preJoinComplete, sessionInfo, isTrainer, fetchSessionData]);

  // When session is LIVE (or if trainer is ready to start), get the token
  useEffect(() => {
    // Don't reconnect if already connected
    if (connectionDetails) return;

    const connect = async () => {
      try {
        if (isTrainer && preJoinComplete && sessionInfo && sessionInfo.status !== 'ENDED') {
           // Trainer starts the session (idempotent on backend)
           await videoSessionsApi.startSession(sessionId);
           const tokenData = await videoSessionsApi.joinSession(sessionId);
           setConnectionDetails(tokenData);
           fetchSessionData(); // Refresh to get started_at
        } else if (!isTrainer && preJoinComplete && sessionInfo?.status === 'LIVE') {
           // Client joins after it's LIVE
           const tokenData = await videoSessionsApi.joinSession(sessionId);
           setConnectionDetails(tokenData);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to join session. You may not be authorized.");
      }
    };
    connect();
  }, [preJoinComplete, sessionInfo?.status, isTrainer, sessionId, fetchSessionData, connectionDetails]);

  const handleEndSession = async () => {
    if (window.confirm("Are you sure you want to end this session?")) {
      try {
        await videoSessionsApi.endSession(sessionId);
        navigate(isTrainer ? '/trainer/sessions' : '/client/booking');
      } catch (err) {
        console.error(err);
        alert("Failed to end session.");
      }
    }
  };

  const handleLeave = () => {
    navigate(isTrainer ? '/trainer/sessions' : '/client/booking');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 text-white">
        <div className="bg-red-500/10 border border-red-500 p-6 rounded-lg text-center">
          <p className="text-xl mb-4 text-red-500">{error}</p>
          <button onClick={() => navigate('/')} className="bg-white text-gray-900 px-4 py-2 rounded font-medium hover:bg-gray-200">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!sessionInfo) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading session...</div>;
  }

  if (sessionInfo.status === 'ENDED') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white p-4 text-center">
        <div>
          <h2 className="text-3xl font-bold mb-2">Session Ended</h2>
          <p className="text-gray-400 mb-6">This video session has concluded.</p>
          <button onClick={() => navigate(isTrainer ? '/trainer/sessions' : '/client/booking')} className="bg-primary text-white px-6 py-2 rounded font-medium hover:bg-primary-dark">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Phase 1: PreJoin
  if (!preJoinComplete) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Join Video Session</h1>
          <p className="text-gray-400">Configure your devices before entering.</p>
        </div>
        <div className="max-w-2xl w-full bg-gray-800 rounded-xl overflow-hidden shadow-2xl p-6 livekit-prejoin-wrapper">
           <PreJoin 
             onSubmit={(values) => {
               setPreJoinComplete(true);
             }}
             onValidate={(values) => true}
           />
        </div>
      </div>
    );
  }

  // Phase 2: Client waiting for Trainer
  if (!isTrainer && sessionInfo.status !== 'LIVE' && !connectionDetails) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
        <div className="animate-pulse mb-6">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Waiting for Trainer</h2>
        <p className="text-gray-400 max-w-md">The session hasn't started yet. We'll automatically connect you once the trainer joins.</p>
      </div>
    );
  }

  // Phase 3: Connected to Room
  if (connectionDetails) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Custom Header Overlay */}
        <div className="absolute top-0 left-0 w-full z-50 p-4 flex justify-between items-center pointer-events-none bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-4">
            <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
              LIVE
            </div>
            <div className="text-white font-medium">
              {sessionInfo.session_type} SESSION
            </div>
          </div>
          <div className="pointer-events-auto flex items-center gap-6">
            <SessionTimer startedAt={sessionInfo.started_at} />
            {isTrainer ? (
              <button 
                onClick={handleEndSession}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold shadow-lg transition-colors"
              >
                End Session
              </button>
            ) : (
              <button 
                onClick={handleLeave}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium shadow-lg transition-colors"
              >
                Leave
              </button>
            )}
          </div>
        </div>

        {/* LiveKit Components */}
        <LiveKitRoom
          video={true}
          audio={true}
          token={connectionDetails.token}
          serverUrl={connectionDetails.serverUrl || connectionDetails.server_url}
          onDisconnected={handleLeave}
          className="flex-1"
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    );
  }

  return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Connecting...</div>;
};

export default VideoSessionRoom;
