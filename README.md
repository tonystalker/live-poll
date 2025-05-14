# Live Poll Battle

## Overview

Live Poll Battle is a real-time polling application that allows users to create and join poll rooms, vote on questions, and see live vote updates.

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

## Features

- Create poll rooms with a unique room code
- Join existing poll rooms
- Real-time vote tracking
- 60-second voting countdown
- Prevents re-voting
- Displays live vote percentages
