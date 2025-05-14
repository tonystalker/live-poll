const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3001;

const devOrigin = "http://localhost:3000";
const prodOrigin = process.env.VERCEL_URL || "*";

const corsOptions = {
  origin: process.env.NODE_ENV === "production" ? prodOrigin : devOrigin,
  methods: ["GET", "POST", "OPTIONS"],
  credentials: false,
};
app.use(cors(corsOptions));

const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions,
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 20000,
  pingInterval: 15000,
  cookie: false,
  path: "/socket.io/",
  serveClient: false,
  connectTimeout: 45000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e8,
  handlePreflightRequest: (req, res) => {
    const headers = {
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin":
        process.env.NODE_ENV === "production" ? prodOrigin : devOrigin,
      "Access-Control-Allow-Credentials": false,
    };
    res.writeHead(200, headers);
    res.end();
  },
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
      duration: 60000, // 60 seconds
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
    console.log("Client disconnected");
  });
});

if (process.env.NODE_ENV !== "production") {
  server.listen(PORT, () => {
    console.log(`Server running locally on port ${PORT}`);
  });
}

module.exports = (req, res) => {
  if (req.url === "/api/health") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({ status: "ok", timestamp: new Date().toISOString() })
    );
  } else {
    server.emit("request", req, res);
  }
};

server.on("error", (error) => {
  console.error("Server error:", error);
});
