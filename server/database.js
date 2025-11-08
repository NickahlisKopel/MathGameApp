const { MongoClient } = require('mongodb');

class DatabaseService {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect(uri) {
    try {
      // Use environment variable if available
      const mongoUri = process.env.MONGODB_URI || uri;
      
      if (!mongoUri || mongoUri === 'mongodb://localhost:27017') {
        // No MongoDB URI provided, use in-memory storage
        console.log('[Database] No MongoDB URI provided - using in-memory storage');
        console.log('[Database] WARNING: Data will be lost on server restart!');
        console.log('[Database] Set MONGODB_URI environment variable for persistent storage');
        this.inMemoryStorage = {
          players: new Map(),
          friendRequests: new Map(),
        };
        return true;
      }

      // Try to connect to MongoDB
      console.log('[Database] Connecting to MongoDB...');
      this.client = new MongoClient(mongoUri, {
        tls: true,
        tlsAllowInvalidCertificates: false,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      await this.client.connect();
      
      // Verify connection
      await this.client.db('admin').command({ ping: 1 });
      
      this.db = this.client.db('mathgame');
      console.log('[Database] ✅ Connected to MongoDB successfully!');
      
      // Create indexes for better performance
      await this.db.collection('players').createIndex({ id: 1 }, { unique: true });
      await this.db.collection('players').createIndex({ username: 1 });
      console.log('[Database] Indexes created');
      
      return true;
    } catch (error) {
      console.error('[Database] MongoDB connection failed:', error.message);
      console.log('[Database] Falling back to in-memory storage');
      this.inMemoryStorage = {
        players: new Map(),
        friendRequests: new Map(),
      };
      return true; // Return true to allow server to continue
    }
  }

  // Player Methods
  async getPlayer(playerId) {
    if (this.inMemoryStorage) {
      return this.inMemoryStorage.players.get(playerId) || null;
    }
    
    if (!this.db) return null;
    const players = this.db.collection('players');
    return await players.findOne({ id: playerId });
  }

  async savePlayer(player) {
    if (this.inMemoryStorage) {
      // Get existing player data to preserve server-side fields
      const existingPlayer = this.inMemoryStorage.players.get(player.id);
      
      // Merge: preserve server-managed fields (friends, friendRequests)
      const mergedPlayer = {
        ...player,
        friends: existingPlayer?.friends || player.friends || [],
        friendRequests: existingPlayer?.friendRequests || player.friendRequests || [],
      };
      
      this.inMemoryStorage.players.set(player.id, mergedPlayer);
      return true;
    }

    if (!this.db) return false;
    const players = this.db.collection('players');
    await players.updateOne(
      { id: player.id },
      { $set: player },
      { upsert: true }
    );
    return true;
  }

  async searchPlayers(query) {
    if (this.inMemoryStorage) {
      const results = [];
      for (const [id, player] of this.inMemoryStorage.players) {
        if (id.includes(query) || player.username?.toLowerCase().includes(query.toLowerCase())) {
          results.push({ id: player.id, username: player.username });
        }
      }
      return results;
    }

    if (!this.db) return [];
    const players = this.db.collection('players');
    const results = await players.find({
      $or: [
        { id: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } }
      ]
    }).limit(10).toArray();
    
    return results.map(p => ({ id: p.id, username: p.username }));
  }

  // Friend Request Methods
  async getFriendRequests(playerId) {
    const player = await this.getPlayer(playerId);
    return player?.friendRequests || [];
  }

  async addFriendRequest(fromPlayerId, toPlayerId, fromUsername) {
    const toPlayer = await this.getPlayer(toPlayerId);
    if (!toPlayer) return false;

    if (!toPlayer.friendRequests) toPlayer.friendRequests = [];
    if (!toPlayer.friends) toPlayer.friends = [];

    // Check if already friends
    if (toPlayer.friends.includes(fromPlayerId)) {
      return false;
    }

    // Check if request already exists
    const existingRequest = toPlayer.friendRequests.find(
      req => req.fromUserId === fromPlayerId && req.status === 'pending'
    );

    if (existingRequest) {
      return false;
    }

    // Add friend request
    const request = {
      id: `${fromPlayerId}_${toPlayerId}_${Date.now()}`,
      fromUserId: fromPlayerId,
      fromUsername: fromUsername,
      toUserId: toPlayerId,
      timestamp: new Date(),
      status: 'pending',
    };

    toPlayer.friendRequests.push(request);
    await this.savePlayer(toPlayer);

    return true;
  }

  async acceptFriendRequest(playerId, requestId) {
    const player = await this.getPlayer(playerId);
    if (!player) return false;

    const requestIndex = player.friendRequests?.findIndex(req => req.id === requestId);
    if (requestIndex === -1 || !player.friendRequests[requestIndex]) {
      return false;
    }
    
    const request = player.friendRequests[requestIndex];
    if (request.status !== 'pending') {
      return false;
    }

    // Add to friends list
    if (!player.friends) player.friends = [];
    if (!player.friends.includes(request.fromUserId)) {
      player.friends.push(request.fromUserId);
    }

    // Delete the request after accepting
    player.friendRequests.splice(requestIndex, 1);

    await this.savePlayer(player);

    // Update sender's profile
    const sender = await this.getPlayer(request.fromUserId);
    if (sender) {
      if (!sender.friends) sender.friends = [];
      if (!sender.friends.includes(playerId)) {
        sender.friends.push(playerId);
      }
      await this.savePlayer(sender);
    }

    return true;
  }

  async rejectFriendRequest(playerId, requestId) {
    const player = await this.getPlayer(playerId);
    if (!player) return false;

    const requestIndex = player.friendRequests?.findIndex(req => req.id === requestId);
    if (requestIndex === -1 || !player.friendRequests[requestIndex]) {
      return false;
    }
    
    const request = player.friendRequests[requestIndex];
    if (request.status !== 'pending') {
      return false;
    }

    // Delete the request after rejecting
    player.friendRequests.splice(requestIndex, 1);
    await this.savePlayer(player);

    return true;
  }

  async removeFriend(playerId, friendId) {
    const player = await this.getPlayer(playerId);
    if (!player || !player.friends) return false;

    const index = player.friends.indexOf(friendId);
    if (index === -1) return false;

    // Remove friend from player's list
    player.friends.splice(index, 1);
    await this.savePlayer(player);

    // Also remove player from friend's list (bidirectional)
    const friend = await this.getPlayer(friendId);
    if (friend && friend.friends) {
      const friendIndex = friend.friends.indexOf(playerId);
      if (friendIndex !== -1) {
        friend.friends.splice(friendIndex, 1);
        await this.savePlayer(friend);
      }
    }

    return true;
  }

  async close() {
    if (this.client) {
      await this.client.close();
    }
  }
}

module.exports = new DatabaseService();
