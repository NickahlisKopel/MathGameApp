// Local multiplayer service for testing without external server
export class LocalMultiplayerService {
  private isConnected: boolean = false;
  private currentRoom: string | null = null;
  private playerName: string = '';
  private players: Set<string> = new Set();

  // Event handlers
  onPlayerJoined?: (player: any) => void;
  onPlayerLeft?: (player: any) => void;
  onGameEvent?: (eventCode: number, data: any, playerId: string) => void;
  onRoomCreated?: (roomId: string) => void;
  onMatchFound?: (roomId: string, players: any[]) => void;

  // Simulate connection (always succeeds locally)
  async connect(playerName: string): Promise<boolean> {
    this.playerName = playerName;
    this.isConnected = true;
    console.log('Connected to local multiplayer (offline mode)');
    return true;
  }

  // Simulate joining a room
  async joinOrCreateRoom(roomName: string, maxPlayers: number = 2): Promise<boolean> {
    if (!this.isConnected) return false;

    this.currentRoom = roomName;
    this.players.add(this.playerName);
    
    console.log(`Joined local room: ${roomName}`);
    
    // Simulate another player joining after a delay (for testing)
    setTimeout(() => {
      if (this.currentRoom === roomName && this.players.size === 1) {
        const botPlayer = { name: 'AI Bot', id: 'bot_' + Date.now() };
        this.players.add(botPlayer.name);
        this.onPlayerJoined?.(botPlayer);
        console.log('AI Bot joined the room for testing');
      }
    }, 2000);

    this.onRoomCreated?.(roomName);
    return true;
  }

  // Leave room
  async leaveRoom(): Promise<void> {
    if (this.currentRoom) {
      console.log(`Left room: ${this.currentRoom}`);
      this.players.clear();
      this.currentRoom = null;
    }
  }

  // Send game event (just logs locally)
  sendGameEvent(eventCode: number, data: any) {
    if (!this.currentRoom) return;

    console.log('Local game event sent:', { eventCode, data, playerId: this.playerName });
    
    // Simulate receiving events from AI bot
    setTimeout(() => {
      if (eventCode === 1) { // Math question
        // AI bot "answers" after random delay
        setTimeout(() => {
          const botAnswer = {
            questionId: 'q_' + Date.now(),
            answerIndex: Math.floor(Math.random() * 4),
            timeSpent: 1000 + Math.random() * 2000
          };
          this.onGameEvent?.(2, botAnswer, 'AI Bot');
        }, 500 + Math.random() * 1500);
      }
    }, 100);
  }

  // Math game methods
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

  // Simulate matchmaking
  async findMatch(): Promise<boolean> {
    if (!this.isConnected) return false;
    
    console.log('Finding match locally...');
    
    // Simulate finding a match after a short delay
    setTimeout(() => {
      const roomId = `local_match_${Date.now()}`;
      this.onMatchFound?.(roomId, [
        { name: this.playerName, id: this.playerName },
        { name: 'AI Opponent', id: 'ai_opponent' }
      ]);
    }, 1000);

    return true;
  }

  async cancelMatchmaking(): Promise<void> {
    console.log('Cancelled local matchmaking');
  }

  disconnect() {
    this.isConnected = false;
    this.currentRoom = null;
    this.players.clear();
    console.log('Disconnected from local multiplayer');
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

  getPlayerCount(): number {
    return this.players.size;
  }
}

// Singleton instance
export const localMultiplayer = new LocalMultiplayerService();