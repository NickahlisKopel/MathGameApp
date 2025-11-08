import io, { Socket } from 'socket.io-client';
import { AuthUser } from './AuthService';

interface PlayerData {
  id: string;
  name: string;
  level?: number;
}

interface MatchFoundEvent {
  roomId: string;
  opponent: PlayerData;
  isHost: boolean;
}

interface GameStartEvent {
  startTime: number;
}

interface PlayerAnswerEvent {
  playerId: string;
  answer: number;
  correct: boolean;
  timeSpent: number;
}

interface ScoreUpdateEvent {
  playerId: string;
  score: number;
}

interface GameEndEvent {
  winner: string;
  scores: { [playerId: string]: number };
  completionTimes?: { [playerId: string]: number };
  questions?: Array<{
    answers: {
      [playerId: string]: {
        playerId: string;
        playerName: string;
        question: string;
        correctAnswer: number;
        answer: number;
        correct: boolean;
        timeSpent: number;
      };
    };
  }>;
}

export class SocketMultiplayerService {
  private socket: Socket | null = null;
  private currentUser: AuthUser | null = null;
  private currentRoom: string | null = null;
  private isConnected: boolean = false;

  // Event callbacks
  onMatchFound?: (data: MatchFoundEvent) => void;
  onGameStart?: (data: GameStartEvent) => void;
  onPlayerAnswer?: (data: PlayerAnswerEvent) => void;
  onScoreUpdate?: (data: ScoreUpdateEvent) => void;
  onPlayerCompleted?: (data: { playerId: string; completionTime: number }) => void;
  onGameEnd?: (data: GameEndEvent) => void;
  onOpponentDisconnect?: () => void;
  onError?: (error: string) => void;
  onFriendChallengeReceived?: (data: { challengeId: string; from: { id: string; name: string }; difficulty: string; expiresIn: number }) => void;
  onFriendChallengeDeclined?: (data: { from: { id: string; name: string } }) => void;
  onChallengeLobbyCreated?: (data: { challengeId: string; friendId: string; friendName: string; difficulty: string; expiresIn: number }) => void;
  onChallengeTimeout?: (data: { message: string }) => void;
  onChallengeExpired?: (data: { challengeId: string }) => void;
  onFriendsStatusUpdate?: (onlineFriends: string[]) => void;
  onAvailableFriendsUpdate?: (data: { friends: Array<{ id: string; name: string; difficulty: string }> }) => void;
  onFriendStartedLooking?: (data: { friend: { id: string; name: string; difficulty: string } }) => void;
  onFriendStoppedLooking?: (data: { friendId: string }) => void;

  /**
   * Connect to Socket.IO server
   */
  async connect(serverUrl: string, user: AuthUser, playerId?: string): Promise<boolean> {
    try {
      if (user.isOffline) {
        console.error('Cannot connect in offline mode');
        return false;
      }

      // If already connected to the same server, don't reconnect
      if (this.socket && this.isConnected) {
        console.log('[Socket.IO] Already connected, reusing connection');
        return true;
      }

      this.currentUser = user;

      this.socket = io(serverUrl, {
        auth: {
          userId: playerId || user.id, // Use playerId if provided, otherwise fallback to auth ID
          userName: user.displayName,
          authId: user.id, // Keep auth ID for reference
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      return new Promise((resolve) => {
        this.socket!.on('connect', () => {
          console.log('[Socket.IO] Connected:', this.socket!.id);
          this.isConnected = true;
          resolve(true);
        });

        this.socket!.on('connect_error', (error) => {
          console.error('[Socket.IO] Connection error:', error);
          this.isConnected = false;
          this.onError?.('Failed to connect to server');
          resolve(false);
        });

        this.setupEventHandlers();

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            console.error('[Socket.IO] Connection timeout');
            resolve(false);
          }
        }, 10000);
      });
    } catch (error) {
      console.error('[Socket.IO] Connect error:', error);
      return false;
    }
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected');
      this.isConnected = false;
      this.currentRoom = null;
    });

    this.socket.on('match-found', (data: MatchFoundEvent) => {
      console.log('[Socket.IO] Match found:', data);
      this.currentRoom = data.roomId;
      this.onMatchFound?.(data);
    });

    this.socket.on('game-start', (data: GameStartEvent) => {
      console.log('[Socket.IO] Game starting:', data);
      this.onGameStart?.(data);
    });

    this.socket.on('player-answer', (data: PlayerAnswerEvent) => {
      console.log('[Socket.IO] Player answered:', data);
      this.onPlayerAnswer?.(data);
    });

    this.socket.on('score-update', (data: ScoreUpdateEvent) => {
      console.log('[Socket.IO] Score update:', data);
      this.onScoreUpdate?.(data);
    });

    this.socket.on('player-completed', (data: { playerId: string; completionTime: number }) => {
      console.log('[Socket.IO] Player completed:', data);
      this.onPlayerCompleted?.(data);
    });

    this.socket.on('game-end', (data: GameEndEvent) => {
      console.log('[Socket.IO] Game ended:', data);
      this.onGameEnd?.(data);
    });

    this.socket.on('opponent-disconnect', () => {
      console.log('[Socket.IO] Opponent disconnected');
      this.onOpponentDisconnect?.();
    });

    this.socket.on('error', (error: string) => {
      console.error('[Socket.IO] Server error:', error);
      this.onError?.(error);
    });

    // Friend challenge events
    this.socket.on('friend-challenge-received', (data) => {
      console.log('[Socket.IO] Friend challenge received:', data);
      this.onFriendChallengeReceived?.(data);
    });

    this.socket.on('friend-challenge-declined', (data) => {
      console.log('[Socket.IO] Friend challenge declined:', data);
      this.onFriendChallengeDeclined?.(data);
    });

    this.socket.on('challenge-lobby-created', (data) => {
      console.log('[Socket.IO] Challenge lobby created:', data);
      this.onChallengeLobbyCreated?.(data);
    });

    this.socket.on('challenge-timeout', (data) => {
      console.log('[Socket.IO] Challenge timeout:', data);
      this.onChallengeTimeout?.(data);
    });

    this.socket.on('challenge-expired', (data) => {
      console.log('[Socket.IO] Challenge expired:', data);
      this.onChallengeExpired?.(data);
    });

    this.socket.on('challenge-error', (data) => {
      console.log('[Socket.IO] Challenge error:', data);
      this.onError?.(data.message);
    });

    this.socket.on('friends-status', (data: { onlineFriends: string[] }) => {
      console.log('[Socket.IO] Friends status:', data);
      this.onFriendsStatusUpdate?.(data.onlineFriends);
    });

    this.socket.on('available-friends-update', (data) => {
      console.log('[Socket.IO] Available friends update:', data);
      this.onAvailableFriendsUpdate?.(data);
    });

    this.socket.on('friend-started-looking', (data) => {
      console.log('[Socket.IO] Friend started looking:', data);
      this.onFriendStartedLooking?.(data);
    });

    this.socket.on('friend-stopped-looking', (data) => {
      console.log('[Socket.IO] Friend stopped looking:', data);
      this.onFriendStoppedLooking?.(data);
    });
  }

  /**
   * Get online status of friends
   */
  getFriendsStatus(friendIds: string[]): void {
    if (!this.socket || !this.isConnected) {
      console.error('[Socket.IO] Not connected');
      return;
    }

    console.log('[Socket.IO] Requesting friends status for:', friendIds);
    this.socket.emit('get-friends-status', { friendIds });
  }

  /**
   * Join matchmaking queue
   */
  joinMatchmaking(difficulty: 'easy' | 'medium' | 'hard'): void {
    if (!this.socket || !this.isConnected) {
      console.error('[Socket.IO] Not connected');
      this.onError?.('Not connected to server');
      return;
    }

    console.log('[Socket.IO] Joining matchmaking:', difficulty);
    this.socket.emit('join-matchmaking', { difficulty });
  }

  /**
   * Leave matchmaking queue
   */
  leaveMatchmaking(): void {
    if (!this.socket || !this.isConnected) return;

    console.log('[Socket.IO] Leaving matchmaking');
    this.socket.emit('leave-matchmaking');
  }

  /**
   * Submit an answer
   */
  submitAnswer(answer: number, correct: boolean, timeSpent: number, question?: string, correctAnswer?: number): void {
    if (!this.socket || !this.isConnected || !this.currentRoom) {
      console.error('[Socket.IO] Cannot submit answer: not in game');
      return;
    }

    console.log('[Socket.IO] Submitting answer:', { answer, correct, timeSpent });
    this.socket.emit('submit-answer', {
      roomId: this.currentRoom,
      answer,
      correct,
      timeSpent,
      question,
      correctAnswer,
    });
  }

  /**
   * Send completion time when player finishes all 10 questions
   */
  sendCompletionTime(completionTime: number): void {
    if (!this.socket || !this.isConnected || !this.currentRoom) {
      console.error('[Socket.IO] Cannot send completion time: not in game');
      return;
    }

    console.log('[Socket.IO] Sending completion time:', completionTime);
    this.socket.emit('player-completed', {
      roomId: this.currentRoom,
      completionTime,
    });
  }

  /**
   * Send ready signal
   */
  sendReady(): void {
    if (!this.socket || !this.isConnected || !this.currentRoom) return;

    console.log('[Socket.IO] Sending ready signal');
    this.socket.emit('player-ready', { roomId: this.currentRoom });
  }

  /**
   * Leave current game room
   */
  leaveRoom(): void {
    if (!this.socket || !this.currentRoom) return;

    console.log('[Socket.IO] Leaving room:', this.currentRoom);
    this.socket.emit('leave-room', { roomId: this.currentRoom });
    this.currentRoom = null;
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('[Socket.IO] Disconnecting');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentRoom = null;
    }
  }

  /**
   * Get connection status
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get current room
   */
  getCurrentRoom(): string | null {
    return this.currentRoom;
  }

  /**
   * Get authenticated user
   */
  getAuthenticatedUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * Start looking for game with friends
   */
  startLookingForGame(difficulty: 'easy' | 'medium' | 'hard', friendIds: string[]) {
    if (!this.socket || !this.isConnected) {
      console.error('[Socket.IO] Not connected');
      return;
    }

    console.log('[Socket.IO] Starting to look for game with difficulty:', difficulty, 'friendIds:', friendIds);
    this.socket.emit('start-looking-for-game', { difficulty, friendIds });
  }

  /**
   * Stop looking for game
   */
  stopLookingForGame() {
    if (!this.socket || !this.isConnected) {
      console.error('[Socket.IO] Not connected');
      return;
    }

    console.log('[Socket.IO] Stopping looking for game');
    this.socket.emit('stop-looking-for-game');
  }

  /**
   * Send friend challenge
   */
  sendFriendChallenge(friendId: string, difficulty: 'easy' | 'medium' | 'hard') {
    if (!this.socket || !this.isConnected) {
      console.error('[Socket.IO] Not connected');
      return;
    }

    console.log('[Socket.IO] Sending friend challenge to:', friendId, difficulty);
    this.socket.emit('send-friend-challenge', { friendId, difficulty });
  }

  /**
   * Accept friend challenge
   */
  acceptFriendChallenge(challengeId: string, challengerId: string) {
    if (!this.socket || !this.isConnected) {
      console.error('[Socket.IO] Not connected');
      return;
    }

    console.log('[Socket.IO] Accepting friend challenge:', challengeId);
    this.socket.emit('accept-friend-challenge', { challengeId, challengerId });
  }

  /**
   * Decline friend challenge
   */
  declineFriendChallenge(challengeId: string, challengerId: string) {
    if (!this.socket || !this.isConnected) {
      console.error('[Socket.IO] Not connected');
      return;
    }

    console.log('[Socket.IO] Declining friend challenge:', challengeId);
    this.socket.emit('decline-friend-challenge', { challengeId, challengerId });
  }
}

// Export singleton instance
export const socketMultiplayerService = new SocketMultiplayerService();
