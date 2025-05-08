import React, { useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { Room } from '../types/Room';

interface PollDisplayProps {
  socket: Socket | null;
  room: Room;
  username: string;
  vote: string;
  setVote: (vote: string) => void;
  timeRemaining: number;
  setRoom: React.Dispatch<React.SetStateAction<Room | null>>;
}

const PollDisplay: React.FC<PollDisplayProps> = ({
  socket,
  room,
  username,
  vote,
  setVote,
  timeRemaining,
  setRoom
}) => {
  const calculateVotePercentage = (option: string): number => {
    if (!room || !room.votes) {
      console.log('No room or votes available for calculation');
      return 0;
    }
    

    const voteValues = Object.entries(room.votes).map(([key, value]) => {
      return [key, typeof value === 'number' ? value : parseInt(String(value), 10) || 0];
    });
    

    const normalizedVotes: Record<string, number> = Object.fromEntries(voteValues);
    console.log('Normalized votes:', normalizedVotes);
    

    const totalVotes = Object.values(normalizedVotes).reduce((a: number, b: number) => a + b, 0);
    console.log(`Total votes: ${totalVotes}`);
    

    const optionVotes = normalizedVotes[option] || 0;
    console.log(`Votes for ${option}: ${optionVotes}`);
    

    const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
    console.log(`Percentage for ${option}: ${percentage}%`);
    
    return percentage;
  };

  const submitVote = useCallback((selectedVote: string) => {
    if (!room || !socket || timeRemaining === 0 || vote) {
      console.log('Cannot submit vote:', { hasRoom: !!room, hasSocket: !!socket, timeRemaining, hasVoted: !!vote });
      return;
    }

    console.log(`Submitting vote for ${selectedVote} in room ${room.code}`);
    

    const updatedVotes = { ...room.votes };
    updatedVotes[selectedVote] = (updatedVotes[selectedVote] || 0) + 1;
    

    const updatedRoom = {
      ...room,
      votes: updatedVotes
    };
    

    setRoom(updatedRoom);
    

    socket.emit('vote', room.code, username, selectedVote);
    setVote(selectedVote);
  }, [room, socket, timeRemaining, vote, username, setRoom, setVote]);

  return (
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
            onClick={() => !vote && submitVote(option)}
            className={`p-3 border rounded cursor-pointer transition-all duration-300 ${
              vote === option ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex justify-between items-center">
              <span>{option}</span>
              <span data-testid={`percentage-${option}`} className="font-bold">
                {calculateVotePercentage(option)}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${calculateVotePercentage(option)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PollDisplay;
