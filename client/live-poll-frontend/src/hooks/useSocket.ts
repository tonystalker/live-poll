import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Room } from '../types/Room';

interface UseSocketReturn {
  socket: Socket | null;
  error: string;
  room: Room | null;
  timeRemaining: number;
  setRoom: React.Dispatch<React.SetStateAction<Room | null>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
}

export const useSocket = (): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Initializing socket connection...');
      try {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
        console.log(`Connecting to socket server at: ${socketUrl}`);
        
        const socketInstance = io(socketUrl, {
          path: '/socket.io',
          transports: ['polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000,
          autoConnect: true,
          forceNew: true,
          withCredentials: false,
          extraHeaders: {
            'Access-Control-Allow-Origin': '*'
          }
        });
        
        console.log('Socket connection options:', {
          url: socketUrl,
          transports: ['polling'],
          reconnection: true
        });
        
        socketInstance.onAny((event: string, ...args: any[]) => {
          console.log(`Socket event: ${event}`, args);
        });
        
        socketInstance.on('connect', () => {
          console.log('Socket connected successfully');
          setSocket(socketInstance);
        });

        socketInstance.on('connect_error', (error: Error) => {
          console.error('Socket connection error:', error);
          setError(`Connection failed: ${error.message}`);
        });

        socketInstance.on('disconnect', (reason: string) => {
          console.warn('Socket disconnected:', reason);
          if (reason === 'io server disconnect') {
            socketInstance.connect();
          }
        });

        socketInstance.on('room-created', (createdRoom: Room) => {
          console.log('Room created:', createdRoom);
          setRoom(createdRoom);
          setError('');
        });

        socketInstance.on('room-join-error', (errorMessage: string) => {
          console.error('Room join error:', errorMessage);
          setError(errorMessage);
        });
        
        socketInstance.on('vote-update', (updatedVotes: Record<string, number>) => {
          console.log('Vote update received:', updatedVotes);
          if (room) {
            console.log('Current room state before update:', room);
            

            const currentVotesJSON = JSON.stringify(room.votes);
            const updatedVotesJSON = JSON.stringify(updatedVotes);
            
            if (currentVotesJSON !== updatedVotesJSON) {
              console.log('Votes have changed, updating state');

              const updatedRoom = {
                ...room,
                votes: { ...updatedVotes }
              };
              console.log('Updated room state:', updatedRoom);

              setRoom(updatedRoom);
            } else {
              console.log('Votes unchanged, no update needed');
            }
          } else {
            console.warn('Received vote update but room is null');
          }
        });

        socketInstance.on('timer-update', (remainingTime: number) => {
          setTimeRemaining(remainingTime);
        });

        socketInstance.on('voting-ended', () => {
          setTimeRemaining(0);
        });

        setSocket(socketInstance);
        
        return () => {
          socketInstance.disconnect();
        };
      } catch (error: any) {
        console.error('Error initializing socket:', error);
        setError(`Failed to initialize socket: ${error.message}`);
      }
      return undefined;
    }
  }, []);

  return { socket, error, room, timeRemaining, setRoom, setError };
};
