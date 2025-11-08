# Socket.IO Multiplayer Setup Complete! 🎮

## What Changed

✅ **Removed**: Photon (didn't work in React Native)  
✅ **Added**: Socket.IO multiplayer (works in Expo Go!)  
✅ **Created**: Server code in `server/` folder  

## Quick Start (2 minutes)

### 1. Start the Multiplayer Server

Open a **new terminal** in the `server` folder:

```powershell
cd server
npm install
npm start
```

You should see:
```
[Server] Socket.IO server running on port 3000
[Server] Players can connect to: http://localhost:3000
```

### 2. Start Your Expo App

In your **main terminal**:

```powershell
npx expo start -c
```

### 3. Test Multiplayer

1. Open your app on a device/simulator
2. Sign in (not offline mode)
3. Tap **Online PvP** button
4. Open the app on a **second device** (or another emulator)
5. Both players will be matched automatically!

## Testing with Different Devices

### Android Emulator
```typescript
// In OnlineMultiplayerScreen.tsx, line ~107:
const serverUrl = 'http://10.0.2.2:3000';
```

### iOS Simulator
```typescript
const serverUrl = 'http://localhost:3000'; // Already set
```

### Physical Device (on same WiFi)
```typescript
// Replace with your computer's IP:
const serverUrl = 'http://192.168.1.x:3000';
```

To find your IP:
```powershell
ipconfig
# Look for "IPv4 Address" under your WiFi adapter
```

## What Works Now

✅ **Matchmaking** - Players matched by difficulty  
✅ **Real-time connection** - Instant updates  
✅ **Disconnect handling** - Graceful cleanup  
✅ **Score tracking** - Real-time score updates  

## Next Steps to Fully Implement Game Logic

The UI and connection work, but you'll need to add:

1. **Equation generation** in `renderGameScreen()`
2. **Answer submission** calling `socketMultiplayerService.submitAnswer()`
3. **Timer/round system** (optional)
4. **Game end logic** after X questions

### Quick Example to Add:

```typescript
// In renderGameScreen() of OnlineMultiplayerScreen.tsx
const handleAnswer = (answer: number) => {
  const correct = answer === currentEquation.answer;
  socketMultiplayerService.submitAnswer(answer, correct, timeSpent);
  
  if (correct) {
    setMyScore(prev => prev + 10);
  }
  
  generateNextEquation();
};
```

## Deploy Server (Free)

When ready for production:

### Option 1: Render.com (Recommended)
1. Push `server/` folder to GitHub
2. Create account on render.com
3. New Web Service → Connect repo
4. Build command: `npm install`
5. Start command: `npm start`

### Option 2: Railway.app
Similar to Render, $5/month free credit

## Troubleshooting

**"Connection Error"**  
→ Make sure server is running (`npm start` in `server/` folder)

**"Failed to connect"**  
→ Check server URL matches your setup (localhost vs IP)

**Second player doesn't connect**  
→ Both players must use same difficulty level

**Server crashes**  
→ Check server console for errors; restart with `npm start`

## Files Modified

- ✅ `services/socketMultiplayerService.ts` - New Socket.IO service
- ✅ `components/OnlineMultiplayerScreen.tsx` - Updated to use Socket.IO
- ✅ `server/index.js` - Multiplayer server
- ✅ `server/package.json` - Server dependencies
- ❌ `services/photonService.ts` - Deleted (old Photon code)
- ❌ `shims/ws.js` - Deleted (no longer needed)

## Current Status

🟢 **Server**: Ready to run  
🟢 **Client**: Ready to connect  
🟡 **Game Logic**: Needs implementation  
🟡 **Deployment**: Local only (deploy when ready)

---

Need help? Check the server logs for connection status!
