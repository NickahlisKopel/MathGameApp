const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const database = require('./database');

const app = express();
const server = http.createServer(app);

// Add JSON body parser
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST'],
  },
});

// Matchmaking queues by difficulty
const matchmakingQueues = {
  easy: [],
  medium: [],
  hard: [],
};

// Active game rooms
const gameRooms = new Map();

// Helper function to end a game
function endGame(roomId, reason) {
  const room = gameRooms.get(roomId);
  if (!room || room.gameEnded) return;
  
  room.gameEnded = true;
  
  // Clear the timer if it exists
  if (room.timerTimeout) {
    clearTimeout(room.timerTimeout);
  }
  
  console.log(`[Server] Game ${roomId} ending. Reason: ${reason}`);
  
  // Get scores
  const scores = {};
  room.players.forEach(p => {
    scores[p.id] = p.score;
  });
  
  // Determine winner
  let winner;
  const sortedPlayers = [...room.players].sort((a, b) => {
    // First compare by score
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // If tied, use completion time (faster wins)
    const aTime = room.completionTimes[a.id] || Infinity;
    const bTime = room.completionTimes[b.id] || Infinity;
    return aTime - bTime;
  });
  
  winner = sortedPlayers[0].id;
  
  const winnerPlayer = sortedPlayers[0];
  const loserPlayer = sortedPlayers[1];
  const winnerTime = room.completionTimes[winner] || 'N/A';
  
  console.log(`[Server] Game ${roomId} results:`);
  console.log(`  Winner: ${winnerPlayer.name} (Score: ${winnerPlayer.score}, Time: ${winnerTime})`);
  console.log(`  Loser: ${loserPlayer.name} (Score: ${loserPlayer.score}, Time: ${room.completionTimes[loserPlayer.id] || 'N/A'})`);
  
  io.to(roomId).emit('game-end', {
    winner,
    scores,
    completionTimes: room.completionTimes,
    questions: room.questions, // Include all questions and answers
  });
  
  // Clean up room after a delay
  setTimeout(() => {
    gameRooms.delete(roomId);
    console.log(`[Server] Room ${roomId} cleaned up`);
  }, 5000);
}

// Track online users
const onlineUsers = new Map(); // userId -> { socketId, userName }

// Friend Challenge System - MUST be outside connection handler to be shared across all sockets
const pendingChallenges = new Map(); // Store challenge details with timeout
const lookingForGame = new Map(); // Track players looking for game: userId -> { difficulty, timestamp, userName, friendIds }

io.on('connection', (socket) => {
  console.log(`[Server] User connected: ${socket.id}`);
  
  const userId = socket.handshake.auth.userId;
  const userName = socket.handshake.auth.userName;
  
  // Store userId and userName on socket for easy lookups
  socket.userId = userId;
  socket.userName = userName;
  
  // Add to online users
  onlineUsers.set(userId, { socketId: socket.id, userName });
  console.log(`[Server] ${userName} is now online. Total online: ${onlineUsers.size}`);
  
  // Notify friends that this user is online
  socket.on('get-friends-status', async ({ friendIds }) => {
    console.log(`[Server] ${userName} checking status of friends:`, friendIds);
    console.log('[Server] Currently online users:', Array.from(onlineUsers.keys()));
    const onlineFriends = friendIds.filter(id => onlineUsers.has(id));
    console.log(`[Server] Online friends for ${userName}:`, onlineFriends);
    socket.emit('friends-status', { onlineFriends });
  });

  socket.on('join-matchmaking', ({ difficulty }) => {
    console.log(`[Server] ${userName} joined ${difficulty} matchmaking`);
    
    const queue = matchmakingQueues[difficulty];
    
    // Check if there's someone waiting
    if (queue.length > 0) {
      const opponent = queue.shift();
      
      // Create a game room
      const roomId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add both players to the room
      socket.join(roomId);
      opponent.socket.join(roomId);
      
      // Store room data
      gameRooms.set(roomId, {
        players: [
          { id: opponent.userId, name: opponent.userName, socketId: opponent.socket.id, score: 0 },
          { id: userId, name: userName, socketId: socket.id, score: 0 },
        ],
        difficulty,
        startTime: null,
        completionTimes: {},
        playersCompleted: 0,
        timerTimeout: null,
        questions: [], // Track all questions and answers
      });
      
      // Notify both players
      opponent.socket.emit('match-found', {
        roomId,
        opponent: { id: userId, name: userName },
        isHost: true,
      });
      
      socket.emit('match-found', {
        roomId,
        opponent: { id: opponent.userId, name: opponent.userName },
        isHost: false,
      });
      
      console.log(`[Server] Match created: ${roomId}`);
      
      // Auto-start game after 3 seconds
      setTimeout(() => {
        const room = gameRooms.get(roomId);
        if (room) {
          const startTime = Date.now();
          room.startTime = startTime;
          io.to(roomId).emit('game-start', { startTime });
          
          // Set 2-minute (120 seconds) timeout
          room.timerTimeout = setTimeout(() => {
            endGame(roomId, 'timeout');
          }, 120000); // 120 seconds = 2 minutes
        }
      }, 3000);
      
    } else {
      // Add to queue
      queue.push({ socket, userId, userName });
      console.log(`[Server] ${userName} added to queue (${queue.length} waiting)`);
    }
  });

  socket.on('leave-matchmaking', () => {
    // Remove from all queues
    for (const difficulty in matchmakingQueues) {
      const queue = matchmakingQueues[difficulty];
      const index = queue.findIndex(p => p.socket.id === socket.id);
      if (index !== -1) {
        queue.splice(index, 1);
        console.log(`[Server] ${userName} left matchmaking`);
      }
    }
  });

  socket.on('submit-answer', ({ roomId, answer, correct, timeSpent, question, correctAnswer }) => {
    const room = gameRooms.get(roomId);
    if (!room) return;
    
    // Find player and update score
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;
    
    if (correct) {
      player.score += 10;
    }
    
    console.log(`[Server] ${userName} answered (correct: ${correct}), score: ${player.score}`);
    
    // Track this question and answer
    if (!room.questionsAnswered) room.questionsAnswered = {};
    if (!room.questionsAnswered[player.id]) room.questionsAnswered[player.id] = 0;
    const questionNumber = room.questionsAnswered[player.id];
    
    // Store question data - each player has their own questions
    if (!room.questions[questionNumber]) {
      room.questions[questionNumber] = {
        answers: {}
      };
    }
    
    // Store player's specific question and answer
    room.questions[questionNumber].answers[player.id] = {
      playerId: player.id,
      playerName: player.name,
      question: question || 'N/A',
      correctAnswer: correctAnswer || 0,
      answer,
      correct,
      timeSpent,
    };
    
    room.questionsAnswered[player.id]++;
    
    // Broadcast answer to room
    io.to(roomId).emit('player-answer', {
      playerId: player.id,
      answer,
      correct,
      timeSpent,
    });
    
    // Broadcast score update
    io.to(roomId).emit('score-update', {
      playerId: player.id,
      score: player.score,
    });
  });

  socket.on('player-completed', ({ roomId, completionTime }) => {
    const room = gameRooms.get(roomId);
    if (!room || room.gameEnded) return;
    
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;
    
    console.log(`[Server] ${userName} completed all questions in ${completionTime.toFixed(2)}s`);
    
    // Store completion time
    room.completionTimes[player.id] = completionTime;
    room.playersCompleted++;
    
    // Notify all players about completion
    io.to(roomId).emit('player-completed', {
      playerId: player.id,
      completionTime,
    });
    
    // End game if both players completed
    if (room.playersCompleted >= 2) {
      endGame(roomId, 'both-completed');
    }
  });

  socket.on('leave-room', ({ roomId }) => {
    console.log(`[Server] ${userName} left room ${roomId}`);
    socket.leave(roomId);
    
    // Notify other players
    socket.to(roomId).emit('opponent-disconnect');
    
    // Clean up room if empty
    const room = gameRooms.get(roomId);
    if (room) {
      const remainingPlayers = room.players.filter(p => p.socketId !== socket.id);
      if (remainingPlayers.length === 0) {
        gameRooms.delete(roomId);
        console.log(`[Server] Room ${roomId} deleted`);
      }
    }
  });

  // Friend Challenge System handlers
  socket.on('send-friend-challenge', async ({ friendId, difficulty }) => {
    console.log(`[Server] ${userName} (userId: ${userId}) challenging friend (friendId: ${friendId}) on ${difficulty}`);
    
    // Find friend's socket
    console.log(`[Server] Searching for friend socket with userId: ${friendId}`);
    console.log(`[Server] All connected users:`, Array.from(io.sockets.sockets.values()).map(s => ({ userId: s.userId, userName: s.userName })));
    const friendSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === friendId);
    console.log(`[Server] Friend socket found:`, friendSocket ? `${friendSocket.userId} (${friendSocket.userName})` : 'NOT FOUND');
    
    if (!friendSocket) {
      console.log(`[Server] Friend ${friendId} is not connected. Connected users:`, 
        Array.from(io.sockets.sockets.values()).map(s => s.userId));
      socket.emit('challenge-error', { message: 'Your friend is not currently online. Make sure they have opened the app and are connected.' });
      return;
    }
    
    const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create lobby with 30-second timeout
    const timeoutId = setTimeout(() => {
      const challenge = pendingChallenges.get(challengeId);
      if (challenge) {
        console.log(`[Server] Challenge ${challengeId} timed out`);
        
        // Notify challenger that friend didn't join
        const challengerSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === challenge.challengerId);
        if (challengerSocket) {
          challengerSocket.emit('challenge-timeout', {
            message: "They couldn't currently join, try again later"
          });
        }
        
        // Notify friend that challenge expired
        const fSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === challenge.friendId);
        if (fSocket) {
          fSocket.emit('challenge-expired', { challengeId });
        }
        
        pendingChallenges.delete(challengeId);
      }
    }, 30000); // 30 seconds
    
    // Store challenge details with timeout
    pendingChallenges.set(challengeId, {
      challengerId: userId,
      challengerName: userName,
      friendId,
      difficulty,
      timeoutId,
      createdAt: Date.now(),
    });
    
    // Send challenge to friend
    friendSocket.emit('friend-challenge-received', {
      challengeId,
      from: { id: userId, name: userName },
      difficulty,
      expiresIn: 30, // seconds
    });
    
    // Notify challenger that lobby is created and waiting
    socket.emit('challenge-lobby-created', {
      challengeId,
      friendId,
      friendName: friendSocket.userName,
      difficulty,
      expiresIn: 30,
    });
    
    console.log(`[Server] Challenge ${challengeId} sent to ${friendId}, waiting for response...`);
  });

  socket.on('accept-friend-challenge', ({ challengeId, challengerId }) => {
    console.log(`[Server] ${userName} (${userId}) accepted challenge ${challengeId}`);
    
    const challenge = pendingChallenges.get(challengeId);
    if (!challenge) {
      console.log(`[Server] Challenge ${challengeId} not found in pending challenges`);
      socket.emit('challenge-error', { message: 'Challenge expired or invalid' });
      return;
    }
    
    console.log(`[Server] Challenge found:`, challenge);
    
    // Clear the timeout since friend joined
    if (challenge.timeoutId) {
      clearTimeout(challenge.timeoutId);
    }
    
    // Find challenger's socket
    console.log(`[Server] Looking for challenger with userId:`, challenge.challengerId);
    console.log(`[Server] Connected sockets:`, Array.from(io.sockets.sockets.values()).map(s => ({ id: s.userId, name: s.userName })));
    const challengerSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === challenge.challengerId);
    
    if (!challengerSocket) {
      console.log(`[Server] Challenger ${challenge.challengerId} not found among connected sockets`);
      socket.emit('challenge-error', { message: 'Challenger is no longer online' });
      pendingChallenges.delete(challengeId);
      return;
    }
    
    console.log(`[Server] Found challenger socket:`, challengerSocket.userId, challengerSocket.userName);
    
    // Create game room
    const roomId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const difficulty = challenge.difficulty;
    
    socket.join(roomId);
    challengerSocket.join(roomId);
    
    gameRooms.set(roomId, {
      players: [
        { id: challenge.challengerId, name: challenge.challengerName, socketId: challengerSocket.id, score: 0 },
        { id: userId, name: userName, socketId: socket.id, score: 0 },
      ],
      difficulty,
      startTime: null,
      completionTimes: {},
      playersCompleted: 0,
      timerTimeout: null,
      questions: [],
    });
    
    challengerSocket.emit('match-found', {
      roomId,
      opponent: { id: userId, name: userName },
      isHost: true,
    });
    
    socket.emit('match-found', {
      roomId,
      opponent: { id: challenge.challengerId, name: challenge.challengerName },
      isHost: false,
    });
    
    console.log(`[Server] Friend challenge match created: ${roomId} (${difficulty})`);
    
    // Clean up challenge
    pendingChallenges.delete(challengeId);
    
    // Auto-start game
    console.log(`[Server] Setting up auto-start for room ${roomId} in 3 seconds...`);
    setTimeout(() => {
      console.log(`[Server] Auto-starting game for room ${roomId}`);
      const room = gameRooms.get(roomId);
      if (room) {
        console.log(`[Server] Room found, starting game...`);
        const startTime = Date.now();
        room.startTime = startTime;
        console.log(`[Server] Emitting game-start to room ${roomId}`);
        io.to(roomId).emit('game-start', { startTime });
        
        room.timerTimeout = setTimeout(() => {
          endGame(roomId, 'timeout');
        }, 120000);
      } else {
        console.log(`[Server] ERROR: Room ${roomId} not found when trying to start game!`);
      }
    }, 3000);
  });

  socket.on('decline-friend-challenge', ({ challengeId, challengerId }) => {
    console.log(`[Server] ${userName} declined challenge ${challengeId}`);
    
    const challenge = pendingChallenges.get(challengeId);
    if (challenge) {
      // Clear the timeout
      if (challenge.timeoutId) {
        clearTimeout(challenge.timeoutId);
      }
      
      const challengerSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === challenge.challengerId);
      
      if (challengerSocket) {
        challengerSocket.emit('friend-challenge-declined', {
          from: { id: userId, name: userName },
        });
      }
      
      pendingChallenges.delete(challengeId);
    }
  });

  // Looking for Game System
  socket.on('start-looking-for-game', async ({ difficulty, friendIds }) => {
    console.log(`[Server] ${userName} is looking for game on ${difficulty} with friends:`, friendIds);
    
    // Add to looking for game
    lookingForGame.set(userId, {
      difficulty,
      timestamp: Date.now(),
      userName,
      friendIds: friendIds || [],
    });
    
    // Get friends who are also looking for game
    const availableFriends = [];
    for (const friendId of (friendIds || [])) {
      if (lookingForGame.has(friendId)) {
        const friendInfo = lookingForGame.get(friendId);
        const friendSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === friendId);
        if (friendSocket) {
          availableFriends.push({
            id: friendId,
            name: friendSocket.userName,
            difficulty: friendInfo.difficulty,
          });
        }
      }
    }
    
    console.log(`[Server] ${userName} found ${availableFriends.length} friends looking for game`);
    socket.emit('available-friends-update', { friends: availableFriends });
    
    // Notify friends that this user is now looking
    for (const friendId of (friendIds || [])) {
      const friendSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === friendId);
      if (friendSocket && lookingForGame.has(friendId)) {
        friendSocket.emit('friend-started-looking', {
          friend: { id: userId, name: userName, difficulty },
        });
      }
    }
  });

  socket.on('stop-looking-for-game', () => {
    console.log(`[Server] ${userName} stopped looking for game`);
    const lookingData = lookingForGame.get(userId);
    lookingForGame.delete(userId);
    
    // Notify friends that this user stopped looking
    if (lookingData && lookingData.friendIds) {
      for (const friendId of lookingData.friendIds) {
        const friendSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === friendId);
        if (friendSocket && lookingForGame.has(friendId)) {
          friendSocket.emit('friend-stopped-looking', {
            friendId: userId,
          });
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Server] User disconnected: ${socket.id}`);
    
    // Remove from online users
    if (userId) {
      onlineUsers.delete(userId);
      console.log(`[Server] ${userName} is now offline. Total online: ${onlineUsers.size}`);
      
      // Remove from looking for game
      const lookingData = lookingForGame.get(userId);
      lookingForGame.delete(userId);
      
      // Notify friends that this user stopped looking
      if (lookingData && lookingData.friendIds) {
        for (const friendId of lookingData.friendIds) {
          const friendSocket = Array.from(io.sockets.sockets.values()).find(s => s.userId === friendId);
          if (friendSocket && lookingForGame.has(friendId)) {
            friendSocket.emit('friend-stopped-looking', {
              friendId: userId,
            });
          }
        }
      }
    }
    
    // Remove from matchmaking queues
    for (const difficulty in matchmakingQueues) {
      const queue = matchmakingQueues[difficulty];
      const index = queue.findIndex(p => p.socket.id === socket.id);
      if (index !== -1) {
        queue.splice(index, 1);
      }
    }
    
    // Handle active games
    for (const [roomId, room] of gameRooms.entries()) {
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        // Clear timer if exists
        if (room.timerTimeout) {
          clearTimeout(room.timerTimeout);
        }
        
        // Notify opponent
        socket.to(roomId).emit('opponent-disconnect');
        
        // Clean up room
        gameRooms.delete(roomId);
        console.log(`[Server] Room ${roomId} ended due to disconnect`);
      }
    }
  });
});

// REST API Endpoints for Friends System

// Sync player data
app.post('/api/player/sync', async (req, res) => {
  try {
    const { player } = req.body;
    if (!player || !player.id) {
      return res.status(400).json({ error: 'Invalid player data' });
    }
    
    console.log(`[API] Syncing player: ${player.username} (${player.id})`);
    await database.savePlayer(player);
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error syncing player:', error);
    res.status(500).json({ error: 'Failed to sync player' });
  }
});

// Get player by ID
app.get('/api/player/:playerId', async (req, res) => {
  try {
    const player = await database.getPlayer(req.params.playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json({ player });
  } catch (error) {
    console.error('[API] Error getting player:', error);
    res.status(500).json({ error: 'Failed to get player' });
  }
});

// Search players
app.get('/api/players/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter required' });
    }
    
    console.log(`[API] Searching for players: "${q}"`);
    const results = await database.searchPlayers(q);
    console.log(`[API] Found ${results.length} players:`, results.map(p => `${p.username} (${p.id})`));
    res.json({ players: results });
  } catch (error) {
    console.error('[API] Error searching players:', error);
    res.status(500).json({ error: 'Failed to search players' });
  }
});

// Send friend request
app.post('/api/friends/request', async (req, res) => {
  try {
    const { fromPlayerId, toPlayerId, fromUsername } = req.body;
    
    console.log(`[API] Friend request: ${fromUsername} (${fromPlayerId}) → player ${toPlayerId}`);
    const success = await database.addFriendRequest(fromPlayerId, toPlayerId, fromUsername);
    
    if (!success) {
      console.log(`[API] Friend request failed (already friends or pending request)`);
      return res.status(400).json({ error: 'Cannot send friend request' });
    }
    
    console.log(`[API] Friend request sent successfully`);
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Get friend requests
app.get('/api/friends/requests/:playerId', async (req, res) => {
  try {
    const requests = await database.getFriendRequests(req.params.playerId);
    console.log(`[API] Getting friend requests for ${req.params.playerId}: ${requests.length} pending`);
    res.json({ requests });
  } catch (error) {
    console.error('[API] Error getting friend requests:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

// Accept friend request
app.post('/api/friends/accept', async (req, res) => {
  try {
    const { playerId, requestId } = req.body;
    
    const success = await database.acceptFriendRequest(playerId, requestId);
    
    if (!success) {
      return res.status(400).json({ error: 'Cannot accept friend request' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// Reject friend request
app.post('/api/friends/reject', async (req, res) => {
  try {
    const { playerId, requestId } = req.body;
    
    const success = await database.rejectFriendRequest(playerId, requestId);
    
    if (!success) {
      return res.status(400).json({ error: 'Cannot reject friend request' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error rejecting friend request:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

// Remove friend
app.post('/api/friends/remove', async (req, res) => {
  try {
    const { playerId, friendId } = req.body;
    
    const success = await database.removeFriend(playerId, friendId);
    
    if (!success) {
      return res.status(400).json({ error: 'Cannot remove friend' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

const PORT = process.env.PORT || 3000;

// Initialize database and start server
database.connect().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('[Server] Socket.IO server running on port', PORT);
    console.log('[Server] Environment:', process.env.NODE_ENV || 'development');
    if (process.env.NODE_ENV === 'production') {
      console.log('[Server] Server is running in production mode');
    } else {
      console.log('[Server] Players can connect to: http://localhost:' + PORT);
      console.log('[Server] REST API available at: http://localhost:' + PORT + '/api');
    }
  });
});
