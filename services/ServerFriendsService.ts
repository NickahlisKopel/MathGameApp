import { PlayerProfile, FriendRequest } from '../types/Player';
import { PlayerStorageService } from './PlayerStorageService';
import { getServerUrl } from '../config/ServerConfig';

export class ServerFriendsService {
  /**
   * Sync current player to server
   */
  static async syncPlayer(): Promise<void> {
    try {
      const player = await PlayerStorageService.loadPlayerProfile();
      if (!player) {
        console.log('[ServerFriends] No player profile to sync');
        return;
      }

      const SERVER_URL = await getServerUrl();
      console.log(`[ServerFriends] Syncing player ${player.username} (${player.id}) to ${SERVER_URL}`);
      const response = await fetch(`${SERVER_URL}/api/player/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player }),
      });
      
      if (response.ok) {
        console.log('[ServerFriends] Player synced successfully');
      } else {
        console.error('[ServerFriends] Sync failed with status:', response.status);
      }
    } catch (error) {
      console.error('[ServerFriends] Error syncing player:', error);
    }
  }

  /**
   * Send friend request
   */
  static async addFriend(friendId: string): Promise<{ success: boolean; error?: string; trace?: string; reason?: string; replaced?: boolean }> {
    try {
      const player = await PlayerStorageService.loadPlayerProfile();
      if (!player) {
        console.log('[ServerFriends] No player profile loaded');
        return { success: false, error: 'No player profile found' };
      }

      // Sync current player first
      await this.syncPlayer();

      console.log(`[ServerFriends] Sending friend request from ${player.username} (${player.id}) to ${friendId}`);
      const correlationId = `cli_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      console.log('[ServerFriends] Sending friend request with correlationId:', correlationId);
      const SERVER_URL = await getServerUrl();
      const response = await fetch(`${SERVER_URL}/api/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPlayerId: player.id,
          toPlayerId: friendId,
          fromUsername: player.username,
          correlationId,
        }),
      });

      const data = await response.json();
      console.log('[ServerFriends] Friend request response:', data);
      
      if (response.ok && data.success) {
        const trace = data.trace || correlationId;
        if (data.autoAccepted) {
          console.log('[ServerFriends] Auto-accepted stale reverse request trace=', trace);
          return { success: true, trace, reason: data.reason };
        }
        console.log('[ServerFriends] Friend request succeeded trace=', trace, 'purged=', data.purged, 'replaced=', data.replaced, 'reason=', data.reason);
        return { success: true, trace, reason: data.reason, replaced: data.replaced };
      } else {
        const errorMsg = data.error || data.message || 'Unknown error';
        console.error('[ServerFriends] Friend request failed:', errorMsg, 'reason=', data.reason);
        return { success: false, error: errorMsg, trace: data.trace || correlationId, reason: data.reason };
      }
    } catch (error) {
      console.error('[ServerFriends] Error adding friend:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  /**
   * Get friend requests from server
   */
  static async getFriendRequests(): Promise<FriendRequest[]> {
    try {
      const player = await PlayerStorageService.loadPlayerProfile();
      if (!player) return [];

      const SERVER_URL = await getServerUrl();
      const response = await fetch(`${SERVER_URL}/api/friends/requests/${player.id}`);
      const data = await response.json();
      
      return data.requests || [];
    } catch (error) {
      console.error('[ServerFriends] Error getting friend requests:', error);
      return [];
    }
  }

  /**
   * Accept friend request
   */
  static async acceptFriendRequest(requestId: string): Promise<boolean> {
    try {
      const player = await PlayerStorageService.loadPlayerProfile();
      if (!player) return false;

      const SERVER_URL = await getServerUrl();
      const response = await fetch(`${SERVER_URL}/api/friends/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          requestId,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Update local profile from server
        const updatedPlayer = await this.getPlayerFromServer(player.id);
        if (updatedPlayer) {
          // Merge server friends data with local profile
          player.friends = updatedPlayer.friends || [];
          player.friendRequests = updatedPlayer.friendRequests || [];
          await PlayerStorageService.savePlayerProfile(player);
        }
      }
      
      return data.success || false;
    } catch (error) {
      console.error('[ServerFriends] Error accepting friend request:', error);
      return false;
    }
  }

  /**
   * Reject friend request
   */
  static async rejectFriendRequest(requestId: string): Promise<boolean> {
    try {
      const player = await PlayerStorageService.loadPlayerProfile();
      if (!player) return false;

      const SERVER_URL = await getServerUrl();
      const response = await fetch(`${SERVER_URL}/api/friends/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          requestId,
        }),
      });

      const data = await response.json();
      return data.success || false;
    } catch (error) {
      console.error('[ServerFriends] Error rejecting friend request:', error);
      return false;
    }
  }

  /**
   * Get player from server
   */
  static async getPlayerFromServer(playerId: string): Promise<PlayerProfile | null> {
    try {
      if (!playerId || playerId.trim() === '') {
        console.log('[ServerFriends] No valid playerId provided');
        return null;
      }
      const SERVER_URL = await getServerUrl();
      const response = await fetch(`${SERVER_URL}/api/player/${playerId}`);
      
      if (!response.ok) {
        console.error('[ServerFriends] Failed to get player, status:', response.status);
        return null;
      }
      
      const data = await response.json();
      return data.player || null;
    } catch (error) {
      console.error('[ServerFriends] Error getting player:', error);
      return null;
    }
  }

  /**
   * Search for players by username or ID
   */
  static async searchPlayers(query: string): Promise<{ id: string; username: string }[]> {
    try {
      const SERVER_URL = await getServerUrl();
      const response = await fetch(`${SERVER_URL}/api/players/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      return data.players || [];
    } catch (error) {
      console.error('[ServerFriends] Error searching players:', error);
      return [];
    }
  }

  /**
   * Get friends list (returns player data)
   */
  static async getFriends(): Promise<string[]> {
    try {
      const localPlayer = await PlayerStorageService.loadPlayerProfile();
      
      if (!localPlayer || !localPlayer.id) {
        console.log('[ServerFriends] No player profile loaded yet');
        return [];
      }
      
      console.log('[ServerFriends] Getting friends for player:', localPlayer.id, localPlayer.username);
      const player = await this.getPlayerFromServer(localPlayer.id);
      
      if (!player) {
        console.log('[ServerFriends] Could not fetch player from server');
        return [];
      }
      
      console.log('[ServerFriends] Player from server:', player.id, 'Friends array:', player.friends);
      console.log('[ServerFriends] Friends count:', player.friends?.length || 0);
      const friendsList = player.friends || [];
      console.log('[ServerFriends] Returning friends list:', friendsList);
      return friendsList;
    } catch (error) {
      console.error('[ServerFriends] Error getting friends:', error);
      return [];
    }
  }

  /**
   * Remove friend
   */
  static async removeFriend(friendId: string): Promise<boolean> {
    try {
      const player = await PlayerStorageService.loadPlayerProfile();
      if (!player) {
        console.error('[ServerFriends] No player profile found for removeFriend');
        return false;
      }

      console.log('[ServerFriends] Removing friend:', friendId, 'from player:', player.id);

      const SERVER_URL = await getServerUrl();
      const response = await fetch(`${SERVER_URL}/api/friends/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          friendId,
        }),
      });

      const data = await response.json();
      console.log('[ServerFriends] Remove friend response:', data);

      if (data.success) {
        // Update local profile from server
        const updatedPlayer = await this.getPlayerFromServer(player.id);
        if (updatedPlayer) {
          console.log('[ServerFriends] Updated friends list from server:', updatedPlayer.friends);
          player.friends = updatedPlayer.friends || [];
          await PlayerStorageService.savePlayerProfile(player);
        }
        return true;
      } else {
        console.error('[ServerFriends] Server returned success=false:', data.error);
        return false;
      }
    } catch (error) {
      console.error('[ServerFriends] Error removing friend:', error);
      return false;
    }
  }
}
