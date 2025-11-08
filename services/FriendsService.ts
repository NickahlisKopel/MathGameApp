import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerProfile, FriendRequest } from '../types/Player';
import { PlayerStorageService } from './PlayerStorageService';

const SERVER_URL = 'https://mathgameapp.onrender.com';

const STORAGE_KEYS = {
  FRIENDS: '@mathgame_friends',
  FRIEND_REQUESTS: '@mathgame_friend_requests',
};

export class FriendsService {
  /**
   * Initialize friends list for a player
   */
  static async initializeFriends(playerId: string): Promise<void> {
    const player = await PlayerStorageService.loadPlayerProfile();
    if (player && !player.friends) {
      player.friends = [];
      player.friendRequests = [];
      await PlayerStorageService.savePlayerProfile(player);
    }
  }

  /**
   * Get all friends for current player
   */
  static async getFriends(): Promise<string[]> {
    const player = await PlayerStorageService.loadPlayerProfile();
    return player?.friends || [];
  }

  /**
   * Get pending friend requests (incoming requests only)
   */
  static async getFriendRequests(): Promise<FriendRequest[]> {
    const player = await PlayerStorageService.loadPlayerProfile();
    // Only show requests where current player is the receiver (toUserId matches)
    return player?.friendRequests?.filter(req => 
      req.status === 'pending' && req.toUserId === player.id
    ) || [];
  }

  /**
   * Add a friend by user ID
   * This sends a friend request to the target user
   */
  static async addFriend(friendId: string, friendUsername: string): Promise<boolean> {
    const player = await PlayerStorageService.loadPlayerProfile();
    if (!player) return false;

    // Initialize friends array if needed
    if (!player.friends) player.friends = [];
    if (!player.friendRequests) player.friendRequests = [];

    // Check if already friends
    if (player.friends.includes(friendId)) {
      return false;
    }

    // Check if already sent a request to this user
    const alreadySent = player.friendRequests.find(
      req => req.fromUserId === player.id && req.toUserId === friendId && req.status === 'pending'
    );

    if (alreadySent) {
      return false; // Request already sent
    }

    // Create friend request IN THE RECEIVER'S PROFILE
    // We need to load the target user's profile and add the request there
    const targetPlayer = await PlayerStorageService.loadPlayerProfileById(friendId);
    
    if (!targetPlayer) {
      return false; // Target player doesn't exist
    }
    if (!targetPlayer.friendRequests) targetPlayer.friendRequests = [];
    if (!targetPlayer.friends) targetPlayer.friends = [];

    // Check if target already sent us a request (instant friend!)
    const reverseRequest = targetPlayer.friendRequests.find(
      req => req.fromUserId === targetPlayer.id && req.toUserId === player.id && req.status === 'pending'
    );

    if (reverseRequest) {
      // Auto-accept! Both become friends immediately
      reverseRequest.status = 'accepted';
      if (!targetPlayer.friends.includes(player.id)) {
        targetPlayer.friends.push(player.id);
      }
      if (!player.friends.includes(friendId)) {
        player.friends.push(friendId);
      }
      await PlayerStorageService.saveToAllProfiles(targetPlayer);
      await PlayerStorageService.savePlayerProfile(player);
      return true;
    }

    // Create friend request in target's profile
    const request: FriendRequest = {
      id: `${player.id}_${friendId}_${Date.now()}`,
      fromUserId: player.id,
      fromUsername: player.username,
      toUserId: friendId,
      timestamp: new Date(),
      status: 'pending',
    };

    targetPlayer.friendRequests.push(request);
    
    // Also store in sender's profile for tracking (mark as 'sent' status)
    const sentRequest: FriendRequest = {
      ...request,
      status: 'pending' as any,
    };
    player.friendRequests.push(sentRequest);

    // Save both profiles
    await PlayerStorageService.saveToAllProfiles(targetPlayer);
    await PlayerStorageService.savePlayerProfile(player);

    return true;
  }

  /**
   * Accept a friend request
   * This adds both users as friends in their respective profiles
   */
  static async acceptFriendRequest(requestId: string): Promise<boolean> {
    const player = await PlayerStorageService.loadPlayerProfile();
    if (!player) return false;

    if (!player.friends) player.friends = [];
    if (!player.friendRequests) player.friendRequests = [];

    const request = player.friendRequests.find(req => req.id === requestId);
    if (!request || request.status !== 'pending') {
      return false;
    }

    // Mark as accepted in current player's profile
    request.status = 'accepted';

    // Add sender as friend in current player's profile
    if (!player.friends.includes(request.fromUserId)) {
      player.friends.push(request.fromUserId);
    }

    // Now update the sender's profile
    const senderPlayer = await PlayerStorageService.loadPlayerProfileById(request.fromUserId);
    
    if (senderPlayer) {
      if (!senderPlayer.friends) senderPlayer.friends = [];
      if (!senderPlayer.friendRequests) senderPlayer.friendRequests = [];

      // Add current player as friend in sender's profile
      if (!senderPlayer.friends.includes(player.id)) {
        senderPlayer.friends.push(player.id);
      }

      // Mark the request as accepted in sender's profile too
      const senderRequest = senderPlayer.friendRequests.find(req => req.id === requestId);
      if (senderRequest) {
        senderRequest.status = 'accepted';
      }

      await PlayerStorageService.saveToAllProfiles(senderPlayer);
    }

    await PlayerStorageService.savePlayerProfile(player);
    return true;
  }

  /**
   * Reject a friend request
   */
  static async rejectFriendRequest(requestId: string): Promise<boolean> {
    const player = await PlayerStorageService.loadPlayerProfile();
    if (!player) return false;

    if (!player.friendRequests) player.friendRequests = [];

    const request = player.friendRequests.find(req => req.id === requestId);
    if (!request || request.status !== 'pending') {
      return false;
    }

    // Mark as rejected
    request.status = 'rejected';

    await PlayerStorageService.savePlayerProfile(player);
    return true;
  }

  /**
   * Remove a friend
   */
  static async removeFriend(friendId: string): Promise<boolean> {
    const player = await PlayerStorageService.loadPlayerProfile();
    if (!player || !player.friends) return false;

    const index = player.friends.indexOf(friendId);
    if (index === -1) return false;

    player.friends.splice(index, 1);
    await PlayerStorageService.savePlayerProfile(player);

    return true;
  }

  /**
   * Search for a player by username or ID (simulated - in real app would query server)
   */
  static async searchPlayer(query: string): Promise<{ id: string; username: string } | null> {
    // In a real implementation, this would query your backend
    // For now, we'll just return null as this is a local-first app
    // You could integrate this with Firebase Realtime Database or Firestore
    return null;
  }
}
