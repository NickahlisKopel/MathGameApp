// Simplified multiplayer service supporting Bot Battle and Local 1v1 modes
export type GameMode = 'bot' | 'local1v1';

export class SimpleMultiplayerService {
  private gameMode: GameMode | null = null;
  private playerName: string = '';
  private isActive: boolean = false;
  private currentPlayer: number = 1; // For turn-based mode (1 or 2)
  
  // Bot mode properties
  private botScore: number = 0;
  private botCorrect: number = 0;
  
  // Turn-based mode properties
  private player1Name: string = 'Player 1';
  private player2Name: string = 'Player 2';
  private player1Score: number = 0;
  private player2Score: number = 0;
  private player1Correct: number = 0;
  private player2Correct: number = 0;

  // Event handlers
  onBotAnswer?: (score: number, correct: number) => void;
  onTurnChange?: (currentPlayer: number, playerName: string) => void;
  onGameComplete?: (results: any) => void;

  // Initialize game mode
  startGame(mode: GameMode, playerName: string, player2Name?: string): boolean {
    this.gameMode = mode;
    this.playerName = playerName;
    this.isActive = true;
    this.resetScores();

    if (mode === 'local1v1' && player2Name) {
      this.player1Name = playerName;
      this.player2Name = player2Name;
      this.currentPlayer = 1;
      console.log(`Started Local 1v1: ${this.player1Name} vs ${this.player2Name}`);
      this.onTurnChange?.(1, this.player1Name);
    } else if (mode === 'bot') {
      console.log(`Started Bot Battle: ${playerName} vs AI Bot`);
    }

    return true;
  }

  // Reset all scores
  private resetScores() {
    this.botScore = 0;
    this.botCorrect = 0;
    this.player1Score = 0;
    this.player2Score = 0;
    this.player1Correct = 0;
    this.player2Correct = 0;
  }

  // Handle player answer
  submitAnswer(isCorrect: boolean, score: number) {
    if (!this.isActive) return;

    if (this.gameMode === 'bot') {
      // In bot mode, simulate bot answering after player
      this.simulateBotAnswer();
    } else if (this.gameMode === 'local1v1') {
      // In turn-based mode, update current player's score and switch turns
      if (this.currentPlayer === 1) {
        if (isCorrect) this.player1Correct++;
        this.player1Score += score;
      } else {
        if (isCorrect) this.player2Correct++;
        this.player2Score += score;
      }
      
      // Switch to other player
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
      const nextPlayerName = this.currentPlayer === 1 ? this.player1Name : this.player2Name;
      this.onTurnChange?.(this.currentPlayer, nextPlayerName);
    }
  }

  // Simulate AI bot response for bot mode
  private simulateBotAnswer() {
    setTimeout(() => {
      if (!this.isActive || this.gameMode !== 'bot') return;
      
      // Bot has 70% chance to get it right
      const botIsCorrect = Math.random() < 0.7;
      const botScoreGain = botIsCorrect ? (50 + Math.floor(Math.random() * 50)) : 0;
      
      if (botIsCorrect) this.botCorrect++;
      this.botScore += botScoreGain;
      
      this.onBotAnswer?.(this.botScore, this.botCorrect);
    }, 800 + Math.random() * 1200); // Bot responds in 0.8-2 seconds
  }

  // Get current game state
  getGameState() {
    if (this.gameMode === 'bot') {
      return {
        mode: 'bot',
        playerScore: 0, // Will be updated by game screen
        playerCorrect: 0,
        botScore: this.botScore,
        botCorrect: this.botCorrect
      };
    } else if (this.gameMode === 'local1v1') {
      return {
        mode: 'local1v1',
        currentPlayer: this.currentPlayer,
        currentPlayerName: this.currentPlayer === 1 ? this.player1Name : this.player2Name,
        player1Name: this.player1Name,
        player2Name: this.player2Name,
        player1Score: this.player1Score,
        player2Score: this.player2Score,
        player1Correct: this.player1Correct,
        player2Correct: this.player2Correct
      };
    }
    return null;
  }

  // Get current player name for turn-based mode
  getCurrentPlayerName(): string {
    if (this.gameMode === 'local1v1') {
      return this.currentPlayer === 1 ? this.player1Name : this.player2Name;
    }
    return this.playerName;
  }

  // Check if it's specific player's turn (for turn-based mode)
  isPlayerTurn(playerNumber: number): boolean {
    return this.gameMode === 'local1v1' && this.currentPlayer === playerNumber;
  }

  // End the game and get final results
  endGame(playerScore: number, playerCorrect: number) {
    this.isActive = false;
    
    if (this.gameMode === 'bot') {
      const results = {
        mode: 'bot',
        playerScore,
        playerCorrect,
        botScore: this.botScore,
        botCorrect: this.botCorrect,
        winner: playerScore > this.botScore ? 'player' : (playerScore === this.botScore ? 'tie' : 'bot')
      };
      this.onGameComplete?.(results);
      return results;
    } else if (this.gameMode === 'local1v1') {
      const results = {
        mode: 'local1v1',
        player1Name: this.player1Name,
        player2Name: this.player2Name,
        player1Score: this.player1Score,
        player2Score: this.player2Score,
        player1Correct: this.player1Correct,
        player2Correct: this.player2Correct,
        winner: this.player1Score > this.player2Score ? 'player1' : 
               (this.player1Score === this.player2Score ? 'tie' : 'player2')
      };
      this.onGameComplete?.(results);
      return results;
    }
    
    return null;
  }

  // Check if game is active
  isGameActive(): boolean {
    return this.isActive;
  }

  // Get game mode
  getGameMode(): GameMode | null {
    return this.gameMode;
  }

  // Stop the game
  stopGame() {
    this.isActive = false;
    this.gameMode = null;
    this.resetScores();
  }
}

// Export singleton instance
export const simpleMultiplayer = new SimpleMultiplayerService();