import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Room } from "../types/Room";

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
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    let socketInstance: Socket;

    const initializeSocket = async () => {
      try {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
        if (!socketUrl) {
          throw new Error(
            "NEXT_PUBLIC_SOCKET_URL environment variable is not set"
          );
        }

        console.log(`Connecting to socket server at: ${socketUrl}`);

        socketInstance = io(socketUrl, {
          path: "/socket.io/",
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          randomizationFactor: 0.5,
          timeout: 30000,
          autoConnect: true,
          forceNew: true,
          withCredentials: false,
        });

        setSocket(socketInstance);

        socketInstance.on("connect", () => {
          console.log("Socket connected successfully");
          setError("");
        });

        socketInstance.on("connect_error", (err) => {
          console.error("Socket connection error:", err);
          setError("Failed to connect to server. Please try again later.");
        });

        socketInstance.on("disconnect", (reason: string) => {
          console.log("Socket disconnected:", reason);
          if (reason === "io server disconnect") {
            setError(
              "Server connection lost. Please check your internet connection."
            );
          }
        });

        socketInstance.on("error", (err) => {
          console.error("Socket error:", err);
          setError(
            "An error occurred with the connection. Please try again later."
          );
        });

        socketInstance.on("reconnect", (attemptNumber) => {
          console.log(`Reconnected after ${attemptNumber} attempts`);
          setError("");
        });

        socketInstance.on("reconnect_error", (err) => {
          console.error("Reconnection error:", err);
          setError("Failed to reconnect to server. Please try again later.");
        });

        socketInstance.on("reconnect_failed", () => {
          console.error("Failed to reconnect after all attempts");
          setError("Failed to reconnect to server. Please refresh the page.");
        });

        socketInstance.onAny((event: string, ...args: any[]) => {
          console.log(`Socket event: ${event}`, args);
        });

        socketInstance.on("room-created", (createdRoom: Room) => {
          console.log("Room created:", createdRoom);
          setRoom(createdRoom);
          setError("");
        });

        socketInstance.on("room-join-error", (errorMessage: string) => {
          console.error("Room join error:", errorMessage);
          setError(errorMessage);
        });

        socketInstance.on(
          "vote-update",
          (updatedVotes: Record<string, number>) => {
            console.log("Vote update received:", updatedVotes);
            setRoom((prevRoom) => {
              if (prevRoom) {
                return {
                  ...prevRoom,
                  votes: updatedVotes,
                };
              }
              return prevRoom;
            });
          }
        );

        socketInstance.on("timer-update", (remainingTime: number) => {
          setTimeRemaining(remainingTime);
        });

        socketInstance.on("voting-ended", () => {
          setTimeRemaining(0);
        });
      } catch (err: any) {
        console.error("Failed to initialize socket:", err);
        setError(`Failed to initialize socket: ${err.message}`);
      }
    };

    initializeSocket();

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance.offAny();
        socketInstance.removeAllListeners();
      }
    };
  }, []);

  return { socket, error, room, timeRemaining, setRoom, setError };
};
