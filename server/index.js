const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

const devOrigin = "http://localhost:3000";
const prodOrigin = process.env.VERCEL_URL
  ? [`https://${process.env.VERCEL_URL}`, "https://*.vercel.app"]
  : "*";

const corsOptions = {
  origin: process.env.NODE_ENV === "production" ? prodOrigin : devOrigin,
  methods: ["GET", "POST", "OPTIONS"],
  credentials: false,
};
app.use(cors(corsOptions));

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? prodOrigin : devOrigin,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: false,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 20000,
  pingInterval: 15000,
  path: "/socket.io/",
});

const pollRooms = new Map();
const roomTimers = new Map();

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("create-room", (username, question, options) => {
    if (!username || !question || options.length < 2) {
      socket.emit(
        "error",
        "Username, question, and at least two options are required"
      );
      return;
    }

    const roomCode = uuidv4().slice(0, 6).toUpperCase();
    const initialVotes = options.reduce((acc, option) => {
      acc[option] = 0;
      return acc;
    }, {});

    const room = {
      code: roomCode,
      creator: username,
      question,
      options,
      votes: initialVotes,
      voters: new Set(),
      startTime: Date.now(),
      duration: 60000,
    };

    pollRooms.set(roomCode, room);
    socket.join(roomCode);
    socket.emit("room-created", room);

    const timer = setInterval(() => {
      const timeRemaining = Math.max(
        0,
        Math.floor((room.duration - (Date.now() - room.startTime)) / 1000)
      );
      io.to(roomCode).emit("timer-update", timeRemaining);

      if (timeRemaining === 0) {
        clearInterval(timer);
        roomTimers.delete(roomCode);
        io.to(roomCode).emit("voting-ended");
      }
    }, 1000);

    roomTimers.set(roomCode, timer);
  });

  socket.on("join-room", (roomCode, username) => {
    const room = pollRooms.get(roomCode);
    if (room) {
      socket.join(roomCode);
      socket.emit("room-created", room);
    } else {
      socket.emit("room-join-error", "Room not found");
    }
  });

  socket.on("vote", (roomCode, username, vote) => {
    const room = pollRooms.get(roomCode);
    if (!room) return socket.emit("error", "Room not found");

    if (Date.now() - room.startTime > room.duration) {
      return socket.emit("error", "Voting has ended");
    }

    if (room.voters.has(username)) {
      return socket.emit("error", "You have already voted");
    }

    if (!room.options.includes(vote)) {
      return socket.emit("error", "Invalid vote option");
    }

    room.votes[vote]++;
    room.voters.add(username);

    io.to(roomCode).emit("vote-update", room.votes);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy" });
});

module.exports = app;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

server.on("error", (error) => {
  console.error("Server error:", error);
});
