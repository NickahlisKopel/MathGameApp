import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Client-side storage reset utility
 * This clears all local app data and returns user to sign-up screen
 */
export class StorageResetService {
  /**
   * Clear all AsyncStorage data (complete reset)
   */
  static async clearAllData(): Promise<boolean> {
    try {
      console.log('[StorageReset] Clearing all local data...');
      
      // Get all keys
      const keys = await AsyncStorage.getAllKeys();
      console.log(`[StorageReset] Found ${keys.length} keys to delete`);
      
      // Clear everything
      await AsyncStorage.clear();
      
      console.log('[StorageReset] ✅ All local data cleared successfully');
      return true;
    } catch (error) {
      console.error('[StorageReset] ❌ Error clearing data:', error);
      return false;
    }
  }

  /**
   * Clear only user-specific data (keeps app settings)
   */
  static async clearUserData(): Promise<boolean> {
    try {
      console.log('[StorageReset] Clearing user data...');
      
      const keysToRemove = [
        '@player_profile',
        '@player_stats',
        '@friends_data',
        '@email_accounts',
        '@guest_id',
        '@current_user',
        '@auth_session',
      ];
      
      await AsyncStorage.multiRemove(keysToRemove);
      
      console.log('[StorageReset] ✅ User data cleared successfully');
      return true;
    } catch (error) {
      console.error('[StorageReset] ❌ Error clearing user data:', error);
      return false;
    }
  }

  /**
   * Get storage info (for debugging)
   */
  static async getStorageInfo(): Promise<{ keys: readonly string[]; totalKeys: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return {
        keys,
        totalKeys: keys.length,
      };
    } catch (error) {
      console.error('[StorageReset] Error getting storage info:', error);
      return { keys: [], totalKeys: 0 };
    }
  }

  /**
   * Export all data (for backup before reset)
   */
  static async exportAllData(): Promise<{ [key: string]: string | null }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const pairs = await AsyncStorage.multiGet(keys);
      
      const data: { [key: string]: string | null } = {};
      pairs.forEach(([key, value]) => {
        data[key] = value;
      });
      
      console.log('[StorageReset] Exported data for', keys.length, 'keys');
      return data;
    } catch (error) {
      console.error('[StorageReset] Error exporting data:', error);
      return {};
    }
  }
}
