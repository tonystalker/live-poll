'use client';

import React, { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import ConnectionStatus from '../components/ConnectionStatus';
import PollCreationForm from '../components/PollCreationForm';
import PollDisplay from '../components/PollDisplay';

export default function Home(): React.JSX.Element {
  const { socket, error, room, timeRemaining, setRoom, setError } = useSocket();
  const [username, setUsername] = useState<string>('');
  const [vote, setVote] = useState<string>('');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
        <ConnectionStatus socket={socket} error={error} />
        
        {!room ? (
          <PollCreationForm 
            socket={socket} 
            username={username} 
            setUsername={setUsername} 
            setError={setError} 
          />
        ) : (
          <PollDisplay 
            socket={socket} 
            room={room} 
            username={username} 
            vote={vote} 
            setVote={setVote} 
            timeRemaining={timeRemaining} 
            setRoom={setRoom} 
          />
        )}
      </div>
    </main>
  );
}
