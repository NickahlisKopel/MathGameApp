const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const database = require('./database');
const emailService = require('./emailService');
const logger = require('./logger');
// Track friend request attempts for simple rate limiting (in-memory)
const friendRequestAttempts = new Map(); // key: from->to, value: timestamps array

const app = express();
const server = http.createServer(app);

// Add JSON body parser
app.use(express.json());

// Serve static files from public directory
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Math Game Multiplayer Server', 
    timestamp: new Date().toISOString(),
    version: '1.3.0',
    features: ['email-verification', 'password-reset', 'community-backgrounds'],
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    emailConfigured: emailService.isConfigured(),
    version: '1.3.0',
  });
});

// Database reset endpoint (DANGEROUS - use with caution)
app.post('/api/admin/reset-database', async (req, res) => {
  try {
    const { confirmationKey } = req.body;
    
    // Require a confirmation key to prevent accidental resets
    if (confirmationKey !== 'RESET_ALL_DATA_CONFIRM') {
      return res.status(403).json({ 
        error: 'Invalid confirmation key',
        message: 'Include confirmationKey: "RESET_ALL_DATA_CONFIRM" in request body'
      });
    }
    
    console.log('[API] ⚠️ DATABASE RESET REQUESTED ⚠️');
    const result = await database.resetDatabase();
    
    if (result.success) {
      console.log('[API] ✅ Database reset completed successfully');
      res.json({
        success: true,
        message: result.message,
        deleted: result.deleted,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Reset failed',
        message: result.message
      });
    }
  } catch (error) {
    console.error('[API] Error resetting database:', error);
    res.status(500).json({ 
      error: 'Failed to reset database',
      message: error.message 
    });
  }
});

// Email Verification Endpoints
app.post('/api/email/send-verification', async (req, res) => {
  try {
    const { email, userId } = req.body;

    if (!email || !userId) {
      return res.status(400).json({ error: 'Email and userId are required' });
    }

    // Check if email verification is configured
    if (!emailService.isConfigured()) {
      return res.json({ 
        success: false, 
        message: 'Email verification not configured on server',
        skipVerification: true 
      });
    }

    // Generate verification token
    const token = emailService.generateVerificationToken();
    
    // Save verification token to database
    await database.createEmailVerification(token, email, userId);
    
    // Save email account (unverified)
    await database.saveEmailAccount(email, userId, false);
    
    // Send verification email
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const result = await emailService.sendVerificationEmail(email, token, baseUrl);
    
    res.json(result);
  } catch (error) {
    console.error('[API] Error sending verification email:', error);
    res.status(500).json({ 
      error: 'Failed to send verification email',
      message: error.message 
    });
  }
});

app.get('/api/email/verify', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send('<h1>Invalid verification link</h1><p>No token provided.</p>');
    }

    // Get verification record
    const verification = await database.getEmailVerification(token);
    
    if (!verification) {
      return res.status(400).send('<h1>Invalid or expired link</h1><p>This verification link is invalid or has already been used.</p>');
    }

    // Check if token is expired (24 hours)
    const tokenAge = Date.now() - new Date(verification.createdAt).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (tokenAge > maxAge) {
      await database.deleteEmailVerification(token);
      return res.status(400).send('<h1>Link expired</h1><p>This verification link has expired. Please request a new one.</p>');
    }

    // Mark email as verified
    await database.markEmailVerified(verification.email);
    
    // Delete the verification token
    await database.deleteEmailVerification(token);
    
    console.log(`[API] Email verified: ${verification.email}`);
    
    // Success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verified - Math Game App</title>
        <style>
          body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .container { background: white; padding: 40px; border-radius: 10px; max-width: 500px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
          h1 { color: #4CAF50; margin-bottom: 20px; }
          p { color: #666; line-height: 1.6; }
          .icon { font-size: 64px; margin-bottom: 20px; }
          .button { display: inline-block; margin-top: 20px; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">✅</div>
          <h1>Email Verified!</h1>
          <p>Your email address has been successfully verified. You can now return to the Math Game App and enjoy all features.</p>
          <p style="font-size: 14px; color: #999; margin-top: 30px;">You can safely close this window.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('[API] Error verifying email:', error);
    res.status(500).send('<h1>Error</h1><p>An error occurred while verifying your email. Please try again later.</p>');
  }
});

app.get('/api/email/status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const account = await database.getEmailAccount(email);
    
    if (!account) {
      return res.json({ exists: false, verified: false });
    }
    
    res.json({ 
      exists: true, 
      verified: account.verified || false,
      userId: account.userId 
    });
  } catch (error) {
    console.error('[API] Error checking email status:', error);
    res.status(500).json({ error: 'Failed to check email status' });
  }
});

app.post('/api/email/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if email verification is configured
    if (!emailService.isConfigured()) {
      return res.json({ 
        success: false, 
        message: 'Email verification not configured on server' 
      });
    }

    // Get email account
    const account = await database.getEmailAccount(email);
    
    if (!account) {
      return res.status(404).json({ error: 'Email not found' });
    }

    if (account.verified) {
      return res.json({ success: false, message: 'Email already verified' });
    }

    // Generate new verification token
    const token = emailService.generateVerificationToken();
    
    // Save new verification token
    await database.createEmailVerification(token, email, account.userId);
    
    // Send verification email
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const result = await emailService.sendVerificationEmail(email, token, baseUrl);
    
    res.json(result);
  } catch (error) {
    console.error('[API] Error resending verification email:', error);
    res.status(500).json({ 
      error: 'Failed to resend verification email',
      message: error.message 
    });
  }
});

// Request password reset
app.post('/api/email/request-reset', async (req, res) => {
  try {
    console.log('[API] ===== PASSWORD RESET REQUEST STARTED =====');
    const { email } = req.body;
    console.log('[API] Email from request:', email);

    if (!email) {
      console.log('[API] No email provided');
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if email service is configured
    console.log('[API] Checking if email service is configured...');
    const isConfigured = emailService.isConfigured();
    console.log('[API] Email service configured:', isConfigured);
    
    if (!isConfigured) {
      console.log('[API] Email service NOT configured, returning error');
      return res.json({ 
        success: false, 
        message: 'Password reset not available - email service not configured' 
      });
    }

    // Get user by email
    console.log('[API] Looking up user by email:', email);
    const user = await database.getUserByEmail(email);
    console.log('[API] User found:', user ? `Yes (id: ${user.id}, username: ${user.username}, email: ${user.email})` : 'No');
    
    if (!user) {
      console.log('[API] Searching all players to debug...');
      // Debug: Let's see what's in the database
      const allPlayers = await database.db?.collection('players').find({}).limit(10).toArray();
      if (allPlayers) {
        console.log('[API] Sample players in database:', allPlayers.map(p => ({
          id: p.id,
          username: p.username,
          email: p.email || 'NO EMAIL',
          hasEmail: !!p.email
        })));
      }
    }
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ 
        success: true, 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    console.log('[API] Generating reset token...');
    const token = emailService.generateVerificationToken();
    console.log('[API] Token generated (first 8 chars):', token.substring(0, 8));
    
    // Save reset token
    console.log('[API] Saving reset token to database...');
    await database.createPasswordResetToken(token, email, user.id);
    console.log('[API] Token saved successfully');
    
    // Send reset email
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    console.log('[API] Sending password reset email to:', email);
    console.log('[API] Using base URL:', baseUrl);
    const result = await emailService.sendPasswordResetEmail(email, token, baseUrl);
    
    // Log the result for debugging
    console.log('[API] Password reset email result:', JSON.stringify(result, null, 2));
    
    // Always return success message for security (don't reveal if email exists)
    // But log actual errors on server side
    if (!result.success) {
      console.error('[API] ❌ Failed to send password reset email:', result.message);
      console.error('[API] Full error details:', result);
    } else {
      console.log('[API] ✅ Password reset email sent successfully');
    }
    
    console.log('[API] ===== PASSWORD RESET REQUEST COMPLETED =====');
    res.json({ 
      success: true, 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('[API] ❌ ERROR requesting password reset:', error);
    console.error('[API] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to request password reset',
      message: error.message 
    });
  }
});

// Verify reset token (for displaying reset form)
app.get('/api/email/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const resetToken = await database.getPasswordResetToken(token);
    
    if (!resetToken) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token',
        expired: true 
      });
    }

    res.json({ 
      valid: true,
      email: resetToken.email 
    });
  } catch (error) {
    console.error('[API] Error verifying reset token:', error);
    res.status(500).json({ 
      error: 'Failed to verify reset token',
      message: error.message 
    });
  }
});

// Reset password with token
app.post('/api/email/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ error: 'Password must be 8-128 characters' });
    }

    // Verify token
    const resetToken = await database.getPasswordResetToken(token);
    
    if (!resetToken) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token',
        expired: true 
      });
    }

    // Get user
    const user = await database.getUserByEmail(resetToken.email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update password (hash it first)
    const crypto = require('crypto');
    const passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    
    console.log('[API] Updating password for user:', resetToken.email);
    
    // Update password in emailAccounts collection (where sign-in checks)
    await database.updateEmailAccountPassword(resetToken.email, passwordHash);
    console.log('[API] Password updated in emailAccounts collection');
    
    // Also update player object if it has passwordHash field (for consistency)
    const updatedUser = { ...user, passwordHash };
    await database.savePlayer(updatedUser);
    console.log('[API] Password updated in player document');
    
    // Delete the reset token
    await database.deletePasswordResetToken(token);
    
    res.json({ 
      success: true,
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('[API] Error resetting password:', error);
    res.status(500).json({ 
      error: 'Failed to reset password',
      message: error.message 
    });
  }
});

// Email sign-in validation endpoint
app.post('/api/email/sign-in', async (req, res) => {
  try {
    const { email, passwordHash } = req.body;
    
    console.log('[API] Sign-in attempt for:', email);
    
    if (!email || !passwordHash) {
      return res.status(400).json({ 
        error: 'Email and password hash are required' 
      });
    }

    // Get user by email
    const user = await database.getUserByEmail(email);
    console.log('[API] User lookup result:', user ? 'Found' : 'Not found');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'No account found with this email' 
      });
    }

    // Verify password hash
    if (user.passwordHash !== passwordHash) {
      console.log('[API] Password hash mismatch');
      return res.status(401).json({ 
        error: 'Incorrect password' 
      });
    }

    console.log('[API] Sign-in successful for:', email);
    
    // Return user data (excluding password hash)
    const { passwordHash: _, ...userData } = user;
    res.json({ 
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('[API] Error during sign-in:', error);
    res.status(500).json({ 
      error: 'Sign-in failed',
      message: error.message 
    });
  }
});

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
    const { fromPlayerId, toPlayerId, fromUsername, correlationId } = req.body;
    const trace = correlationId || `srv_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    logger.info('friend_request_received', { trace, fromPlayerId, toPlayerId, fromUsername });
    
    // Validate request
    if (!fromPlayerId || !toPlayerId || !fromUsername) {
      logger.warn('friend_request_invalid', { trace, reason: 'missing_fields' });
      return res.status(400).json({ error: 'Missing required fields', trace });
    }
    
    if (fromPlayerId === toPlayerId) {
      logger.warn('friend_request_invalid', { trace, reason: 'self_request' });
      return res.status(400).json({ error: 'Cannot send friend request to yourself', trace, reason: 'self_request' });
    }

    // Rate limiting per sender->recipient
    const windowMin = parseInt(process.env.FRIEND_REQUEST_RATE_WINDOW_MIN || '30', 10); // 30 minutes default
    const maxAttempts = parseInt(process.env.FRIEND_REQUEST_RATE_MAX || '5', 10); // 5 attempts default
    const windowMs = windowMin * 60 * 1000;
    const rateKey = `${fromPlayerId}->${toPlayerId}`;
    const nowTs = Date.now();
    const attempts = friendRequestAttempts.get(rateKey) || [];
    const recent = attempts.filter(ts => nowTs - ts <= windowMs);
    recent.push(nowTs);
    friendRequestAttempts.set(rateKey, recent);
    if (recent.length > maxAttempts) {
      logger.warn('friend_request_rate_limited', { trace, fromPlayerId, toPlayerId, attempts: recent.length });
      return res.status(429).json({ error: `Too many attempts. Try again later.`, trace, reason: 'rate_limited' });
    }
    
    const result = await database.addFriendRequest(fromPlayerId, toPlayerId, fromUsername, trace);
    
    if (result.success && result.autoAccepted) {
      logger.info('friend_request_auto_accepted', { trace, fromPlayerId, toPlayerId });
      return res.json({ success: true, autoAccepted: true, trace, reason: result.reason });
    }
    if (result.success) {
      logger.info('friend_request_saved', { trace, requestId: result.request.id, purged: result.purged, replaced: result.replaced });
      const recipientOnline = onlineUsers.get(toPlayerId);
      if (recipientOnline) {
        logger.info('friend_request_emit', { trace, toPlayerId });
        io.to(recipientOnline.socketId).emit('friend-request-received', { request: result.request });
      }
      return res.json({ success: true, request: result.request, trace, purged: result.purged, replaced: result.replaced, reason: result.reason });
    } else {
      logger.warn('friend_request_failed', { trace, error: result.error });
      return res.status(400).json({ error: result.error || 'Cannot send friend request', trace, reason: result.reason });
    }
  } catch (error) {
    logger.error('friend_request_exception', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Admin purge stale requests
app.post('/api/admin/friends/purge-stale', async (req, res) => {
  try {
    const { confirmationKey, playerId } = req.body;
    if (confirmationKey !== 'RESET_ALL_DATA_CONFIRM') {
      return res.status(403).json({ error: 'Invalid confirmation key' });
    }
    if (playerId) {
      const result = await database.purgeStaleFriendRequests(playerId);
      return res.json({ success: true, playerId, purged: result.purged });
    }
    // All players (in-memory only)
    const results = [];
    if (database.inMemoryStorage) {
      for (const [id] of database.inMemoryStorage.players) {
        results.push(await database.purgeStaleFriendRequests(id));
      }
    }
    res.json({ success: true, results });
  } catch (e) {
    logger.error('purge_stale_exception', { error: e.message });
    res.status(500).json({ error: 'Failed to purge stale requests' });
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

// Check friendship status (debug endpoint)
app.get('/api/friends/status/:playerId1/:playerId2', async (req, res) => {
  try {
    const { playerId1, playerId2 } = req.params;
    const status = await database.checkFriendshipStatus(playerId1, playerId2);
    res.json(status);
  } catch (error) {
    console.error('[API] Error checking friendship status:', error);
    res.status(500).json({ error: 'Failed to check friendship status' });
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

// Community Backgrounds Endpoints

const multer = require('multer');
const fs = require('fs').promises;
const fsSync = require('fs');
const crypto = require('crypto');

// Create uploads directory if it doesn't exist (synchronously to ensure it's ready)
const uploadsDir = path.join(__dirname, 'public', 'backgrounds');
try {
  fsSync.mkdirSync(uploadsDir, { recursive: true });
  console.log('[Server] Uploads directory ready:', uploadsDir);
} catch (err) {
  console.error('[Server] Failed to create uploads directory:', err);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Upload a community background
app.post('/api/community-backgrounds/upload', upload.single('image'), async (req, res) => {
  try {
    console.log('[API] Community background upload request');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { name, description, tags, uploadedBy, uploaderName } = req.body;
    
    if (!name || !uploadedBy || !uploaderName) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate unique ID using UUID for better security
    const backgroundId = `community_${crypto.randomUUID()}`;
    
    // Create background object
    const background = {
      id: backgroundId,
      name,
      description: description || '',
      tags: tags ? JSON.parse(tags) : [],
      imageUrl: `/backgrounds/${req.file.filename}`,
      uploadedBy,
      uploaderName,
      uploadedAt: new Date(),
      status: 'pending', // Requires approval
      likes: 0,
      downloads: 0,
      likedBy: [],
    };

    // Save to database
    await database.saveCommunityBackground(background);
    
    console.log('[API] Community background uploaded:', backgroundId);
    
    res.json({
      success: true,
      background: {
        ...background,
        // Don't send likedBy array in response
        likedBy: undefined,
      },
    });
  } catch (error) {
    console.error('[API] Error uploading background:', error);
    // Clean up file if it was uploaded
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ 
      error: 'Failed to upload background',
      message: error.message 
    });
  }
});

// Get community backgrounds
app.get('/api/community-backgrounds', async (req, res) => {
  try {
    const { limit, skip, sortBy, sortOrder } = req.query;
    
    const options = {
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0,
      sortBy: sortBy || 'uploadedAt',
      sortOrder: parseInt(sortOrder) || -1,
      status: 'approved', // Only show approved backgrounds
    };
    
    const backgrounds = await database.getCommunityBackgrounds(options);
    
    // Remove sensitive data
    const sanitized = backgrounds.map(bg => ({
      ...bg,
      likedBy: undefined,
    }));
    
    res.json({ backgrounds: sanitized });
  } catch (error) {
    console.error('[API] Error getting community backgrounds:', error);
    res.status(500).json({ error: 'Failed to get community backgrounds' });
  }
});

// Get a specific community background
app.get('/api/community-backgrounds/:backgroundId', async (req, res) => {
  try {
    const background = await database.getCommunityBackground(req.params.backgroundId);
    
    if (!background) {
      return res.status(404).json({ error: 'Background not found' });
    }
    
    res.json({
      background: {
        ...background,
        likedBy: undefined,
      },
    });
  } catch (error) {
    console.error('[API] Error getting background:', error);
    res.status(500).json({ error: 'Failed to get background' });
  }
});

// Like/unlike a background
app.post('/api/community-backgrounds/:backgroundId/like', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    const result = await database.likeBackground(req.params.backgroundId, userId);
    
    res.json(result);
  } catch (error) {
    console.error('[API] Error liking background:', error);
    res.status(500).json({ error: 'Failed to like background' });
  }
});

// Download/use a background (increment counter)
app.post('/api/community-backgrounds/:backgroundId/download', async (req, res) => {
  try {
    const success = await database.incrementBackgroundDownloads(req.params.backgroundId);
    
    if (!success) {
      return res.status(404).json({ error: 'Background not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Error recording download:', error);
    res.status(500).json({ error: 'Failed to record download' });
  }
});

// Report a background
app.post('/api/community-backgrounds/:backgroundId/report', async (req, res) => {
  try {
    const { userId, reason } = req.body;
    
    if (!userId || !reason) {
      return res.status(400).json({ error: 'User ID and reason required' });
    }
    
    await database.reportBackground(req.params.backgroundId, userId, reason);
    
    res.json({ success: true, message: 'Report submitted' });
  } catch (error) {
    console.error('[API] Error reporting background:', error);
    res.status(500).json({ error: 'Failed to report background' });
  }
});

// Admin: Approve a background
app.post('/api/admin/backgrounds/:backgroundId/approve', async (req, res) => {
  try {
    const { adminKey } = req.body;
    
    // Simple admin authentication - requires ADMIN_KEY environment variable
    // Use timing-safe comparison to prevent timing attacks
    if (!process.env.ADMIN_KEY || !adminKey) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const expectedKey = Buffer.from(process.env.ADMIN_KEY);
    const providedKey = Buffer.from(adminKey);
    
    if (expectedKey.length !== providedKey.length || !crypto.timingSafeEqual(expectedKey, providedKey)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const background = await database.getCommunityBackground(req.params.backgroundId);
    
    if (!background) {
      return res.status(404).json({ error: 'Background not found' });
    }
    
    background.status = 'approved';
    background.approvedAt = new Date();
    await database.saveCommunityBackground(background);
    
    res.json({ success: true, message: 'Background approved' });
  } catch (error) {
    console.error('[API] Error approving background:', error);
    res.status(500).json({ error: 'Failed to approve background' });
  }
});

// Admin: Reject a background
app.post('/api/admin/backgrounds/:backgroundId/reject', async (req, res) => {
  try {
    const { adminKey, reason } = req.body;
    
    // Simple admin authentication - requires ADMIN_KEY environment variable
    // Use timing-safe comparison to prevent timing attacks
    if (!process.env.ADMIN_KEY || !adminKey) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const expectedKey = Buffer.from(process.env.ADMIN_KEY);
    const providedKey = Buffer.from(adminKey);
    
    if (expectedKey.length !== providedKey.length || !crypto.timingSafeEqual(expectedKey, providedKey)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const background = await database.getCommunityBackground(req.params.backgroundId);
    
    if (!background) {
      return res.status(404).json({ error: 'Background not found' });
    }
    
    background.status = 'rejected';
    background.rejectedAt = new Date();
    background.rejectionReason = reason || 'Does not meet community guidelines';
    await database.saveCommunityBackground(background);
    
    // Optionally delete the file
    if (background.imageUrl) {
      const filePath = path.join(__dirname, 'public', background.imageUrl);
      await fs.unlink(filePath).catch(() => {});
    }
    
    res.json({ success: true, message: 'Background rejected' });
  } catch (error) {
    console.error('[API] Error rejecting background:', error);
    res.status(500).json({ error: 'Failed to reject background' });
  }
});

// Daily Challenge Endpoints

// Helper function to calculate color similarity percentage (0-100)
function calculateColorSimilarity(guess, target) {
  const normalizeHex = (hex) => hex.replace('#', '').toLowerCase();
  const guessHex = normalizeHex(guess);
  const targetHex = normalizeHex(target);
  
  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
  };
  
  const guessRgb = hexToRgb(guessHex);
  const targetRgb = hexToRgb(targetHex);
  
  // Calculate Euclidean distance in RGB space
  const distance = Math.sqrt(
    Math.pow(guessRgb.r - targetRgb.r, 2) +
    Math.pow(guessRgb.g - targetRgb.g, 2) +
    Math.pow(guessRgb.b - targetRgb.b, 2)
  );
  
  // Maximum possible distance in RGB space is sqrt(255^2 + 255^2 + 255^2) = ~441
  const maxDistance = Math.sqrt(255 * 255 * 3);
  
  // Convert to percentage (100% = perfect match, 0% = furthest away)
  const similarity = Math.max(0, Math.min(100, 100 - (distance / maxDistance) * 100));
  
  return Math.round(similarity * 10) / 10; // Round to 1 decimal place
}

// Helper function to generate daily hex code
function generateDailyHexCode(date) {
  // Generate deterministic random hex based on date
  const dateNum = parseInt(date.replace(/-/g, ''));
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#10AC84', '#EE5A24', '#0984E3', '#6C5CE7', '#A29BFE',
    '#FD79A8', '#E84393', '#00B894', '#00CEC9', '#FFB8B8',
  ];
  
  // Use date as seed for deterministic selection
  const colorIndex = dateNum % colors.length;
  return colors[colorIndex];
}

// Get daily challenge (hex code and leaderboard)
app.get('/api/daily-challenge/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { playerId } = req.query;
    
    // Get or generate daily hex code
    let hexCode = await database.getDailyHexCode(date);
    if (!hexCode) {
      hexCode = generateDailyHexCode(date);
      await database.setDailyHexCode(date, hexCode);
    }
    
    // Get submissions (leaderboard)
    const submissions = await database.getDailyChallengeSubmissions(date);
    
    // Get player's submission if they have one
    let playerSubmission = null;
    if (playerId) {
      playerSubmission = await database.getPlayerDailyChallengeSubmission(date, playerId);
    }
    
    res.json({
      date,
      hexCode,
      submissions: submissions.map(s => ({
        playerId: s.playerId,
        playerName: s.playerName,
        guess: s.guess,
        isCorrect: s.isCorrect,
        similarity: s.similarity || 0,
        submittedAt: s.submittedAt,
      })),
      playerSubmission: playerSubmission ? {
        guess: playerSubmission.guess,
        isCorrect: playerSubmission.isCorrect,
        similarity: playerSubmission.similarity || 0,
        submittedAt: playerSubmission.submittedAt,
      } : null,
    });
  } catch (error) {
    console.error('[API] Error getting daily challenge:', error);
    res.status(500).json({ error: 'Failed to get daily challenge' });
  }
});

// Submit daily challenge guess
app.post('/api/daily-challenge/submit', async (req, res) => {
  try {
    const { playerId, playerName, date, guess } = req.body;
    
    console.log('[API] Daily challenge submit request:', { playerId, playerName, date, guess });
    
    if (!playerId || !playerName || !date || !guess) {
      console.log('[API] Missing fields:', { hasPlayerId: !!playerId, hasPlayerName: !!playerName, hasDate: !!date, hasGuess: !!guess });
      return res.status(400).json({ error: 'Missing required fields', details: { playerId: !!playerId, playerName: !!playerName, date: !!date, guess: !!guess } });
    }
    
    // Validate hex code format
    const hexPattern = /^#?[0-9A-Fa-f]{6}$/;
    if (!hexPattern.test(guess)) {
      return res.status(400).json({ error: 'Invalid hex code format' });
    }
    
    // Get the daily hex code
    let hexCode = await database.getDailyHexCode(date);
    if (!hexCode) {
      hexCode = generateDailyHexCode(date);
      await database.setDailyHexCode(date, hexCode);
    }
    
    // Normalize hex codes for comparison
    const normalizeHex = (hex) => hex.replace('#', '').toLowerCase();
    const isCorrect = normalizeHex(guess) === normalizeHex(hexCode);
    
    // Calculate color similarity percentage
    const similarity = calculateColorSimilarity(guess, hexCode);
    
    console.log('[API] Guess analysis:', { guess, hexCode, isCorrect, similarity });
    
    // Submit to database
    const result = await database.submitDailyChallenge({
      playerId,
      playerName,
      date,
      hexCode,
      guess: guess.toUpperCase().startsWith('#') ? guess.toUpperCase() : `#${guess.toUpperCase()}`,
      isCorrect,
      similarity,
    });
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    // Get updated submissions
    const submissions = await database.getDailyChallengeSubmissions(date);
    
    res.json({
      success: true,
      isCorrect,
      hexCode,
      similarity,
      submissions: submissions.map(s => ({
        playerId: s.playerId,
        playerName: s.playerName,
        guess: s.guess,
        isCorrect: s.isCorrect,
        similarity: s.similarity || 0,
        submittedAt: s.submittedAt,
      })),
    });
  } catch (error) {
    console.error('[API] Error submitting daily challenge:', error);
    res.status(500).json({ error: 'Failed to submit daily challenge' });
  }
});

const PORT = process.env.PORT || 3000;

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, closing gracefully...');
  if (database.client) {
    await database.client.close();
    console.log('[Database] MongoDB connection closed');
  }
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

// Initialize database and start server
database.connect().then(() => {
  // Initialize email service
  emailService.initialize();
  
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
