import { PlayerProfile, FriendRequest } from '../types/Player';
import { PlayerStorageService } from './PlayerStorageService';

const SERVER_URL = 'https://mathgameapp.onrender.com';

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
  static async addFriend(friendId: string): Promise<boolean> {
    try {
      const player = await PlayerStorageService.loadPlayerProfile();
      if (!player) {
        console.log('[ServerFriends] No player profile loaded');
        return false;
      }

      // Sync current player first
      await this.syncPlayer();

      console.log(`[ServerFriends] Sending friend request from ${player.username} to ${friendId}`);
      const response = await fetch(`${SERVER_URL}/api/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPlayerId: player.id,
          toPlayerId: friendId,
          fromUsername: player.username,
        }),
      });

      const data = await response.json();
      console.log('[ServerFriends] Friend request response:', data);
      return data.success || false;
    } catch (error) {
      console.error('[ServerFriends] Error adding friend:', error);
      return false;
    }
  }

  /**
   * Get friend requests from server
   */
  static async getFriendRequests(): Promise<FriendRequest[]> {
    try {
      const player = await PlayerStorageService.loadPlayerProfile();
      if (!player) return [];

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
      const response = await fetch(`${SERVER_URL}/api/player/${playerId}`);
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
      console.log('[ServerFriends] Getting friends for player:', localPlayer?.id, localPlayer?.username);
      const player = await this.getPlayerFromServer(localPlayer?.id || '');
      console.log('[ServerFriends] Player from server:', player?.id, 'Friends:', player?.friends);
      return player?.friends || [];
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
      if (!player) return false;

      const response = await fetch(`${SERVER_URL}/api/friends/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          friendId,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Update local profile from server
        const updatedPlayer = await this.getPlayerFromServer(player.id);
        if (updatedPlayer) {
          player.friends = updatedPlayer.friends || [];
          await PlayerStorageService.savePlayerProfile(player);
        }
      }
      
      return data.success || false;
    } catch (error) {
      console.error('[ServerFriends] Error removing friend:', error);
      return false;
    }
  }
}
