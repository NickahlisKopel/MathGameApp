import { io, Socket } from 'socket.io-client';

// Alternative multiplayer service using Socket.io
export class WebSocketMultiplayerService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private currentRoom: string | null = null;
  private playerName: string = '';

  // Event handlers (can be set by the game)
  onPlayerJoined?: (player: any) => void;
  onPlayerLeft?: (player: any) => void;
  onGameEvent?: (eventCode: number, data: any, playerId: string) => void;
  onRoomCreated?: (roomId: string) => void;
  onMatchFound?: (roomId: string, players: any[]) => void;

  // Connect to a Socket.io server
  async connect(playerName: string, serverUrl: string = 'ws://localhost:3001'): Promise<boolean> {
    try {
      this.playerName = playerName;
      
      this.socket = io(serverUrl, {
        transports: ['websocket'],
        timeout: 5000,
      });

      return new Promise((resolve) => {
        if (!this.socket) {
          resolve(false);
          return;
        }

        this.socket.on('connect', () => {
          console.log('Connected to multiplayer server');
          this.isConnected = true;
          this.setupEventHandlers();
          resolve(true);
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection failed:', error);
          this.isConnected = false;
          resolve(false);
        });

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            resolve(false);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      return false;
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    // Player events
    this.socket.on('player_joined', (player) => {
      console.log('Player joined:', player);
      this.onPlayerJoined?.(player);
    });

    this.socket.on('player_left', (player) => {
      console.log('Player left:', player);
      this.onPlayerLeft?.(player);
    });

    // Game events
    this.socket.on('game_event', ({ eventCode, data, playerId }) => {
      console.log('Game event received:', eventCode, data, playerId);
      this.onGameEvent?.(eventCode, data, playerId);
    });

    // Room events
    this.socket.on('room_created', (roomId) => {
      console.log('Room created:', roomId);
      this.currentRoom = roomId;
      this.onRoomCreated?.(roomId);
    });

    this.socket.on('match_found', ({ roomId, players }) => {
      console.log('Match found:', roomId, players);
      this.currentRoom = roomId;
      this.onMatchFound?.(roomId, players);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
      this.currentRoom = null;
    });
  }

  // Join or create a room
  async joinOrCreateRoom(roomName: string, maxPlayers: number = 2): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        resolve(false);
        return;
      }

      this.socket.emit('join_room', {
        roomName,
        playerName: this.playerName,
        maxPlayers
      }, (success: boolean) => {
        if (success) {
          this.currentRoom = roomName;
        }
        resolve(success);
      });
    });
  }

  // Leave current room
  async leaveRoom(): Promise<void> {
    if (!this.socket || !this.currentRoom) return;

    this.socket.emit('leave_room', {
      roomName: this.currentRoom,
      playerName: this.playerName
    });

    this.currentRoom = null;
  }

  // Send custom game event
  sendGameEvent(eventCode: number, data: any) {
    if (!this.socket || !this.currentRoom) return;

    this.socket.emit('game_event', {
      roomName: this.currentRoom,
      eventCode,
      data,
      playerId: this.playerName
    });
  }

  // Math game specific methods
  sendMathQuestion(question: string, options: string[], correctAnswer: number) {
    this.sendGameEvent(1, {
      question,
      options,
      correctAnswer,
      timestamp: Date.now()
    });
  }

  sendPlayerAnswer(questionId: string, answerIndex: number, timeSpent: number) {
    this.sendGameEvent(2, {
      questionId,
      answerIndex,
      timeSpent,
      timestamp: Date.now()
    });
  }

  sendScoreUpdate(score: number, totalCorrect: number) {
    this.sendGameEvent(3, {
      score,
      totalCorrect,
      timestamp: Date.now()
    });
  }

  // Find match (join matchmaking)
  async findMatch(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        resolve(false);
        return;
      }

      this.socket.emit('find_match', {
        playerName: this.playerName
      }, (success: boolean) => {
        resolve(success);
      });
    });
  }

  // Cancel matchmaking
  async cancelMatchmaking(): Promise<void> {
    if (!this.socket) return;

    this.socket.emit('cancel_matchmaking', {
      playerName: this.playerName
    });
  }

  // Disconnect from server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.currentRoom = null;
  }

  // Getters
  getIsConnected(): boolean {
    return this.isConnected;
  }

  getCurrentRoom(): string | null {
    return this.currentRoom;
  }

  getPlayerName(): string {
    return this.playerName;
  }
}

// Singleton instance
export const webSocketMultiplayer = new WebSocketMultiplayerService();