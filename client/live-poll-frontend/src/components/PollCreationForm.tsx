import React, { useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface PollCreationFormProps {
  socket: Socket | null;
  username: string;
  setUsername: (username: string) => void;
  setError: (error: string) => void;
}

const PollCreationForm: React.FC<PollCreationFormProps> = ({ 
  socket, 
  username, 
  setUsername, 
  setError 
}) => {
  const [pollQuestion, setPollQuestion] = useState<string>('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [roomCode, setRoomCode] = useState<string>('');

  const handleOptionChange = useCallback((index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);

    if (index === newOptions.length - 1 && value.trim() !== '') {
      setPollOptions([...newOptions, '']);
    }
  }, [pollOptions]);

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
  }, [socket, username, pollQuestion, pollOptions, setError]);

  const joinRoom = useCallback(() => {
    if (!socket || !roomCode || !username) {
      setError('Please provide a room code and username');
      return;
    }

    socket.emit('join-room', roomCode, username);
  }, [socket, roomCode, username, setError]);

  return (
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
  );
};

export default PollCreationForm;
