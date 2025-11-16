import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  /**
   * Register for push notifications and get the Expo Push Token
   */
  static async registerForPushNotificationsAsync(): Promise<string | null> {
    try {
      // Check if running on a physical device
      if (Constants.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        // Request permissions if not already granted
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('[Notifications] Permission not granted');
          return null;
        }
        
        // Get the Expo Push Token
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        
        console.log('[Notifications] Expo Push Token:', tokenData.data);
        return tokenData.data;
      } else {
        console.log('[Notifications] Must use physical device for push notifications');
        return null;
      }
    } catch (error) {
      console.error('[Notifications] Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Schedule a local notification
   */
  static async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    delaySeconds: number = 0
  ): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: delaySeconds > 0 
          ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds, repeats: false }
          : null, // null means immediate
      });
      
      return notificationId;
    } catch (error) {
      console.error('[Notifications] Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('[Notifications] Error canceling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('[Notifications] Error canceling all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('[Notifications] Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Set up notification listeners
   * Returns cleanup function
   */
  static setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ): () => void {
    // Listener for when notification is received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[Notifications] Notification received:', notification);
        onNotificationReceived?.(notification);
      }
    );

    // Listener for when user taps on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('[Notifications] Notification response:', response);
        onNotificationResponse?.(response);
      }
    );

    // Return cleanup function
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }

  /**
   * Send push token to your server
   */
  static async sendPushTokenToServer(
    token: string,
    playerId: string,
    serverUrl: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${serverUrl}/api/player/push-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, pushToken: token }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('[Notifications] Error sending push token to server:', error);
      return false;
    }
  }

  /**
   * Badge management
   */
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('[Notifications] Error setting badge count:', error);
    }
  }

  static async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('[Notifications] Error getting badge count:', error);
      return 0;
    }
  }
}
