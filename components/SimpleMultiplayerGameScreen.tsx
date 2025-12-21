import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { simpleMultiplayer, GameMode } from '../services/simpleMultiplayer';
import { GameRewards } from '../utils/GameRewards';
import { PlayerStorageService } from '../services/PlayerStorageService';
import { PlayerProfile } from '../types/Player';
import { useBackground } from '../hooks/useBackground';
import { useTheme } from '../contexts/ThemeContext';
import { BackgroundWrapper } from './BackgroundWrapper';
import DrawingNotepad from '../DrawingNotepad';

interface Equation {
  question: string;
  answer: number;
  questionId: string;
}

interface SimpleMultiplayerGameScreenProps {
  playerProfile: PlayerProfile;
  onGameEnd: (results: any) => void;
  onBackToMenu: () => void;
  difficulty: 'easy' | 'medium' | 'hard';
  gameMode: GameMode;
}

export const SimpleMultiplayerGameScreen: React.FC<SimpleMultiplayerGameScreenProps> = ({
  playerProfile,
  onGameEnd,
  onBackToMenu,
  difficulty,
  gameMode,
}) => {
  let insets;
  try {
    insets = useSafeAreaInsets();
  } catch (e) {
    // Fallback for when SafeAreaProvider is not available
    insets = { top: 0, bottom: 20, left: 0, right: 0 };
  }
  // Background and theme hooks
  const { backgroundColors, backgroundType, animationType, isLoading: backgroundLoading } = useBackground();
  const { theme, isDarkMode, reduceMotion } = useTheme();
  
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'finished'>('setup');
  const [currentEquation, setCurrentEquation] = useState<Equation | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [myCorrect, setMyCorrect] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [questionCount, setQuestionCount] = useState(0);
  const [totalQuestions] = useState(10);
  const [gameResults, setGameResults] = useState<any>(null);
  
  // Bot mode states
  const [botScore, setBotScore] = useState(0);
  const [botCorrect, setBotCorrect] = useState(0);
  
  // Turn-based mode states
  const [player2Name, setPlayer2Name] = useState('Player 2');
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [player1Correct, setPlayer1Correct] = useState(0);
  const [player2Correct, setPlayer2Correct] = useState(0);
  
  // Feedback states
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  
  // Notepad state
  const [showNotepad, setShowNotepad] = useState(false);

  // Generate random math equations based on difficulty
  const generateEquation = useCallback((): Equation => {
    let num1: number, num2: number, operation: string, answer: number, question: string;
    
    switch (difficulty) {
      case 'easy':
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        operation = Math.random() < 0.7 ? '+' : '-';
        if (operation === '-' && num1 < num2) [num1, num2] = [num2, num1];
        answer = operation === '+' ? num1 + num2 : num1 - num2;
        question = `${num1} ${operation} ${num2}`;
        break;
      case 'medium':
        if (Math.random() < 0.6) {
          // Addition/Subtraction with larger numbers
          num1 = Math.floor(Math.random() * 50) + 10;
          num2 = Math.floor(Math.random() * 30) + 5;
          operation = Math.random() < 0.5 ? '+' : '-';
          if (operation === '-' && num1 < num2) [num1, num2] = [num2, num1];
          answer = operation === '+' ? num1 + num2 : num1 - num2;
          question = `${num1} ${operation} ${num2}`;
        } else {
          // Simple multiplication
          num1 = Math.floor(Math.random() * 12) + 1;
          num2 = Math.floor(Math.random() * 12) + 1;
          answer = num1 * num2;
          question = `${num1} × ${num2}`;
        }
        break;
      case 'hard':
        const operations = ['+', '-', '×', '÷'];
        operation = operations[Math.floor(Math.random() * operations.length)];
        
        switch (operation) {
          case '+':
            num1 = Math.floor(Math.random() * 100) + 10;
            num2 = Math.floor(Math.random() * 100) + 10;
            answer = num1 + num2;
            question = `${num1} + ${num2}`;
            break;
          case '-':
            num1 = Math.floor(Math.random() * 100) + 50;
            num2 = Math.floor(Math.random() * 50) + 10;
            answer = num1 - num2;
            question = `${num1} - ${num2}`;
            break;
          case '×':
            num1 = Math.floor(Math.random() * 15) + 2;
            num2 = Math.floor(Math.random() * 15) + 2;
            answer = num1 * num2;
            question = `${num1} × ${num2}`;
            break;
          case '÷':
            answer = Math.floor(Math.random() * 15) + 2;
            num2 = Math.floor(Math.random() * 12) + 2;
            num1 = answer * num2;
            question = `${num1} ÷ ${num2}`;
            break;
          default:
            num1 = 1; num2 = 1; answer = 2; question = '1 + 1';
        }
        break;
      default:
        num1 = 1; num2 = 1; answer = 2; question = '1 + 1';
    }

    return {
      question,
      answer,
      questionId: `q_${Date.now()}_${Math.random()}`,
    };
  }, [difficulty]);

  // Initialize game
  const initializeGame = useCallback(() => {
    if (gameMode === 'local1v1') {
      // For local 1v1, ask for player 2 name (simplified - could add input dialog)
      setPlayer2Name('Player 2');
      simpleMultiplayer.startGame('local1v1', playerProfile.username, 'Player 2');
    } else {
      simpleMultiplayer.startGame('bot', playerProfile.username);
    }

    // Set up event handlers
    simpleMultiplayer.onBotAnswer = (score: number, correct: number) => {
      setBotScore(score);
      setBotCorrect(correct);
    };

    simpleMultiplayer.onTurnChange = (currentPlayerNum: number, playerName: string) => {
      setCurrentPlayer(currentPlayerNum);
      // Update local scores from service
      const gameState = simpleMultiplayer.getGameState();
      if (gameState && gameState.mode === 'local1v1') {
        setPlayer1Score(gameState.player1Score || 0);
        setPlayer2Score(gameState.player2Score || 0);
        setPlayer1Correct(gameState.player1Correct || 0);
        setPlayer2Correct(gameState.player2Correct || 0);
      }
    };

    // Generate first question
    const firstEquation = generateEquation();
    setCurrentEquation(firstEquation);
    setGameState('playing');
    setTimeLeft(30);
    setQuestionCount(1);
  }, [gameMode, playerProfile.username, generateEquation]);

  // Handle answer submission
  const submitAnswer = useCallback(() => {
    if (!currentEquation || currentAnswer === '') return;

    const isCorrect = parseInt(currentAnswer) === currentEquation.answer;
    const baseScore = isCorrect ? 100 : 0;
    const timeBonus = isCorrect ? Math.max(0, (timeLeft * 2)) : 0;
    const totalScore = baseScore + timeBonus;

    // Show feedback
    setIsCorrectAnswer(isCorrect);
    setFeedbackText(isCorrect ? 'Correct!' : `Wrong! Answer was ${currentEquation.answer}`);
    setShowFeedback(true);

    // Update local score
    setMyScore(prev => prev + totalScore);
    if (isCorrect) setMyCorrect(prev => prev + 1);

    // Submit to multiplayer service
    simpleMultiplayer.submitAnswer(isCorrect, totalScore);

    // Hide feedback and move to next question
    setTimeout(() => {
      setShowFeedback(false);
      
      // Move to next question or end game
      if (questionCount >= totalQuestions) {
        endGame();
      } else {
        // Generate next question
        setTimeout(() => {
          setCurrentEquation(generateEquation());
          setCurrentAnswer('');
          setTimeLeft(30);
          setQuestionCount(prev => prev + 1);
        }, 500);
      }
    }, 1500);
  }, [currentEquation, currentAnswer, timeLeft, questionCount, totalQuestions]);

  // End the game
  const endGame = useCallback(() => {
    const results = simpleMultiplayer.endGame(myScore, myCorrect);
    setGameResults(results);
    setGameState('finished');
    
    // Award coins and XP for good performance
    if (results && (results.winner === 'player' || (results.winner === 'player1' && playerProfile.username === (results as any).player1Name))) {
      PlayerStorageService.addCoins(50);
      // PlayerStorageService.addXP(100); // Method doesn't exist yet
    } else if (results?.winner === 'tie') {
      PlayerStorageService.addCoins(25);
      // PlayerStorageService.addXP(50); // Method doesn't exist yet
    }

    setTimeout(() => {
      onGameEnd(results);
    }, 2000);
  }, [myScore, myCorrect, playerProfile.username, onGameEnd]);

  // Timer effect
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === 'playing') {
      // Time's up, submit current answer (or empty)
      submitAnswer();
    }
  }, [timeLeft, gameState, submitAnswer]);

  // Start game on mount
  useEffect(() => {
    initializeGame();
    return () => {
      simpleMultiplayer.stopGame();
    };
  }, [initializeGame]);

  // Handle number input
  const handleNumberInput = (num: string) => {
    if (gameState !== 'playing') return;
    
    if (gameMode === 'local1v1') {
      // In turn-based mode, only allow input for current player
      const gameStateData = simpleMultiplayer.getGameState();
      if (gameStateData && gameStateData.mode === 'local1v1') {
        // Allow input (simplified for now - could add player validation)
      }
    }
    
    if (num === 'Clear') {
      setCurrentAnswer('');
    } else if (num === 'Enter') {
      submitAnswer();
    } else {
      setCurrentAnswer(prev => prev + num);
    }
  };

  // Render keypad
  const renderKeypad = () => {
    const keyRows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['Clear', '0', 'Enter']
    ];

    return (
      <View style={styles.keypad}>
        {keyRows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.key,
                  key === 'Clear' && styles.clearKey,
                  key === 'Enter' && styles.enterKey,
                ]}
                onPress={() => handleNumberInput(key)}
              >
                <Text style={[
                  styles.keyText,
                  key === 'Clear' && styles.clearKeyText,
                  key === 'Enter' && styles.enterKeyText,
                ]}>
                  {key === 'Clear' ? '⌫' : key === 'Enter' ? '✓' : key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  // Render score display
  const renderScores = () => {
    if (gameMode === 'bot') {
      return (
        <View style={styles.scoresContainer}>
          <View style={styles.playerScore}>
            <Text style={styles.playerName}>{playerProfile.username}</Text>
            <Text style={styles.scoreText}>{myScore}</Text>
            <Text style={styles.correctText}>{myCorrect}/{questionCount}</Text>
          </View>
          <Text style={styles.vsText}>VS</Text>
          <View style={styles.playerScore}>
            <Text style={styles.playerName}>🤖 AI Bot</Text>
            <Text style={styles.scoreText}>{botScore}</Text>
            <Text style={styles.correctText}>{botCorrect}/{questionCount}</Text>
          </View>
        </View>
      );
    } else {
      const gameStateData = simpleMultiplayer.getGameState();
      return (
        <View style={styles.scoresContainer}>
          <View style={[styles.playerScore, currentPlayer === 1 && styles.activePlayer]}>
            <Text style={styles.playerName}>{gameStateData?.player1Name || 'Player 1'}</Text>
            <Text style={styles.scoreText}>{player1Score}</Text>
            <Text style={styles.correctText}>{player1Correct}/{Math.ceil(questionCount/2)}</Text>
          </View>
          <Text style={styles.vsText}>VS</Text>
          <View style={[styles.playerScore, currentPlayer === 2 && styles.activePlayer]}>
            <Text style={styles.playerName}>{gameStateData?.player2Name || 'Player 2'}</Text>
            <Text style={styles.scoreText}>{player2Score}</Text>
            <Text style={styles.correctText}>{player2Correct}/{Math.floor(questionCount/2)}</Text>
          </View>
        </View>
      );
    }
  };

  if (gameState === 'setup') {
    return (
      <BackgroundWrapper colors={backgroundColors} type={backgroundType} animationType={animationType} style={styles.container}>
        <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]} edges={['top', 'left', 'right']}>
          <View style={styles.setupContainer}>
            <Text style={styles.setupText}>Setting up {gameMode === 'bot' ? 'Bot Battle' : 'Local 1v1'}...</Text>
          </View>
        </SafeAreaView>
      </BackgroundWrapper>
    );
  }

  if (gameState === 'finished') {
    return (
      <BackgroundWrapper colors={backgroundColors} type={backgroundType} animationType={animationType} style={styles.container}>
        <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]} edges={['top', 'left', 'right']}>
          <View style={styles.finishedContainer}>
            <Text style={styles.gameOverText}>Game Over!</Text>
            {gameResults && (
              <Text style={styles.resultText}>
                {gameResults.winner === 'player' || (gameResults.winner === 'player1' && playerProfile.username === (gameResults as any).player1Name) ? 
                  '🎉 You Won!' : 
                  gameResults.winner === 'tie' ? 
                  '🤝 It\'s a Tie!' : 
                  '😔 You Lost'}
              </Text>
            )}
          </View>
        </SafeAreaView>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper colors={backgroundColors} type={backgroundType} animationType={animationType} style={styles.container}>
      <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackToMenu}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {gameMode === 'bot' ? 'Bot Battle' : 'Local 1v1'}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[
              styles.notepadButton,
              { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.9)' }
            ]} 
            onPress={() => setShowNotepad(true)}
          >
            <Text style={styles.notepadButtonText}>📝</Text>
          </TouchableOpacity>
          <Text style={styles.questionCounter}>{questionCount}/{totalQuestions}</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        {renderScores()}

        {gameMode === 'local1v1' && (
          <View style={styles.turnIndicator}>
            <Text style={styles.turnText}>
              {simpleMultiplayer.getCurrentPlayerName()}'s Turn
            </Text>
          </View>
        )}

        <View style={styles.gameArea}>
          {currentEquation && (
            <View style={styles.questionContainer}>
              <Text style={styles.questionText}>{currentEquation.question} = ?</Text>
            </View>
          )}

          <View style={styles.answerContainer}>
            <Text style={styles.answerLabel}>Your Answer:</Text>
            <View style={[
              styles.answerDisplay,
              showFeedback && isCorrectAnswer && styles.correctAnswerDisplay,
              showFeedback && !isCorrectAnswer && styles.incorrectAnswerDisplay
            ]}>
              <Text style={[
                styles.answerText,
                showFeedback && isCorrectAnswer && styles.correctAnswerText,
                showFeedback && !isCorrectAnswer && styles.incorrectAnswerText
              ]}>
                {currentAnswer || '_'}
              </Text>
            </View>
            
            {/* Feedback Display - Positioned above keypad */}
            {reduceMotion ? (
              // Static feedback area for reduced motion
              <View style={[styles.feedbackContainer, styles.feedbackStatic]}>
                {showFeedback ? (
                  <Text style={[styles.feedbackText, isCorrectAnswer ? styles.correctFeedback : styles.incorrectFeedback]}>
                    {feedbackText}
                  </Text>
                ) : (
                  <Text style={[styles.feedbackText, { opacity: 0 }]}>
                    Placeholder
                  </Text>
                )}
              </View>
            ) : (
              // Dynamic feedback (original behavior)
              showFeedback && (
                <View style={styles.feedbackContainer}>
                  <Text style={[styles.feedbackText, isCorrectAnswer ? styles.correctFeedback : styles.incorrectFeedback]}>
                    {feedbackText}
                  </Text>
                </View>
              )
            )}
          </View>

          {renderKeypad()}
        </View>
      </View>

      {/* Floating Timer */}
      <View style={styles.floatingTimer}>
        <Text style={styles.timerText}>{timeLeft}s</Text>
      </View>
      
      {/* Drawing Notepad */}
      <DrawingNotepad 
        visible={showNotepad} 
        onClose={() => setShowNotepad(false)} 
      />
    </SafeAreaView>
    </BackgroundWrapper>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Make transparent to show background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  notepadButton: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 10,
  },
  notepadButtonText: {
    fontSize: 16,
  },
  questionCounter: {
    color: '#fff',
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
  },
  scoresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#16213e',
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 10,
  },
  playerScore: {
    alignItems: 'center',
    flex: 1,
    padding: 8,
    borderRadius: 6,
  },
  activePlayer: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  playerName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  scoreText: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
  },
  correctText: {
    color: '#999',
    fontSize: 10,
  },
  vsText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 15,
  },
  turnIndicator: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  turnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gameArea: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
    paddingTop: 5,
  },
  floatingTimer: {
    position: 'absolute',
    top: 100,
    left: '50%',
    marginLeft: -40, // Half the width to center it
    backgroundColor: '#ff4757',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
    minWidth: 80,
    alignItems: 'center',
  },
  timerText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  questionContainer: {
    backgroundColor: '#16213e',
    padding: 15,
    borderRadius: 10,
    minWidth: width * 0.75,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
  },
  questionText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  answerContainer: {
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 5,
  },
  answerLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 6,
  },
  answerDisplay: {
    backgroundColor: '#16213e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  correctAnswerDisplay: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
    borderWidth: 3,
  },
  incorrectAnswerDisplay: {
    backgroundColor: '#ffeaea',
    borderColor: '#F44336',
    borderWidth: 3,
  },
  answerText: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
    minHeight: 25,
  },
  correctAnswerText: {
    color: '#2e7d32', // Darker green for correct
  },
  incorrectAnswerText: {
    color: '#d32f2f', // Darker red for incorrect
  },
  
  // Feedback styles
  feedbackContainer: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  feedbackStatic: {
    minHeight: 50,
    justifyContent: 'center',
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  correctFeedback: {
    color: '#4CAF50', // Green for correct
  },
  incorrectFeedback: {
    color: '#F44336', // Red for incorrect
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupText: {
    color: '#fff',
    fontSize: 18,
  },
  finishedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  resultText: {
    color: '#4CAF50',
    fontSize: 24,
    fontWeight: 'bold',
  },
  
  // Keypad styles
  keypad: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'transparent', // Let background show through
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
  },
  key: {
    width: 65,
    height: 50,
    backgroundColor: '#000000', // Black background
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1.5,
    borderColor: '#ffffff', // White outline
  },
  keyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff', // White text
  },
  clearKey: {
    backgroundColor: '#000000', // Keep black background
    borderColor: '#ff5722', // Red outline for clear
    borderWidth: 2,
  },
  clearKeyText: {
    color: '#ff5722', // Red text for clear
    fontSize: 18,
  },
  enterKey: {
    backgroundColor: '#000000', // Keep black background
    borderColor: '#4caf50', // Green outline for enter
    borderWidth: 2,
  },
  enterKeyText: {
    color: '#4caf50', // Green text for enter
    fontSize: 18,
  },
});

export default SimpleMultiplayerGameScreen;