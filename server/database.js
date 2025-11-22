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
          dailyChallengeSubmissions: new Map(), // key: date, value: array of submissions
          dailyHexCodes: new Map(), // key: date, value: hex code for that day
          emailVerifications: new Map(), // key: token, value: {email, userId, createdAt}
          emailAccounts: new Map(), // key: email, value: {userId, verified, createdAt}
          passwordResetTokens: new Map(), // key: token, value: {email, userId, createdAt, expiresAt}
          communityBackgrounds: new Map(), // key: backgroundId, value: background data
          backgroundReports: new Map(), // key: reportId, value: report data
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
      await this.db.collection('dailyChallengeSubmissions').createIndex({ date: 1, playerId: 1 }, { unique: true });
      await this.db.collection('dailyChallengeSubmissions').createIndex({ date: 1, isCorrect: 1 });
      await this.db.collection('dailyHexCodes').createIndex({ date: 1 }, { unique: true });
      await this.db.collection('communityBackgrounds').createIndex({ id: 1 }, { unique: true });
      await this.db.collection('communityBackgrounds').createIndex({ uploadedBy: 1 });
      await this.db.collection('communityBackgrounds').createIndex({ status: 1, uploadedAt: -1 });
      await this.db.collection('communityBackgrounds').createIndex({ status: 1, likes: -1 });
      await this.db.collection('communityBackgrounds').createIndex({ status: 1, downloads: -1 });
      console.log('[Database] Indexes created');
      
      return true;
    } catch (error) {
      console.error('[Database] MongoDB connection failed:', error.message);
      console.log('[Database] Falling back to in-memory storage');
      this.inMemoryStorage = {
        players: new Map(),
        friendRequests: new Map(),
        dailyChallengeSubmissions: new Map(),
        dailyHexCodes: new Map(),
        emailVerifications: new Map(),
        emailAccounts: new Map(),
        passwordResetTokens: new Map(),
        communityBackgrounds: new Map(),
        backgroundReports: new Map(),
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
    
    // Get existing player to preserve server-managed fields
    const existingPlayer = await players.findOne({ id: player.id });
    
    // Prepare update: preserve friends and friendRequests from server
    const updateData = {
      ...player,
      friends: existingPlayer?.friends || player.friends || [],
      friendRequests: existingPlayer?.friendRequests || player.friendRequests || [],
    };
    
    await players.updateOne(
      { id: player.id },
      { $set: updateData },
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

  async addFriendRequest(fromPlayerId, toPlayerId, fromUsername, trace) {
    console.log(`[Database] Adding friend request: ${fromPlayerId} → ${toPlayerId} trace=${trace}`);
    
    const toPlayer = await this.getPlayer(toPlayerId);
    if (!toPlayer) {
      console.log(`[Database] Target player not found: ${toPlayerId}`);
      return { success: false, error: 'Player not found. Make sure they have opened the app at least once.', reason: 'player_not_found', trace };
    }

    if (!toPlayer.friendRequests) toPlayer.friendRequests = [];

    // Purge stale pending requests (configurable expiry)
    const expiryHours = parseInt(process.env.FRIEND_REQUEST_EXPIRY_HOURS || '72', 10); // default 72h
    const expiryMs = expiryHours * 60 * 60 * 1000;
    const now = Date.now();
    const beforeCount = toPlayer.friendRequests.length;
    toPlayer.friendRequests = toPlayer.friendRequests.filter(req => {
      if (req.status !== 'pending') return true; // keep non-pending (though we usually remove after accept/reject)
      const age = now - new Date(req.timestamp).getTime();
      if (age > expiryMs) {
        console.log(`[Database] Purging stale request ${req.id} age=${Math.round(age/1000)}s trace=${trace}`);
        return false; // drop stale
      }
      return true;
    });
    const purgedCount = beforeCount - toPlayer.friendRequests.length;
    if (!toPlayer.friends) toPlayer.friends = [];

    // Check if already friends
    if (toPlayer.friends.includes(fromPlayerId)) {
      console.log(`[Database] Players are already friends`);
      return { success: false, error: 'You are already friends with this player', reason: 'already_friends', trace };
    }

    // Check if request already exists (from you to them) AFTER purging
    let existingRequest = toPlayer.friendRequests.find(
      req => req.fromUserId === fromPlayerId && req.status === 'pending'
    );

    let replaced = false;
    if (existingRequest) {
      // If existing pending request is older than half expiry, allow replacement
      const existingAge = now - new Date(existingRequest.timestamp).getTime();
      if (existingAge > (expiryMs / 2)) {
        console.log(`[Database] Replacing aging pending request ${existingRequest.id} age=${Math.round(existingAge/1000)}s trace=${trace}`);
        // Remove old request
        toPlayer.friendRequests = toPlayer.friendRequests.filter(r => r.id !== existingRequest.id);
        existingRequest = null; // proceed to create new
        replaced = true;
      } else {
        console.log(`[Database] Friend request already pending (fresh) trace=${trace}`);
        return { success: false, error: 'You already have a pending friend request to this player', reason: 'pending_fresh', trace };
      }
    }

    // Check if they already sent you a request
    const fromPlayer = await this.getPlayer(fromPlayerId);
    if (fromPlayer && fromPlayer.friendRequests) {
      // Purge stale on sender side too
      fromPlayer.friendRequests = fromPlayer.friendRequests.filter(req => {
        if (req.status !== 'pending') return true;
        const age = now - new Date(req.timestamp).getTime();
        if (age > expiryMs) {
          console.log(`[Database] Purging stale sender request ${req.id} age=${Math.round(age/1000)}s trace=${trace}`);
          return false;
        }
        return true;
      });
      const reverseRequest = fromPlayer.friendRequests.find(
        req => req.fromUserId === toPlayerId && req.status === 'pending'
      );
      if (reverseRequest) {
        const reverseAge = now - new Date(reverseRequest.timestamp).getTime();
        if (reverseAge > (expiryMs / 2)) {
          // Auto-accept stale reverse request creating friendship instead of blocking new request
          console.log(`[Database] Auto-accepting stale reverse request ${reverseRequest.id} trace=${trace}`);
          // Accept logic similar to acceptFriendRequest
          if (!toPlayer.friends) toPlayer.friends = [];
          if (!toPlayer.friends.includes(reverseRequest.fromUserId)) {
            toPlayer.friends.push(reverseRequest.fromUserId);
          }
          // Remove from sender list and add mutual
          fromPlayer.friendRequests = fromPlayer.friendRequests.filter(r => r.id !== reverseRequest.id);
          if (!fromPlayer.friends) fromPlayer.friends = [];
          if (!fromPlayer.friends.includes(toPlayer.id)) {
            fromPlayer.friends.push(toPlayer.id);
          }
          await this.savePlayer(toPlayer);
          await this.savePlayer(fromPlayer);
          return { success: true, autoAccepted: true, trace, reason: 'reverse_auto_accepted' };
        } else {
          console.log(`[Database] Reverse request exists (fresh) - blocking new send trace=${trace}`);
          return { success: false, error: 'This player already sent you a friend request! Check your Requests tab.', reason: 'reverse_pending', trace };
        }
      }
    }

    // Add friend request
    const request = {
      id: `${fromPlayerId}_${toPlayerId}_${Date.now()}`,
      fromUserId: fromPlayerId,
      fromUsername: fromUsername,
      toUserId: toPlayerId,
      timestamp: new Date(),
      status: 'pending',
      correlationId: trace,
    };

    toPlayer.friendRequests.push(request);
    await this.savePlayer(toPlayer);

    console.log(`[Database] Friend request added successfully purged=${purgedCount} replaced=${replaced ? 1 : 0}`);
    return { success: true, request, purged: purgedCount, replaced, trace, reason: replaced ? 'pending_replaced' : 'created' };
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

  async checkFriendshipStatus(playerId1, playerId2) {
    console.log(`[Database] Checking friendship status between ${playerId1} and ${playerId2}`);
    
    const player1 = await this.getPlayer(playerId1);
    const player2 = await this.getPlayer(playerId2);

    if (!player1) {
      console.log(`[Database] Player 1 (${playerId1}) not found`);
      return { exists: false, error: 'Player 1 not found' };
    }
    if (!player2) {
      console.log(`[Database] Player 2 (${playerId2}) not found`);
      return { exists: false, error: 'Player 2 not found' };
    }

    const areFriends = player1.friends?.includes(playerId2) && player2.friends?.includes(playerId1);
    const pendingRequest1to2 = player2.friendRequests?.find(
      req => req.fromUserId === playerId1 && req.status === 'pending'
    );
    const pendingRequest2to1 = player1.friendRequests?.find(
      req => req.fromUserId === playerId2 && req.status === 'pending'
    );

    const status = {
      exists: true,
      areFriends,
      pendingRequest1to2: !!pendingRequest1to2,
      pendingRequest2to1: !!pendingRequest2to1,
      player1Username: player1.username,
      player2Username: player2.username,
    };

    console.log(`[Database] Friendship status:`, status);
    return status;
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

  async resetDatabase() {
    try {
      if (this.inMemoryStorage) {
        // Clear in-memory storage
        this.inMemoryStorage.players.clear();
        this.inMemoryStorage.friendRequests.clear();
        this.inMemoryStorage.dailyChallengeSubmissions.clear();
        this.inMemoryStorage.dailyHexCodes.clear();
        console.log('[Database] In-memory storage cleared');
        return { success: true, message: 'In-memory storage cleared' };
      }

      if (this.db) {
        // Clear all collections
        const playersResult = await this.db.collection('players').deleteMany({});
        const requestsResult = await this.db.collection('friendRequests').deleteMany({});
        const submissionsResult = await this.db.collection('dailyChallengeSubmissions').deleteMany({});
        const hexCodesResult = await this.db.collection('dailyHexCodes').deleteMany({});
        
        console.log('[Database] Database reset complete');
        console.log(`[Database] - Deleted ${playersResult.deletedCount} players`);
        console.log(`[Database] - Deleted ${requestsResult.deletedCount} friend requests`);
        console.log(`[Database] - Deleted ${submissionsResult.deletedCount} daily challenge submissions`);
        console.log(`[Database] - Deleted ${hexCodesResult.deletedCount} daily hex codes`);
        
        return {
          success: true,
          message: 'Database reset successfully',
          deleted: {
            players: playersResult.deletedCount,
            friendRequests: requestsResult.deletedCount,
            dailyChallengeSubmissions: submissionsResult.deletedCount,
            dailyHexCodes: hexCodesResult.deletedCount,
          }
        };
      }

      return { success: false, message: 'Database not initialized' };
    } catch (error) {
      console.error('[Database] Error resetting database:', error);
      return { success: false, message: error.message };
    }
  }

  // Daily Challenge Methods
  async getDailyHexCode(date) {
    try {
      if (this.inMemoryStorage) {
        return this.inMemoryStorage.dailyHexCodes.get(date) || null;
      }

      const result = await this.db.collection('dailyHexCodes').findOne({ date });
      return result ? result.hexCode : null;
    } catch (error) {
      console.error('[Database] Error getting daily hex code:', error);
      return null;
    }
  }

  async setDailyHexCode(date, hexCode) {
    try {
      if (this.inMemoryStorage) {
        this.inMemoryStorage.dailyHexCodes.set(date, hexCode);
        return true;
      }

      await this.db.collection('dailyHexCodes').updateOne(
        { date },
        { $set: { date, hexCode, createdAt: new Date() } },
        { upsert: true }
      );
      return true;
    } catch (error) {
      console.error('[Database] Error setting daily hex code:', error);
      return false;
    }
  }

  async submitDailyChallenge(submission) {
    try {
      const { playerId, playerName, date, hexCode, guess, isCorrect, similarity } = submission;
      
      if (this.inMemoryStorage) {
        const dateSubmissions = this.inMemoryStorage.dailyChallengeSubmissions.get(date) || [];
        
        // Check if player already submitted today
        const existingIndex = dateSubmissions.findIndex(s => s.playerId === playerId);
        if (existingIndex !== -1) {
          return { success: false, message: 'Already submitted today' };
        }
        
        const newSubmission = {
          playerId,
          playerName,
          date,
          hexCode,
          guess,
          isCorrect,
          similarity: similarity || 0,
          submittedAt: new Date(),
        };
        
        dateSubmissions.push(newSubmission);
        this.inMemoryStorage.dailyChallengeSubmissions.set(date, dateSubmissions);
        
        return { success: true, submission: newSubmission };
      }

      // Check if player already submitted today
      const existing = await this.db.collection('dailyChallengeSubmissions').findOne({
        date,
        playerId,
      });

      if (existing) {
        return { success: false, message: 'Already submitted today' };
      }

      const newSubmission = {
        playerId,
        playerName,
        date,
        hexCode,
        guess,
        isCorrect,
        similarity: similarity || 0,
        submittedAt: new Date(),
      };

      await this.db.collection('dailyChallengeSubmissions').insertOne(newSubmission);
      return { success: true, submission: newSubmission };
    } catch (error) {
      console.error('[Database] Error submitting daily challenge:', error);
      return { success: false, message: error.message };
    }
  }

  async getDailyChallengeSubmissions(date) {
    try {
      if (this.inMemoryStorage) {
        const submissions = this.inMemoryStorage.dailyChallengeSubmissions.get(date) || [];
        // Sort by correct first, then by submission time
        return submissions.sort((a, b) => {
          if (a.isCorrect && !b.isCorrect) return -1;
          if (!a.isCorrect && b.isCorrect) return 1;
          return new Date(a.submittedAt) - new Date(b.submittedAt);
        });
      }

      const submissions = await this.db.collection('dailyChallengeSubmissions')
        .find({ date })
        .sort({ isCorrect: -1, submittedAt: 1 })
        .toArray();
      
      return submissions;
    } catch (error) {
      console.error('[Database] Error getting daily challenge submissions:', error);
      return [];
    }
  }

  async getPlayerDailyChallengeSubmission(date, playerId) {
    try {
      if (this.inMemoryStorage) {
        const submissions = this.inMemoryStorage.dailyChallengeSubmissions.get(date) || [];
        return submissions.find(s => s.playerId === playerId) || null;
      }

      const submission = await this.db.collection('dailyChallengeSubmissions').findOne({
        date,
        playerId,
      });
      
      return submission;
    } catch (error) {
      console.error('[Database] Error getting player daily challenge submission:', error);
      return null;
    }
  }

  // Email Verification Methods
  async createEmailVerification(token, email, userId) {
    if (this.inMemoryStorage) {
      this.inMemoryStorage.emailVerifications.set(token, {
        email,
        userId,
        createdAt: new Date(),
      });
      return true;
    }

    if (!this.db) return false;
    const verifications = this.db.collection('emailVerifications');
    await verifications.insertOne({
      token,
      email,
      userId,
      createdAt: new Date(),
    });
    return true;
  }

  async getEmailVerification(token) {
    if (this.inMemoryStorage) {
      return this.inMemoryStorage.emailVerifications.get(token) || null;
    }

    if (!this.db) return null;
    const verifications = this.db.collection('emailVerifications');
    return await verifications.findOne({ token });
  }

  async deleteEmailVerification(token) {
    if (this.inMemoryStorage) {
      this.inMemoryStorage.emailVerifications.delete(token);
      return true;
    }

    if (!this.db) return false;
    const verifications = this.db.collection('emailVerifications');
    await verifications.deleteOne({ token });
    return true;
  }

  async saveEmailAccount(email, userId, verified = false) {
    if (this.inMemoryStorage) {
      this.inMemoryStorage.emailAccounts.set(email.toLowerCase(), {
        userId,
        verified,
        createdAt: new Date(),
      });
      return true;
    }

    if (!this.db) return false;
    const emailAccounts = this.db.collection('emailAccounts');
    await emailAccounts.updateOne(
      { email: email.toLowerCase() },
      { 
        $set: { 
          userId, 
          verified, 
          updatedAt: new Date() 
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    return true;
  }

  async getEmailAccount(email) {
    if (this.inMemoryStorage) {
      return this.inMemoryStorage.emailAccounts.get(email.toLowerCase()) || null;
    }

    if (!this.db) return null;
    const emailAccounts = this.db.collection('emailAccounts');
    return await emailAccounts.findOne({ email: email.toLowerCase() });
  }

  async markEmailVerified(email) {
    if (this.inMemoryStorage) {
      const account = this.inMemoryStorage.emailAccounts.get(email.toLowerCase());
      if (account) {
        account.verified = true;
        account.verifiedAt = new Date();
        this.inMemoryStorage.emailAccounts.set(email.toLowerCase(), account);
      }
      return true;
    }

    if (!this.db) return false;
    const emailAccounts = this.db.collection('emailAccounts');
    await emailAccounts.updateOne(
      { email: email.toLowerCase() },
      { $set: { verified: true, verifiedAt: new Date() } }
    );
    return true;
  }

  // Password Reset Token Methods
  async createPasswordResetToken(token, email, userId) {
    if (this.inMemoryStorage) {
      if (!this.inMemoryStorage.passwordResetTokens) {
        this.inMemoryStorage.passwordResetTokens = new Map();
      }
      this.inMemoryStorage.passwordResetTokens.set(token, {
        email,
        userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });
      return true;
    }

    if (!this.db) return false;
    const resetTokens = this.db.collection('passwordResetTokens');
    await resetTokens.insertOne({
      token,
      email,
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });
    return true;
  }

  async getPasswordResetToken(token) {
    if (this.inMemoryStorage) {
      if (!this.inMemoryStorage.passwordResetTokens) {
        return null;
      }
      const resetToken = this.inMemoryStorage.passwordResetTokens.get(token);
      if (!resetToken) return null;
      
      // Check if expired
      if (new Date() > resetToken.expiresAt) {
        this.inMemoryStorage.passwordResetTokens.delete(token);
        return null;
      }
      return resetToken;
    }

    if (!this.db) return null;
    const resetTokens = this.db.collection('passwordResetTokens');
    const resetToken = await resetTokens.findOne({ token });
    
    if (!resetToken) return null;
    
    // Check if expired
    if (new Date() > resetToken.expiresAt) {
      await resetTokens.deleteOne({ token });
      return null;
    }
    return resetToken;
  }

  async deletePasswordResetToken(token) {
    if (this.inMemoryStorage) {
      if (this.inMemoryStorage.passwordResetTokens) {
        this.inMemoryStorage.passwordResetTokens.delete(token);
      }
      return true;
    }

    if (!this.db) return false;
    const resetTokens = this.db.collection('passwordResetTokens');
    await resetTokens.deleteOne({ token });
    return true;
  }

  async updateEmailAccountPassword(email, passwordHash) {
    const normalizedEmail = email.toLowerCase();
    console.log('[Database] Updating password for email:', normalizedEmail);
    
    if (this.inMemoryStorage) {
      const account = this.inMemoryStorage.emailAccounts.get(normalizedEmail);
      if (account) {
        account.passwordHash = passwordHash;
        console.log('[Database] Password updated in in-memory emailAccounts');
        return true;
      }
      console.log('[Database] Email account not found in in-memory storage');
      return false;
    }

    if (!this.db) {
      console.log('[Database] No database connection');
      return false;
    }
    
    const emailAccounts = this.db.collection('emailAccounts');
    const result = await emailAccounts.updateOne(
      { email: normalizedEmail },
      { $set: { passwordHash } }
    );
    
    console.log('[Database] MongoDB update result:', result.matchedCount, 'matched,', result.modifiedCount, 'modified');
    return result.matchedCount > 0;
  }

  async getUserByEmail(email) {
    const normalizedEmail = email.toLowerCase();
    console.log('[Database] getUserByEmail called with:', normalizedEmail);
    console.log('[Database] Using MongoDB:', !!this.db, 'Using in-memory:', !!this.inMemoryStorage);
    
    if (this.inMemoryStorage) {
      // Check email accounts collection first
      const account = this.inMemoryStorage.emailAccounts.get(normalizedEmail);
      if (account) {
        console.log('[Database] Found in emailAccounts (in-memory)');
        return this.getPlayer(account.userId);
      }
      
      // Also check players collection for social sign-in accounts with email
      for (const [playerId, player] of this.inMemoryStorage.players.entries()) {
        if (player.email && player.email.toLowerCase() === normalizedEmail) {
          console.log('[Database] Found in players (in-memory):', player.id);
          return player;
        }
      }
      console.log('[Database] Not found in in-memory storage');
      return null;
    }

    if (!this.db) {
      console.log('[Database] No database connection!');
      return null;
    }
    
    // Check email accounts collection first
    console.log('[Database] Checking emailAccounts collection...');
    const emailAccounts = this.db.collection('emailAccounts');
    const account = await emailAccounts.findOne({ email: normalizedEmail });
    if (account) {
      console.log('[Database] Found in emailAccounts collection, userId:', account.userId);
      const player = await this.getPlayer(account.userId);
      console.log('[Database] getPlayer returned:', player ? `Found: ${player.id}` : 'null');
      if (player) {
        return player;
      }
      // If emailAccount exists but player doesn't, continue to check players collection
      console.log('[Database] Player not found for emailAccount, checking players collection...');
    }
    
    // Also check players collection for social sign-in accounts with email
    console.log('[Database] Checking players collection...');
    const players = this.db.collection('players');
    const player = await players.findOne({ email: normalizedEmail });
    console.log('[Database] Player search result:', player ? `Found: ${player.id}` : 'Not found');
    return player;
  }

  // Community Background Methods
  async saveCommunityBackground(background) {
    if (this.inMemoryStorage) {
      if (!this.inMemoryStorage.communityBackgrounds) {
        this.inMemoryStorage.communityBackgrounds = new Map();
      }
      this.inMemoryStorage.communityBackgrounds.set(background.id, background);
      return true;
    }

    if (!this.db) return false;
    const communityBackgrounds = this.db.collection('communityBackgrounds');
    await communityBackgrounds.updateOne(
      { id: background.id },
      { $set: background },
      { upsert: true }
    );
    return true;
  }

  async getCommunityBackground(backgroundId) {
    if (this.inMemoryStorage) {
      if (!this.inMemoryStorage.communityBackgrounds) {
        return null;
      }
      return this.inMemoryStorage.communityBackgrounds.get(backgroundId) || null;
    }

    if (!this.db) return null;
    const communityBackgrounds = this.db.collection('communityBackgrounds');
    return await communityBackgrounds.findOne({ id: backgroundId });
  }

  async getCommunityBackgrounds(options = {}) {
    const { limit = 50, skip = 0, sortBy = 'uploadedAt', sortOrder = -1, status = 'approved' } = options;
    
    if (this.inMemoryStorage) {
      if (!this.inMemoryStorage.communityBackgrounds) {
        return [];
      }
      let backgrounds = Array.from(this.inMemoryStorage.communityBackgrounds.values());
      
      // Filter by status
      if (status) {
        backgrounds = backgrounds.filter(bg => bg.status === status);
      }
      
      // Sort
      backgrounds.sort((a, b) => {
        if (sortBy === 'likes') {
          return sortOrder === -1 ? (b.likes || 0) - (a.likes || 0) : (a.likes || 0) - (b.likes || 0);
        } else if (sortBy === 'downloads') {
          return sortOrder === -1 ? (b.downloads || 0) - (a.downloads || 0) : (a.downloads || 0) - (b.downloads || 0);
        } else { // uploadedAt
          const aTime = new Date(a.uploadedAt).getTime();
          const bTime = new Date(b.uploadedAt).getTime();
          return sortOrder === -1 ? bTime - aTime : aTime - bTime;
        }
      });
      
      return backgrounds.slice(skip, skip + limit);
    }

    if (!this.db) return [];
    const communityBackgrounds = this.db.collection('communityBackgrounds');
    const query = status ? { status } : {};
    return await communityBackgrounds
      .find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  async incrementBackgroundDownloads(backgroundId) {
    if (this.inMemoryStorage) {
      if (!this.inMemoryStorage.communityBackgrounds) {
        return false;
      }
      const background = this.inMemoryStorage.communityBackgrounds.get(backgroundId);
      if (background) {
        background.downloads = (background.downloads || 0) + 1;
        return true;
      }
      return false;
    }

    if (!this.db) return false;
    const communityBackgrounds = this.db.collection('communityBackgrounds');
    const result = await communityBackgrounds.updateOne(
      { id: backgroundId },
      { $inc: { downloads: 1 } }
    );
    return result.modifiedCount > 0;
  }

  async likeBackground(backgroundId, userId) {
    if (this.inMemoryStorage) {
      if (!this.inMemoryStorage.communityBackgrounds) {
        return { success: false, message: 'Background not found' };
      }
      const background = this.inMemoryStorage.communityBackgrounds.get(backgroundId);
      if (!background) {
        return { success: false, message: 'Background not found' };
      }
      
      if (!background.likedBy) background.likedBy = [];
      
      if (background.likedBy.includes(userId)) {
        // Unlike
        background.likedBy = background.likedBy.filter(id => id !== userId);
        background.likes = Math.max(0, (background.likes || 0) - 1);
        return { success: true, liked: false, likes: background.likes };
      } else {
        // Like
        background.likedBy.push(userId);
        background.likes = (background.likes || 0) + 1;
        return { success: true, liked: true, likes: background.likes };
      }
    }

    if (!this.db) return { success: false, message: 'Database not connected' };
    const communityBackgrounds = this.db.collection('communityBackgrounds');
    const background = await communityBackgrounds.findOne({ id: backgroundId });
    
    if (!background) {
      return { success: false, message: 'Background not found' };
    }
    
    const likedBy = background.likedBy || [];
    const isLiked = likedBy.includes(userId);
    
    if (isLiked) {
      // Unlike
      await communityBackgrounds.updateOne(
        { id: backgroundId },
        { 
          $pull: { likedBy: userId },
          $inc: { likes: -1 }
        }
      );
      return { success: true, liked: false, likes: (background.likes || 1) - 1 };
    } else {
      // Like
      await communityBackgrounds.updateOne(
        { id: backgroundId },
        { 
          $addToSet: { likedBy: userId },
          $inc: { likes: 1 }
        }
      );
      return { success: true, liked: true, likes: (background.likes || 0) + 1 };
    }
  }

  async reportBackground(backgroundId, userId, reason) {
    if (this.inMemoryStorage) {
      if (!this.inMemoryStorage.backgroundReports) {
        this.inMemoryStorage.backgroundReports = new Map();
      }
      const crypto = require('crypto');
      const reportId = `report_${crypto.randomUUID()}`;
      this.inMemoryStorage.backgroundReports.set(reportId, {
        id: reportId,
        backgroundId,
        userId,
        reason,
        reportedAt: new Date(),
        status: 'pending'
      });
      return true;
    }

    if (!this.db) return false;
    const crypto = require('crypto');
    const reports = this.db.collection('backgroundReports');
    await reports.insertOne({
      id: `report_${crypto.randomUUID()}`,
      backgroundId,
      userId,
      reason,
      reportedAt: new Date(),
      status: 'pending'
    });
    return true;
  }

  async close() {
    if (this.client) {
      await this.client.close();
    }
  }
}

module.exports = new DatabaseService();
