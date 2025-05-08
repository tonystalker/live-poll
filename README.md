# Live Poll Battle

## Overview
Live Poll Battle is a real-time polling application that allows users to create and join poll rooms, vote on questions, and see live vote updates.

## Features
- Create poll rooms with a unique room code
- Join existing poll rooms
- Real-time vote tracking
- 60-second voting countdown
- Prevents re-voting
- Displays live vote percentages

## Tech Stack
- Frontend: Next.js with TypeScript
- Backend: Node.js with Socket.IO
- Styling: Tailwind CSS

## Setup Instructions

### Prerequisites
- Node.js (v16 or later)
- npm or yarn

### Backend Setup
1. Navigate to the server directory
```bash
cd server
npm install
npm start
```
The server will run on `http://localhost:3001`

### Frontend Setup
1. Navigate to the client directory
```bash
cd client/live-poll-frontend
npm install
npm run dev
```
The frontend will run on `http://localhost:3000`

## How It Works
- Users can create a new poll room or join an existing one using a room code
- Each room has a 60-second voting window
- Users can only vote once per room
- Vote counts update in real-time for all participants

## State Management
- Poll rooms are managed in-memory on the server
- WebSocket (Socket.IO) is used for real-time communication
- Each room tracks:
  - Room code
  - Creator
  - Question
  - Vote options
  - Current vote counts
  - Voter tracking
  - Start time and duration

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
MIT License

## Overview
Live Poll Battle is a real-time polling application that allows users to create and join poll rooms, vote on questions, and see live vote updates.

## Features
- Create poll rooms with a unique room code
- Join existing poll rooms
- Real-time vote tracking
- 60-second voting countdown
- Prevents re-voting
- Displays live vote percentages

## Tech Stack
- Frontend: Next.js with TypeScript
- Backend: Node.js with WebSocket
- Styling: Tailwind CSS

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Backend Setup
1. Navigate to the server directory
```bash
cd server
npm install
npm start
```

### Frontend Setup
1. Navigate to the client directory
```bash
cd client/live-poll-frontend
npm install
npm run dev
```

## Architecture
The application uses WebSocket for real-time communication. The server maintains poll room state in memory, broadcasting vote updates to all connected clients in a specific room.

### Key Components
- WebSocket server manages room creation, joining, and vote tracking
- React frontend handles user interactions and real-time updates
- Local storage used to persist user information across page refreshes

## Deployment
The application can be deployed on platforms like Vercel (frontend) and Heroku (backend).
