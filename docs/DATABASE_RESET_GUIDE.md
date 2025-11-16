# Database Reset Guide

This guide explains how to completely reset the MathGameApp database and user data, returning all users to the sign-up screen.

## Overview

A complete reset involves TWO steps:
1. **Server-side**: Clear MongoDB database (all players and friend requests)
2. **Client-side**: Clear local storage (AsyncStorage data on each device)

## Server-Side Reset

### Option 1: Using the Reset Script (Recommended)

Run the automated script from the project root:

```bash
node scripts/reset-database.js
```

**What it does:**
- Connects to the production server at `https://mathgameapp.onrender.com`
- Displays a 3-second countdown (press Ctrl+C to cancel)
- Sends authenticated reset request to `/api/admin/reset-database`
- Shows deletion statistics (players deleted, friend requests deleted)
- Provides client-side cleanup instructions

**Safety features:**
- Requires confirmation key: `RESET_ALL_DATA_CONFIRM`
- 3-second delay allows cancellation
- Clear console output with step-by-step feedback

### Option 2: Direct API Call

If you prefer to call the API directly:

```bash
curl -X POST https://mathgameapp.onrender.com/api/admin/reset-database \
  -H "Content-Type: application/json" \
  -d '{"confirmationKey": "RESET_ALL_DATA_CONFIRM"}'
```

**Response format:**
```json
{
  "success": true,
  "message": "Database reset successfully",
  "deletedPlayers": 42,
  "deletedFriendRequests": 15
}
```

### Server Configuration

The reset endpoint is located at:
- **File**: `server/index.js`
- **Route**: `POST /api/admin/reset-database`
- **Protection**: Requires `confirmationKey` in request body
- **Database Method**: `database.resetDatabase()`

## Client-Side Reset

Users have TWO options to clear their local data:

### Option 1: In-App Clear Storage Button

1. Open the app
2. Navigate to: **Profile → Settings → Advanced**
3. Tap: **🔄 Clear Local Storage**
4. Confirm the action
5. App will restart to sign-up screen

**What it clears:**
- All AsyncStorage data (`@player_profile`, `@auth_session`, etc.)
- Returns user to authentication screen
- Preserves app installation

### Option 2: Reinstall App (Nuclear Option)

For complete reset including app cache:

**iOS:**
1. Press and hold the app icon
2. Tap "Remove App"
3. Select "Delete App"
4. Reinstall from TestFlight or App Store

**Android:**
1. Settings → Apps → MathGameApp
2. Tap "Storage"
3. Tap "Clear Data" and "Clear Cache"
4. Or uninstall and reinstall

## Complete Reset Workflow

Follow these steps for a full database reset:

### Step 1: Notify Users
```
⚠️ MAINTENANCE NOTICE ⚠️
The game database will be reset on [DATE] at [TIME].
All progress will be erased. Please back up any important data.
After reset, you'll need to sign up again.
```

### Step 2: Execute Server Reset
```bash
# Run from project root
node scripts/reset-database.js

# Wait for confirmation:
# ✅ Database reset successfully
# ✅ Deleted X players
# ✅ Deleted Y friend requests
```

### Step 3: Restart Development Server (if running)
```bash
# Clear Metro bundler cache
npx expo start -c
```

### Step 4: User Instructions
```
📱 ACTION REQUIRED 📱

The database has been reset. To continue playing:

1. Open MathGameApp
2. Go to: Profile → Settings → Advanced
3. Tap: "🔄 Clear Local Storage"
4. Confirm and wait for app to restart
5. Sign up with a new account

OR simply reinstall the app.
```

## Verification

After reset, verify everything is clean:

### Server-Side Verification
```bash
# Check player count (should be 0)
curl https://mathgameapp.onrender.com/api/players/online

# Check friend requests (should be empty)
curl https://mathgameapp.onrender.com/api/friends/requests/[any-id]
```

### Client-Side Verification
1. Open app
2. Should see authentication screen (sign-in/sign-up)
3. No cached profile or username
4. No friend list

## Troubleshooting

### "Server not responding"
- Server may be sleeping (Render.com free tier)
- Wait 60 seconds and try again
- Check server logs at Render.com dashboard

### "Confirmation key invalid"
- Ensure you're using: `RESET_ALL_DATA_CONFIRM`
- Check for typos (case-sensitive)
- Verify request body is valid JSON

### "Users still see old data"
- They haven't cleared local storage
- Send reminder to use "Clear Local Storage" button
- Or instruct them to reinstall app

### "Script fails to connect"
```bash
# Check if server is awake
curl https://mathgameapp.onrender.com/api/health

# If timeout, wait 60s for server to wake up
```

## Storage Reset Service API

The client-side utility is located at:
- **File**: `services/StorageResetService.ts`

### Methods

**`clearAllData()`** - Nuclear option
```typescript
const success = await StorageResetService.clearAllData();
// Clears ALL AsyncStorage data
```

**`clearUserData()`** - Selective clear
```typescript
const success = await StorageResetService.clearUserData();
// Clears only user-specific data (keeps app settings)
```

**`getStorageInfo()`** - Debug info
```typescript
const { keys, totalKeys } = await StorageResetService.getStorageInfo();
console.log(`Found ${totalKeys} storage keys:`, keys);
```

**`exportAllData()`** - Backup before reset
```typescript
const backup = await StorageResetService.exportAllData();
// Returns object with all key-value pairs
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Change the confirmation key** in production:
   - Edit `server/index.js` line with `confirmationKey`
   - Use a strong, unique key
   - Store in environment variable: `RESET_CONFIRMATION_KEY`

2. **Add IP whitelist** for production:
   ```javascript
   const allowedIPs = ['your-dev-ip', 'your-admin-ip'];
   if (!allowedIPs.includes(req.ip)) {
     return res.status(403).json({ error: 'Unauthorized' });
   }
   ```

3. **Add rate limiting**:
   ```javascript
   // Prevent rapid reset attempts
   const rateLimit = require('express-rate-limit');
   const resetLimiter = rateLimit({
     windowMs: 60 * 60 * 1000, // 1 hour
     max: 5 // 5 requests per hour
   });
   app.post('/api/admin/reset-database', resetLimiter, ...);
   ```

4. **Enable logging**:
   - Log all reset attempts (success and failure)
   - Include timestamp, IP address, and result
   - Monitor for suspicious activity

## Development vs Production

### Development (Current Setup)
- Confirmation key: `RESET_ALL_DATA_CONFIRM`
- No IP restrictions
- No rate limiting
- Simple authentication

### Production (Recommended)
```javascript
// Environment variable
const RESET_KEY = process.env.RESET_CONFIRMATION_KEY;

// Enhanced endpoint
app.post('/api/admin/reset-database', 
  resetLimiter,
  requireAuth,
  requireAdminRole,
  async (req, res) => {
    const { confirmationKey } = req.body;
    
    if (confirmationKey !== RESET_KEY) {
      // Log failed attempt
      logger.warn('Failed reset attempt', {
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return res.status(403).json({ error: 'Invalid key' });
    }
    
    // Proceed with reset...
  }
);
```

## Backup Before Reset (Optional)

Before running a reset, you may want to back up the data:

### MongoDB Backup
```bash
# If using MongoDB
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/mathgame" --out=./backup
```

### In-Memory Backup
```javascript
// Add to database.js
async saveBackup() {
  const backup = {
    players: Array.from(this.players.values()),
    friendRequests: Array.from(this.friendRequests.values()),
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    `./backups/backup-${Date.now()}.json`,
    JSON.stringify(backup, null, 2)
  );
}
```

## Support

If you encounter issues with the reset process:

1. Check server logs: `https://dashboard.render.com`
2. Verify server is running: `curl https://mathgameapp.onrender.com/api/health`
3. Check client console: Look for `[StorageReset]` logs
4. Review this guide's Troubleshooting section

---

**Last Updated**: 2024
**Maintainer**: MathGameApp Development Team
