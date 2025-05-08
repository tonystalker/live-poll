const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();

const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['*'] 
    : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://127.0.0.1:3000', 'http://127.0.0.1:3002', 'http://127.0.0.1:3003', 'http://127.0.0.1:3004'];


app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: false 
}));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: false
    },
    transports: ['polling'],
    allowEIO3: true,
    pingTimeout: 20000,
    pingInterval: 15000,
    cookie: false,
    path: '/socket.io/',
    serveClient: false,
    connectTimeout: 45000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e8
});


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

        
        const timer = setInterval(() => {
            const currentTime = Date.now();
            const timeElapsed = currentTime - room.startTime;
            const timeRemaining = Math.max(0, Math.floor((room.duration - timeElapsed) / 1000));

            
            io.to(roomCode).emit('timer-update', timeRemaining);

            
            if (timeRemaining === 0) {
                clearInterval(timer);
                roomTimers.delete(roomCode);
                io.to(roomCode).emit('voting-ended');
            }
        }, 1000);

        
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
            
            
            const currentTime = Date.now();
            const timeElapsed = currentTime - room.startTime;
            console.log(`Time elapsed: ${timeElapsed}ms, Duration: ${room.duration}ms`);
            
            if (timeElapsed > room.duration) {
                console.log('Voting has ended');
                socket.emit('error', 'Voting has ended');
                return;
            }

            
            if (room.voters.has(username)) {
                console.log(`User ${username} has already voted`);
                socket.emit('error', 'You have already voted');
                return;
            }

            
            if (!room.options.includes(vote)) {
                console.log(`Invalid vote option: ${vote}`);
                socket.emit('error', 'Invalid vote option');
                return;
            }

            

            room.votes[vote] = (typeof room.votes[vote] === 'number' ? room.votes[vote] : 0) + 1;
            room.voters.add(username);
            

            console.log('Updated votes:', room.votes);
            

            const totalVotes = Object.values(room.votes).reduce((sum, val) => {
                return sum + (typeof val === 'number' ? val : parseInt(String(val), 10) || 0);
            }, 0);
            console.log(`Total votes in room ${roomCode}: ${totalVotes}`);
            

            const normalizedVotes = {};
            room.options.forEach(option => {
                normalizedVotes[option] = typeof room.votes[option] === 'number' ? 
                    room.votes[option] : parseInt(String(room.votes[option]), 10) || 0;
            });
            

            console.log('Broadcasting normalized votes to room:', normalizedVotes);
            io.to(roomCode).emit('vote-update', normalizedVotes);
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


if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// For Vercel serverless deployment, export a function that can handle requests
module.exports = (req, res) => {
    // Handle health check endpoint
    if (req.url === '/api/health') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
        return;
    }
    
    // Let the server handle the request
    return server;
};


server.on('error', (error) => {
    console.error('Server error:', error);
});
