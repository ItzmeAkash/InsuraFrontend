import React, { useState, useEffect } from 'react';
import {
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  RoomContext,
  useRoom,
} from '@livekit/components-react';
import { Room, Track, ConnectionState, RoomEvent } from 'livekit-client';
import '@livekit/components-styles';
import axiosInstance from '../../axiosInstance';

const serverUrl = 'wss://insurance-7lq0ue9t.livekit.cloud';

// Generate random string for room and name
const generateRandomString = (length = 8) => {
  return Math.random().toString(36).substring(2, length + 2);
};

const getToken = async () => {
  try {
    // Generate random room name and name for each request
    const randomRoom = `room-${generateRandomString(10)}`;
    const randomName = `user-${generateRandomString(8)}`;
    const identity = 'user';

    const response = await axiosInstance.post('/getToken', {
      room: randomRoom,
      name: randomName,
      identity: identity,
    });
    
    console.log('Token response:', response.data);
    const token = response.data.token || response.data.access_token || response.data;
    
    if (!token) {
      throw new Error('Token not found in response');
    }
    
    return token;
  } catch (error) {
    console.error('Error fetching LiveKit token:', error);
    throw new Error(`Failed to get token: ${error.message}`);
  }
};

const AgentVideoComponent = () => {
  const [room] = useState(() => new Room({
    // Optimize video quality for each participant's screen
    adaptiveStream: true,
    // Enable automatic audio/video quality optimization
    dynacast: true,
  }));
  const [connectionState, setConnectionState] = useState(ConnectionState.Disconnected);
  const [error, setError] = useState(null);
  const [isDisconnected, setIsDisconnected] = useState(false);

  // Reconnect function
  const handleReconnect = async () => {
    setIsDisconnected(false);
    setError(null);
    try {
      if (room.state === ConnectionState.Disconnected) {
        const token = await getToken();
        await room.connect(serverUrl, token);
        
        // Auto-enable microphone
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
          console.log('Microphone enabled');
        } catch (micErr) {
          console.error('Failed to enable microphone:', micErr);
        }
      }
    } catch (err) {
      console.error('Reconnection error:', err);
      setError(`Failed to reconnect: ${err.message}`);
    }
  };

  // Connect to room
  useEffect(() => {
    let mounted = true;
    
    const connect = async () => {
      try {
        if (mounted && room.state === ConnectionState.Disconnected) {
          // Set up connection state listener
          room.on(RoomEvent.ConnectionStateChanged, (state) => {
            if (mounted) {
              setConnectionState(state);
              // Reset disconnect flag when connected
              if (state === ConnectionState.Connected) {
                setIsDisconnected(false);
                setError(null);
              }
            }
          });

          // Set up disconnect listener
          room.on(RoomEvent.Disconnected, (reason) => {
            if (mounted) {
              console.log('Disconnected:', reason);
              // Don't show error for normal disconnects, just mark as disconnected
              // Only set error for unexpected connection failures
              const reasonStr = typeof reason === 'string' ? reason : (reason?.toString() || 'Unknown');
              if (reasonStr === 'CLIENT_INITIATED' || reasonStr === 'CLIENT_INITIATED_DISCONNECT') {
                setIsDisconnected(true);
              } else {
                // For other disconnects, also show the friendly message instead of error
                setIsDisconnected(true);
              }
            }
          });

          const token = await getToken();
          await room.connect(serverUrl, token);
          
          // Auto-enable microphone
          if (mounted) {
            try {
              await room.localParticipant.setMicrophoneEnabled(true);
              console.log('Microphone enabled');
            } catch (micErr) {
              console.error('Failed to enable microphone:', micErr);
              // We don't set a fatal error here because the user might be able to enable it manually later
              // or they might have denied permission intentionally.
            }
          }
        }
      } catch (err) {
        if (mounted) {
          console.error('Connection error:', err);
          setError(`Failed to connect: ${err.message}`);
        }
      }
    };
    
    connect();

    return () => {
      mounted = false;
      // Only disconnect if we're actually connected or connecting
      if (room.state === ConnectionState.Connected || room.state === ConnectionState.Connecting) {
        try {
          // Use a flag to indicate this is a cleanup disconnect
          room.disconnect().catch((err) => {
            // Silently handle disconnect errors during cleanup
            // These are expected when component unmounts
            if (err?.message && !err.message.includes('Client initiated disconnect')) {
              console.log('Cleanup disconnect error:', err);
            }
          });
        } catch (err) {
          // Handle synchronous errors
          if (err?.message && !err.message.includes('Client initiated disconnect')) {
            console.log('Cleanup disconnect error:', err);
          }
        }
      }
      // Remove event listeners to prevent memory leaks
      room.removeAllListeners();
    };
  }, [room]);

  // Ensure audio tracks are subscribed for interaction
  useEffect(() => {
    if (room.state === ConnectionState.Connected) {
      // Subscribe to all audio tracks from remote participants (agent)
      const subscribeToAudio = (participant) => {
        participant.audioTrackPublications.forEach((publication) => {
          if (publication.track && !publication.isSubscribed) {
            publication.setSubscribed(true);
          }
        });
      };

      // Subscribe to existing participants
      room.remoteParticipants.forEach(subscribeToAudio);

      // Listen for new participants joining
      const handleParticipantConnected = (participant) => {
        subscribeToAudio(participant);
      };

      // Listen for when audio tracks are published
      const handleTrackPublished = (publication, participant) => {
        if (publication.kind === 'audio' && publication.track && !publication.isSubscribed) {
          publication.setSubscribed(true);
        }
      };

      room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.on(RoomEvent.TrackPublished, handleTrackPublished);

      return () => {
        room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
        room.off(RoomEvent.TrackPublished, handleTrackPublished);
      };
    }
  }, [room, connectionState]);

  // Show friendly disconnect message or error
  if (isDisconnected && !error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-center p-8 max-w-md">
          <p className="text-2xl mb-4 font-semibold">Insura is waiting</p>
          <p className="text-lg mb-6 text-gray-300">
            Please click here to connect with Insura
          </p>
          <button
            onClick={handleReconnect}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
          >
            Connect with Insura
          </button>
        </div>
      </div>
    );
  }

  // Show error message if connection failed
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-xl text-center p-4">
          <p className="mb-2">Connection Error</p>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleReconnect}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <RoomContext.Provider value={room}>
      <div data-lk-theme="default" style={{ height: '100vh', position: 'relative' }}>
        {/* Agent-only video component */}
        <AgentOnlyVideoConference />
        {/* The RoomAudioRenderer takes care of room-wide audio for you. */}
        <RoomAudioRenderer />
        {/* Custom modern control bar */}
        <CustomControlBar room={room} />
      </div>
    </RoomContext.Provider>
  );
};

// Custom Control Bar Component
const CustomControlBar = ({ room }) => {
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Track connection state
  useEffect(() => {
    if (!room) return;

    const updateConnectionState = () => {
      setIsConnected(room.state === ConnectionState.Connected);
    };

    updateConnectionState();

    room.on(RoomEvent.ConnectionStateChanged, updateConnectionState);

    return () => {
      room.off(RoomEvent.ConnectionStateChanged, updateConnectionState);
    };
  }, [room]);

  // Track microphone state
  useEffect(() => {
    if (!room || room.state !== ConnectionState.Connected) return;

    const updateMicState = () => {
      const localParticipant = room.localParticipant;
      if (!localParticipant) {
        setIsMicEnabled(false);
        return;
      }
      
      // Check if microphone track exists and is not muted
      let micEnabled = false;
      for (const publication of localParticipant.audioTrackPublications.values()) {
        if (publication.track && !publication.isMuted) {
          micEnabled = true;
          break;
        }
      }
      setIsMicEnabled(micEnabled);
    };

    // Initial state
    updateMicState();

    // Listen for track changes
    const handleTrackPublished = (publication, participant) => {
      if (participant === room.localParticipant && publication.kind === 'audio') {
        updateMicState();
      }
    };
    
    const handleTrackUnpublished = (publication, participant) => {
      if (participant === room.localParticipant && publication.kind === 'audio') {
        updateMicState();
      }
    };
    
    const handleTrackMuted = (publication, participant) => {
      if (participant === room.localParticipant && publication.kind === 'audio') {
        updateMicState();
      }
    };
    
    const handleTrackUnmuted = (publication, participant) => {
      if (participant === room.localParticipant && publication.kind === 'audio') {
        updateMicState();
      }
    };

    room.on(RoomEvent.TrackPublished, handleTrackPublished);
    room.on(RoomEvent.TrackUnpublished, handleTrackUnpublished);
    room.on(RoomEvent.TrackMuted, handleTrackMuted);
    room.on(RoomEvent.TrackUnmuted, handleTrackUnmuted);

    return () => {
      room.off(RoomEvent.TrackPublished, handleTrackPublished);
      room.off(RoomEvent.TrackUnpublished, handleTrackUnpublished);
      room.off(RoomEvent.TrackMuted, handleTrackMuted);
      room.off(RoomEvent.TrackUnmuted, handleTrackUnmuted);
    };
  }, [room]);

  const toggleMicrophone = async () => {
    if (!room || room.state !== ConnectionState.Connected) return;
    try {
      // Get current microphone state
      let currentMicState = false;
      for (const publication of room.localParticipant.audioTrackPublications.values()) {
        if (publication.track && !publication.isMuted) {
          currentMicState = true;
          break;
        }
      }
      await room.localParticipant.setMicrophoneEnabled(!currentMicState);
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  };

  const handleLeave = () => {
    if (!room) return;
    room.disconnect();
  };

  if (!isConnected) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50">
      <style>{`
        .custom-control-bar {
          background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 70%, transparent 100%);
          backdrop-filter: blur(10px);
          padding: 20px 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin: 0;
        }
        .control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
          cursor: pointer;
          border: none;
          outline: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .control-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
        }
        .control-btn:active {
          transform: translateY(0);
        }
        .mic-btn {
          background: ${isMicEnabled 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
            : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'};
          color: white;
        }
        .mic-btn:hover {
          background: ${isMicEnabled 
            ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' 
            : 'linear-gradient(135deg, #4b5563 0%, #374151 100%)'};
        }
        .leave-btn {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }
        .leave-btn:hover {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        }
        .control-icon {
          width: 18px;
          height: 18px;
          display: inline-block;
        }
      `}</style>
      <div className="custom-control-bar">
        <button
          onClick={toggleMicrophone}
          className="control-btn mic-btn"
          aria-label={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          <svg
            className="control-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isMicEnabled ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            )}
          </svg>
          <span>{isMicEnabled ? 'Mute' : 'Unmute'}</span>
        </button>
        <button
          onClick={handleLeave}
          className="control-btn leave-btn"
          aria-label="Leave call"
        >
          <svg
            className="control-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>Leave</span>
        </button>
      </div>
    </div>
  );
};

const AgentOnlyVideoConference = () => {
  // Get all camera tracks
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
    ],
    { onlySubscribed: false },
  );

  // Filter to show only agent tracks (assuming agent has a specific identity or name)
  const agentTracks = tracks.filter(trackRef => {
    // You can customize this logic based on how you identify the agent
    // For example, if the agent has a specific name or identity
    const participantName = trackRef.participant?.name || '';
    const participantIdentity = trackRef.participant?.identity || '';
    
    return participantName === 'tavus-avatar-agent' || 
           participantIdentity === 'tavus-avatar-agent' ||
           participantName.includes('tavus-avatar-agent') ||
           participantIdentity.includes('tavus-avatar-agent');
  });

  // If no agent tracks found, show a loading or placeholder
  if (agentTracks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-white text-xl">
          Waiting for agent to join...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <style>{`
        /* Replace participant name with "Insura" */
        .lk-participant-name,
        [class*="participant-name"],
        [class*="ParticipantName"],
        [data-lk-participant-name],
        .lk-participant-tile [class*="name"],
        .lk-participant-tile [class*="Name"] {
          font-size: 0 !important;
          line-height: 0 !important;
          color: transparent !important;
        }
        .lk-participant-name::after,
        [class*="participant-name"]::after,
        [class*="ParticipantName"]::after,
        [data-lk-participant-name]::after,
        .lk-participant-tile [class*="name"]::after,
        .lk-participant-tile [class*="Name"]::after {
          content: "Insura" !important;
          font-size: 0.875rem !important;
          line-height: 1.25rem !important;
          display: block !important;
          color: white !important;
          position: relative !important;
        }
        /* Hide any child elements that might contain the original name */
        .lk-participant-name > *,
        [class*="participant-name"] > *,
        [class*="ParticipantName"] > *,
        [data-lk-participant-name] > * {
          display: none !important;
        }
      `}</style>
      <GridLayout 
        tracks={agentTracks} 
        style={{ height: '100vh' }}
      >
        {/* The GridLayout accepts zero or one child. The child is used
        as a template to render all passed in tracks. */}
        <ParticipantTile />
      </GridLayout>
    </div>
  );
};

export default AgentVideoComponent;
