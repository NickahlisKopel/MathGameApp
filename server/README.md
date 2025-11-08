# Math Game Multiplayer Server

Simple Socket.IO server for real-time math game multiplayer.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Start the server:
```bash
npm start
```

Or for development with auto-restart:
```bash
npm run dev
```

The server will run on `http://localhost:3000`

## Features

- **Matchmaking**: Players are matched by difficulty level (easy/medium/hard)
- **Real-time gameplay**: Instant answer submission and score updates
- **Disconnect handling**: Graceful handling when players leave

## Testing Locally

1. Start the server: `npm start`
2. In your app's `OnlineMultiplayerScreen.tsx`, the server URL is set to `http://localhost:3000`
3. On Android emulator, use `http://10.0.2.2:3000`
4. On iOS simulator, use `http://localhost:3000`
5. On physical device, use your computer's IP (e.g., `http://192.168.1.x:3000`)

## Deploying to Production

### Free Options:

1. **Render.com** (Recommended)
   - Push code to GitHub
   - Connect repo on Render
   - Auto-deploys on push
   
2. **Railway.app**
   - Similar to Render
   - $5/month free credit

3. **Fly.io**
   - Free tier available
   - Global edge deployment

### Update client URL:
Once deployed, update the `serverUrl` in `OnlineMultiplayerScreen.tsx`:
```typescript
const serverUrl = 'https://your-app.onrender.com';
```

## Environment Variables

For production, you can set:
- `PORT`: Server port (default: 3000)
- `CORS_ORIGIN`: Allowed origins (default: '*')

## API Events

### Client → Server
- `join-matchmaking`: Join matchmaking queue
- `leave-matchmaking`: Leave queue
- `submit-answer`: Submit an answer
- `leave-room`: Leave current game

### Server → Client
- `match-found`: Match has been found
- `game-start`: Game is starting
- `player-answer`: Opponent answered
- `score-update`: Score changed
- `opponent-disconnect`: Opponent left
- `error`: Error occurred
