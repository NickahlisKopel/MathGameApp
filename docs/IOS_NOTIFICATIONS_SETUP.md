# iOS Push Notifications Setup Guide

## ✅ Already Completed

1. **Installed expo-notifications** package
2. **Updated app.json** with notification configuration
3. **Created NotificationService.ts** with all notification utilities

---

## 📱 How to Use Notifications in Your App

### 1. Register for Push Notifications (in App.tsx)

Add this to your `App.tsx` after player loads:

```typescript
import { NotificationService } from './services/NotificationService';

// Inside AppContent component, add useEffect:
useEffect(() => {
  // Register for push notifications
  const registerNotifications = async () => {
    const token = await NotificationService.registerForPushNotificationsAsync();
    
    if (token && playerProfile) {
      // Send token to your server
      await NotificationService.sendPushTokenToServer(
        token,
        playerProfile.id,
        'https://mathgameapp.onrender.com'
      );
      console.log('[App] Push token registered:', token);
    }
  };

  registerNotifications();

  // Set up listeners for when notifications arrive
  const cleanup = NotificationService.setupNotificationListeners(
    // When notification received (app is open)
    (notification) => {
      console.log('Notification received:', notification);
      // Show in-app notification or update UI
    },
    // When user taps notification
    (response) => {
      console.log('User tapped notification:', response);
      const data = response.notification.request.content.data;
      
      // Handle different notification types
      if (data.type === 'friend_request') {
        setShowFriends(true);
      } else if (data.type === 'challenge') {
        // Navigate to game
      }
    }
  );

  return cleanup; // Cleanup when component unmounts
}, [playerProfile]);
```

### 2. Send Local Notifications (Example)

```typescript
// Example: Send notification when friend request arrives
await NotificationService.scheduleLocalNotification(
  'New Friend Request! 👋',
  `${username} wants to be your friend`,
  { type: 'friend_request', friendId: friendId },
  0 // Send immediately
);

// Example: Remind player to play daily challenge
await NotificationService.scheduleLocalNotification(
  'Daily Challenge Ready! 🎨',
  'Try to guess today\'s color!',
  { type: 'daily_challenge' },
  86400 // 24 hours from now
);
```

### 3. Update Server to Store Push Tokens

Add this endpoint to `server/index.js`:

```javascript
// Store player's push token
app.post('/api/player/push-token', async (req, res) => {
  try {
    const { playerId, pushToken } = req.body;
    
    const player = await database.getPlayer(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Store the push token
    player.pushToken = pushToken;
    player.pushTokenUpdatedAt = new Date();
    await database.savePlayer(player);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error storing push token:', error);
    res.status(500).json({ error: 'Failed to store push token' });
  }
});

// Send push notification to a player
app.post('/api/player/notify', async (req, res) => {
  try {
    const { playerId, title, body, data } = req.body;
    
    const player = await database.getPlayer(playerId);
    if (!player || !player.pushToken) {
      return res.status(404).json({ error: 'Player or token not found' });
    }
    
    // Send push notification using Expo Push API
    const message = {
      to: player.pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data || {},
    };
    
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    const result = await response.json();
    res.json({ success: true, result });
  } catch (error) {
    console.error('[API] Error sending push notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});
```

---

## 🔔 Common Notification Use Cases

### Friend Request Notification
```typescript
// In ServerFriendsService.acceptFriendRequest or when receiving request
await NotificationService.scheduleLocalNotification(
  'New Friend! 🎉',
  `You and ${friendName} are now friends!`,
  { type: 'friend_request', friendId }
);
```

### Challenge Received
```typescript
await NotificationService.scheduleLocalNotification(
  'Challenge Received! ⚔️',
  `${friendName} challenged you to a math battle!`,
  { type: 'challenge', challengeId, difficulty }
);
```

### Daily Streak Reminder
```typescript
await NotificationService.scheduleLocalNotification(
  'Keep Your Streak! 🔥',
  `You have a ${streak} day streak! Play today to keep it going!`,
  { type: 'streak_reminder' },
  43200 // 12 hours
);
```

### Badge Count (Unread Notifications)
```typescript
// Update badge count
await NotificationService.setBadgeCount(unreadCount);

// Clear badge when user views notifications
await NotificationService.setBadgeCount(0);
```

---

## 🚀 Next Steps for iOS Submission

### 1. Build New iOS App
Since you added the notifications plugin, you need to rebuild:

```bash
eas build --platform ios --profile production
```

### 2. Apple Push Notification Certificate

Expo handles this automatically! When you build with EAS:
- EAS creates the push notification certificate
- EAS registers it with Apple
- No manual configuration needed! 🎉

### 3. Test on Physical Device

**Important**: Push notifications only work on physical devices, not simulators!

```bash
# Install on your iPhone
eas build --platform ios --profile preview
# Then scan QR code and install
```

---

## 📋 Testing Checklist

- [ ] App requests notification permission on first launch
- [ ] Push token is registered and sent to server
- [ ] Local notifications appear when app is closed
- [ ] Local notifications appear when app is open
- [ ] Tapping notification opens app with correct data
- [ ] Badge count updates correctly
- [ ] Notification sounds play
- [ ] Server can send push notifications to specific players

---

## 🔧 Troubleshooting

### "Permission Denied"
- User declined notifications. They must enable in iOS Settings > Your App > Notifications

### "Must use physical device"
- Push notifications don't work on simulator. Use a real iPhone.

### "Push token not received"
- Check that `projectId` in app.json matches your EAS project
- Ensure device has internet connection
- Check Console logs for error messages

### "Notifications not appearing"
- Check notification settings in iOS Settings
- Verify app is built with EAS (not Expo Go)
- Check that notification handler is properly configured

---

## 🎯 Quick Implementation Tips

1. **Start with local notifications** - easier to test
2. **Test permission flow** - handle denied permissions gracefully
3. **Add notification types** - use data field to handle different actions
4. **Update badge counts** - keep users informed of activity
5. **Server push notifications** - implement after local notifications work

Your notification system is ready to use! Start by registering for notifications in App.tsx and testing local notifications.
