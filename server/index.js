const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
// Allow all origins in development, or specific origins in production
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL, 'https://live-poll-frontend.vercel.app']
    : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://127.0.0.1:3000', 'http://127.0.0.1:3002', 'http://127.0.0.1:3003', 'http://127.0.0.1:3004'];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            console.log(`Origin ${origin} not allowed by CORS`);
            // Allow all origins in development
            if (process.env.NODE_ENV !== 'production') {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true
}));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: function(origin, callback) {
            // Allow requests with no origin (like mobile apps, curl, etc)
            if (!origin) return callback(null, true);
            
            if (allowedOrigins.indexOf(origin) === -1) {
                console.log(`Socket origin ${origin} not allowed by CORS`);
                // Allow all origins in development
                if (process.env.NODE_ENV !== 'production') {
                    return callback(null, true);
                }
                return callback(new Error('Not allowed by CORS'), false);
            }
            return callback(null, true);
        },
        methods: ['GET', 'POST'],
        credentials: true
    },
    // Serverless-friendly settings
    transports: ['polling'],
    allowEIO3: true,
    pingTimeout: 30000,
    pingInterval: 25000,
    cookie: false
});

// In-memory storage for poll rooms
const pollRooms = new Map();
const roomTimers = new Map();

io.on('connection', (socket) => {
    console.log('New client connected');

    // Create a new poll room
    socket.on('create-room', (username, question, options) => {
        console.log('Create room request received', { username, question, options });
        if (!username || !question || !options || options.length < 2) {
            console.log('Create room validation failed', { username, question, options });
            socket.emit('error', 'Username, question, and at least two options are required');
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
            question: question,
            options: options,
            votes: initialVotes,
            voters: new Set(),
            startTime: Date.now(),
            duration: 60000 // 60 seconds
        };
        pollRooms.set(roomCode, room);
        socket.join(roomCode);
        socket.emit('room-created', room);
        console.log(`Room ${roomCode} created by ${username} with question: ${question}`);

        // Start timer for the room
        const timer = setInterval(() => {
            const currentTime = Date.now();
            const timeElapsed = currentTime - room.startTime;
            const timeRemaining = Math.max(0, Math.floor((room.duration - timeElapsed) / 1000));

            // Broadcast remaining time to all users in the room
            io.to(roomCode).emit('timer-update', timeRemaining);

            // Stop timer when time is up
            if (timeRemaining === 0) {
                clearInterval(timer);
                roomTimers.delete(roomCode);
                io.to(roomCode).emit('voting-ended');
            }
        }, 1000);

        // Store the timer for potential cleanup
        roomTimers.set(roomCode, timer);
    });

    // Join an existing poll room
    socket.on('join-room', (roomCode, username) => {
        if (!roomCode || !username) {
            socket.emit('room-join-error', 'Room code and username are required');
            return;
        }

        const room = pollRooms.get(roomCode);
        if (room) {
            socket.join(roomCode);
            socket.emit('room-created', room);
            console.log(`${username} joined room ${roomCode}`);
        } else {
            socket.emit('room-join-error', 'Room not found');
        }
    });

    // Handle voting
    socket.on('vote', (roomCode, username, vote) => {
        console.log(`Vote received - Room: ${roomCode}, User: ${username}, Vote: ${vote}`);
        
        if (!roomCode || !username || !vote) {
            console.error('Invalid vote parameters:', { roomCode, username, vote });
            socket.emit('error', 'Invalid vote parameters');
            return;
        }

        const room = pollRooms.get(roomCode);
        if (room) {
            console.log(`Room found: ${roomCode}`);
            console.log('Current votes:', room.votes);
            
            // Check if voting is still open
            const currentTime = Date.now();
            const timeElapsed = currentTime - room.startTime;
            console.log(`Time elapsed: ${timeElapsed}ms, Duration: ${room.duration}ms`);
            
            if (timeElapsed > room.duration) {
                console.log('Voting has ended');
                socket.emit('error', 'Voting has ended');
                return;
            }

            // Check if user has already voted
            if (room.voters.has(username)) {
                console.log(`User ${username} has already voted`);
                socket.emit('error', 'You have already voted');
                return;
            }

            // Validate vote option
            if (!room.options.includes(vote)) {
                console.log(`Invalid vote option: ${vote}`);
                socket.emit('error', 'Invalid vote option');
                return;
            }

            // Record the vote
            room.votes[vote]++;
            room.voters.add(username);
            console.log('Updated votes:', room.votes);

            // Broadcast updated vote counts to all users in the room
            console.log('Broadcasting vote update to room');
            io.to(roomCode).emit('vote-update', room.votes);
            console.log(`${username} voted for ${vote} in room ${roomCode}`);
        } else {
            console.error(`Room not found: ${roomCode}`);
            socket.emit('error', 'Room not found');
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export for serverless functions
module.exports = server;

// Error handling
server.on('error', (error) => {
    console.error('Server error:', error);
});
