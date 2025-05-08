'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Room {
  code: string;
  creator: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  startTime: number;
  duration: number;
}

export default function Home(): React.JSX.Element {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [username, setUsername] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [room, setRoom] = useState<Room | null>(null);
  const [vote, setVote] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [error, setError] = useState<string>('');

  // New state for poll creation
  const [pollQuestion, setPollQuestion] = useState<string>('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  useEffect(() => {
    // Ensure this only runs on client side
    if (typeof window !== 'undefined') {
      console.log('Initializing socket connection...');
      // Use environment variable for socket URL to support deployment
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
      console.log(`Connecting to socket server at: ${socketUrl}`);
      
      const newSocket = io(socketUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
        withCredentials: false // Changed to false to avoid CORS issues
      });
      
      // Add more detailed connection logging
      console.log('Socket connection options:', {
        url: socketUrl,
        transports: ['websocket', 'polling'],
        reconnection: true
      });

      newSocket.on('connect', () => {
        console.log('Socket connected successfully');
        setSocket(newSocket);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setError(`Connection failed: ${error.message}`);
      });

      newSocket.on('disconnect', (reason) => {
        console.warn('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // the disconnection was initiated by the server, reconnect manually
          newSocket.connect();
        }
      });

      newSocket.on('room-created', (createdRoom: Room) => {
        console.log('Room created:', createdRoom);
        setRoom(createdRoom);
        setError('');
        setVote('');
      });

      newSocket.on('room-join-error', (errorMessage: string) => {
        console.error('Room join error:', errorMessage);
        setError(errorMessage);
      });

      newSocket.on('vote-update', (updatedVotes: Record<string, number>) => {
        console.log('Vote update received:', updatedVotes);
        if (room) {
          console.log('Current room state before update:', room);
          
          // Only update if the votes have actually changed
          const currentVotesJSON = JSON.stringify(room.votes);
          const updatedVotesJSON = JSON.stringify(updatedVotes);
          
          if (currentVotesJSON !== updatedVotesJSON) {
            console.log('Votes have changed, updating state');
            // Create a completely new room object to ensure React detects the change
            const updatedRoom = {
              ...room,
              votes: { ...updatedVotes } // Create a new votes object
            };
            console.log('Updated room state:', updatedRoom);
            // Force a state update with the new room object
            setRoom(updatedRoom);
          } else {
            console.log('Votes unchanged, no update needed');
          }
        } else {
          console.warn('Received vote update but room is null');
        }
      });

      newSocket.on('timer-update', (remainingTime: number) => {
        setTimeRemaining(remainingTime);
      });

      newSocket.on('voting-ended', () => {
        setTimeRemaining(0);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, []);

  const createRoom = useCallback(() => {
    if (!socket || !username || !pollQuestion) {
      setError('Please provide a username and question');
      return;
    }

    const validOptions = pollOptions.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      setError('Please provide at least two options');
      return;
    }

    socket.emit('create-room', username, pollQuestion, validOptions);
  }, [socket, username, pollQuestion, pollOptions]);

  const joinRoom = useCallback(() => {
    if (!socket || !roomCode || !username) {
      setError('Please provide a room code and username');
      return;
    }

    socket.emit('join-room', roomCode, username);
  }, [socket, roomCode, username]);

  const submitVote = useCallback((selectedVote: string) => {
    if (!room || !socket || timeRemaining === 0 || vote) {
      console.log('Cannot submit vote:', { hasRoom: !!room, hasSocket: !!socket, timeRemaining, hasVoted: !!vote });
      return;
    }

    console.log(`Submitting vote for ${selectedVote} in room ${room.code}`);
    
    // Update local state immediately to provide instant feedback
    const updatedVotes = { ...room.votes };
    updatedVotes[selectedVote] = (updatedVotes[selectedVote] || 0) + 1;
    
    // Create a new room object with updated votes
    const updatedRoom = {
      ...room,
      votes: updatedVotes
    };
    
    // Update the room state with the new votes
    setRoom(updatedRoom);
    
    // Send the vote to the server
    socket.emit('vote', room.code, username, selectedVote);
    setVote(selectedVote);
  }, [room, socket, timeRemaining, vote, username]);

  const handleOptionChange = useCallback((index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);

    if (index === newOptions.length - 1 && value.trim() !== '') {
      setPollOptions([...newOptions, '']);
    }
  }, [pollOptions]);

  // Remove useCallback to ensure this recalculates on every render with latest room data
  const calculateVotePercentage = (option: string): number => {
    if (!room || !room.votes) {
      console.log('No room or votes available for calculation');
      return 0;
    }
    
    // Force convert vote values to numbers to ensure proper calculation
    const voteValues = Object.entries(room.votes).map(([key, value]) => {
      return [key, typeof value === 'number' ? value : parseInt(String(value), 10) || 0];
    });
    
    // Create a normalized votes object with numeric values
    const normalizedVotes: Record<string, number> = Object.fromEntries(voteValues);
    console.log('Normalized votes:', normalizedVotes);
    
    // Calculate total votes from the normalized values
    const totalVotes = Object.values(normalizedVotes).reduce((a: number, b: number) => a + b, 0);
    console.log(`Total votes: ${totalVotes}`);
    
    // Get the votes for this option, ensuring it's a number
    const optionVotes = normalizedVotes[option] || 0;
    console.log(`Votes for ${option}: ${optionVotes}`);
    
    // Calculate percentage
    const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
    console.log(`Percentage for ${option}: ${percentage}%`);
    
    return percentage;
  };

  // Add debug information to help troubleshoot
  const connectionStatus = socket ? 'Connected' : 'Disconnected';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
        <div className="text-sm text-gray-500 mb-2">Socket Status: {connectionStatus}</div>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        
        {/* Always render the form if there's no room */}
        {!room ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Poll Question"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Poll Options</h3>
              {pollOptions.map((option, index) => (
                <input
                  key={index}
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  className="w-full p-2 border rounded"
                />
              ))}
            </div>
            <div className="flex space-x-4">
              <button
                onClick={createRoom}
                disabled={!username || !pollQuestion || pollOptions.filter(opt => opt.trim() !== '').length < 2}
                className="flex-1 p-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                Create Room
              </button>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Room Code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className="p-2 border rounded"
                />
                <button
                  onClick={joinRoom}
                  disabled={!roomCode || !username}
                  className="p-2 bg-green-500 text-white rounded disabled:opacity-50"
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 text-center">
              <h2 className="text-xl font-bold">{room.question}</h2>
              <p className="text-gray-600">Room Code: {room.code}</p>
              <p className="text-gray-600">Time Remaining: {timeRemaining} seconds</p>
            </div>

            <div className="space-y-4">
              {room.options.map((option) => (
                <div 
                  key={option}
                  className={`
                    relative w-full py-3 px-4 rounded 
                    ${vote === option ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-100'}
                    ${timeRemaining === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-200'}
                  `}
                  onClick={() => timeRemaining > 0 && !vote && submitVote(option)}
                >
                  <div className="flex justify-between items-center">
                    <span>{option}</span>
                    <span data-testid={`percentage-${option}`} className="font-bold">
                      {/* Force recalculation on every render */}
                      {calculateVotePercentage(option)}%
                    </span>
                  </div>
                  <div 
                    className="absolute bottom-0 left-0 h-1 bg-blue-500" 
                    style={{ 
                      width: `${calculateVotePercentage(option)}%`,
                      transition: 'width 0.5s ease-in-out' // Add smooth transition
                    }}
                  />
                </div>
              ))}
            </div>

            {vote && (
              <p className="mt-4 text-center text-green-600">
                You voted for {vote}
              </p>
            )}

            {timeRemaining === 0 && (
              <p className="mt-4 text-center text-red-600">
                Voting has ended
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
