# Local Production-Like Testing Guide

This guide explains how to run the MathGameApp client & server locally while mimicking production behavior hosted at `https://mathgameapp.onrender.com`.

## Goals
- Use same code paths (rate limiting, request expiry, auto-accept logic).
- Exercise realtime Socket.IO events.
- Optionally connect to the same MongoDB instance as production.
- Allow quick switching between local and production server URLs without rebuilding.

## 1. Unified Server URL Handling
All client API & socket calls now use `config/ServerConfig.ts`:
Priority order:
1. `globalThis.RUNTIME_SERVER_URL` (temporary override at runtime)
2. Expo config extra (`app.json` → `extra.SERVER_URL`)
3. `process.env.SERVER_URL` (build-time; limited support in RN)
4. If `__DEV__ && globalThis.USE_LOCAL_SERVER` is true: `http://localhost:3000`
5. Fallback production URL: `https://mathgameapp.onrender.com`

### Runtime Override (Fastest)
Open React Native debugger console and run:
```js
import { setRuntimeServerUrl } from './config/ServerConfig';
setRuntimeServerUrl('http://localhost:3000');
```
Or simpler:
```js
global.RUNTIME_SERVER_URL = 'http://localhost:3000';
```
Revert:
```js
delete global.RUNTIME_SERVER_URL;
```

### Dev Flag Approach
In console:
```js
global.USE_LOCAL_SERVER = true;
```
This enables `http://localhost:3000` when no other override present.

## 2. Start Local Server
```powershell
cd C:\Users\niksu\MathGameApp\server
$env:LOG_VERBOSE = '1'
$env:FRIEND_REQUEST_RATE_WINDOW_MIN = '30'
$env:FRIEND_REQUEST_RATE_MAX = '5'
$env:FRIEND_REQUEST_EXPIRY_HOURS = '72'
npm start
```
Server runs on `http://localhost:3000`.

### Optional: Use Same MongoDB as Production
Set (replace URI):
```powershell
$env:MONGODB_URI = 'YOUR_PRODUCTION_OR_STAGING_MONGODB_URI'
npm start
```
This allows cross-build persistence and multi-device tests like production. Be careful: writes will affect real data.

## 3. Point Client to Local Server
Method options:
1. Runtime override (`global.RUNTIME_SERVER_URL = 'http://localhost:3000'`)
2. Dev flag (`global.USE_LOCAL_SERVER = true`)
3. Add to `app.json`:
```json
{
  "expo": {
    "extra": { "SERVER_URL": "http://localhost:3000" }
  }
}
```

Restart Expo for config changes:
```powershell
cd C:\Users\niksu\MathGameApp
npx expo start -c
```

## 4. Verify Connection
In app logs you should see lines like:
```
[ServerFriends] Syncing player ... to http://localhost:3000
[Socket.IO] Connected: ...
```
If still hitting production, check for lingering `RUNTIME_SERVER_URL` or extra config.

## 5. Testing Friend Requests (Production Logic)
1. Launch server & two clients (simulators or devices on same network). Ensure both point to local server.
2. Send friend request from A → B.
3. Expect realtime event on B: alert via `friend-request-received`.
4. Test replacement: edit timestamp of existing pending request in storage (set to > 36h) then resend.
5. Test auto-accept reverse: create reverse stale request and send new request from other side.
6. Test rate limit: exceed configured attempts quickly.

## 6. Purging Stale Requests
Admin endpoint (local):
```powershell
curl -X POST http://localhost:3000/api/admin/friends/purge-stale -H "Content-Type: application/json" -d '{"confirmationKey":"RESET_ALL_DATA_CONFIRM"}'
```
Specific player:
```powershell
curl -X POST http://localhost:3000/api/admin/friends/purge-stale -H "Content-Type: application/json" -d '{"confirmationKey":"RESET_ALL_DATA_CONFIRM","playerId":"player_123"}'
```

## 7. Switching Back to Production
Console:
```js
delete global.RUNTIME_SERVER_URL;
delete global.USE_LOCAL_SERVER;
```
App now falls back to production URL.

## 8. Troubleshooting
| Symptom | Cause | Fix |
|---------|-------|-----|
| Still hitting production | Override not set early enough | Set `global.RUNTIME_SERVER_URL` before first friend action; reload app. |
| Realtime events missing | Socket connected to wrong host | Check log `[Socket.IO] Connected:` host matches desired server. |
| Rate limit not enforced | Env vars not applied | Verify PowerShell uses `$env:VAR = 'value'` before `npm start`. |
| Requests vanish after restart | Using in-memory DB | Provide `MONGODB_URI` for persistence. |
| Mixed local/remote players | One client still on production | Ensure both override paths set identically. |

## 9. Quick Script (Optional)
Create `scripts/use-local-server.js`:
```js
require('fs').writeFileSync('./dev-local-server.flag','on');
console.log('Local server flag written. In console: global.USE_LOCAL_SERVER = true');
```
(Then implement reading this flag in `ServerConfig` if desired.)

## 10. Clean Separation Checklist
- No hardcoded production URLs except fallback constant.
- Single config module determines runtime URL.
- Ability to toggle without rebuild.
- Logging shows chosen URL early.

## 11. Security Notes
Never commit production Mongo URI. Use environment variables or a secure secret manager. Remove `LOG_VERBOSE` in production to reduce noise.

---
Last Updated: 2025-11-15
