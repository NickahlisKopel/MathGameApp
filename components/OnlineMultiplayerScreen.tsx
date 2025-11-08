import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlayerProfile } from '../types/Player';
import { socketMultiplayerService } from '../services/socketMultiplayerService';
import { authService } from '../services/AuthService';
import { useBackground } from '../hooks/useBackground';
import { useTheme } from '../contexts/ThemeContext';
import ForestBackground from './ForestBackground';
import SpaceBackground from './SpaceBackground';
import { LinearGradient } from 'expo-linear-gradient';

interface OnlineMultiplayerScreenProps {
  playerProfile: PlayerProfile;
  difficulty: 'easy' | 'medium' | 'hard';
  onGameEnd: (results: any) => void;
  onBackToMenu: () => void;
}

type GameState = 'connecting' | 'matchmaking' | 'ready' | 'playing' | 'finished';

// Background wrapper component
const BackgroundWrapper: React.FC<{
  colors: string[];
  type: string;
  animationType?: string;
  style: any;
  children: React.ReactNode;
}> = ({ colors, type, animationType, style, children }) => {
  if (type === 'animated' && animationType === 'space') {
    return (
      <SpaceBackground starCount={50} spaceshipVisible={true} animated={true}>
        <View style={style}>{children}</View>
      </SpaceBackground>
    );
  } else if (type === 'animated' && animationType === 'forest') {
    return (
      <ForestBackground treeCount={8} birdCount={3} animated={true}>
        <View style={style}>{children}</View>
      </ForestBackground>
    );
  } else if (type === 'solid') {
    return <View style={[style, { backgroundColor: colors[0] }]}>{children}</View>;
  } else {
    return <LinearGradient colors={colors as [string, string, ...string[]]} style={style}>{children}</LinearGradient>;
  }
};

export const OnlineMultiplayerScreen: React.FC<OnlineMultiplayerScreenProps> = ({
  playerProfile,
  difficulty,
  onGameEnd,
  onBackToMenu,
}) => {
  const { backgroundColors, backgroundType, animationType } = useBackground();
  const { theme } = useTheme();
  
  const [gameState, setGameState] = useState<GameState>('connecting');
  const [opponent, setOpponent] = useState<any>(null);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Connecting to server...');
  const gameEndedRef = React.useRef(false);
  
  // Game logic state
  const [currentEquation, setCurrentEquation] = useState<{ question: string; answer: number } | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions] = useState(10);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [gameStartTime, setGameStartTime] = useState(Date.now());
  const [myQuestionsCompleted, setMyQuestionsCompleted] = useState(0);
  const [opponentQuestionsCompleted, setOpponentQuestionsCompleted] = useState(0);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    initializeConnection();
    
    return () => {
      // Cleanup on unmount
      socketMultiplayerService.disconnect();
    };
  }, []);

  // Countdown timer for ready state
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up! Finish with current score
          const totalTime = (Date.now() - gameStartTime) / 1000;
          socketMultiplayerService.submitAnswer(
            0, 
            false, 
            totalTime, 
            currentEquation?.question || 'N/A', 
            currentEquation?.answer || 0
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, gameStartTime]);

  const initializeConnection = async () => {
    try {
      console.log('[OnlineMultiplayer] Initializing connection...');
      setStatusMessage('Connecting to server...');
      
      // Ensure authenticated online user (not offline/guest)
      const authUser = authService.getCurrentUser();
      if (!authUser || authUser.isOffline) {
        Alert.alert('Sign-in required', 'Please sign in to play online multiplayer.');
        onBackToMenu();
        return;
      }

      // Setup event handlers FIRST (before checking room or connecting)
      socketMultiplayerService.onMatchFound = (data) => {
        console.log('Match found:', data);
        setOpponent({ name: data.opponent.name, level: data.opponent.level });
        setGameState('ready');
        setStatusMessage('Match ready!');
        setCountdown(3); // Start 3-second countdown
      };

      socketMultiplayerService.onGameStart = (data) => {
        console.log('Game started:', data);
        startGame(); // This will set state to playing and generate first question
      };

      socketMultiplayerService.onScoreUpdate = (data) => {
        console.log('[OnlineMultiplayer] Score update:', data.playerId, data.score, 'My ID:', playerProfile.id);
        if (data.playerId === playerProfile.id) {
          setMyScore(data.score);
        } else {
          setOpponentScore(data.score);
        }
      };

      // Listen for opponent completion
      socketMultiplayerService.onPlayerCompleted = (data) => {
        console.log('[OnlineMultiplayer] Player completed:', data.playerId, 'My ID:', playerProfile.id);
        if (data.playerId !== playerProfile.id) {
          setOpponentQuestionsCompleted(10);
        }
      };

      socketMultiplayerService.onGameEnd = (data) => {
        console.log('[OnlineMultiplayer] Game ended:', data);
        console.log('[OnlineMultiplayer] Scores from server:', data.scores);
        console.log('[OnlineMultiplayer] My player ID:', playerProfile.id);
        console.log('[OnlineMultiplayer] Opponent ID:', opponent?.id);
        gameEndedRef.current = true;
        
        const iWon = data.winner === playerProfile.id;
        
        // Get all player IDs from scores object
        const playerIds = Object.keys(data.scores);
        const opponentId = playerIds.find(id => id !== playerProfile.id);
        
        // Use scores from server data (most accurate)
        const myFinalScore = data.scores[playerProfile.id] || 0;
        const opponentFinalScore = opponentId ? data.scores[opponentId] : 0;
        
        console.log('[OnlineMultiplayer] Final scores - Me:', myFinalScore, 'Opponent:', opponentFinalScore);
        console.log('[OnlineMultiplayer] Questions data:', JSON.stringify(data.questions, null, 2));
        
        // Check for tie
        const isTie = myFinalScore === opponentFinalScore;
        
        // Calculate coin rewards based on difficulty and whether player won
        let baseCoins = 0;
        switch (difficulty) {
          case 'easy':
            baseCoins = 50;
            break;
          case 'medium':
            baseCoins = 75;
            break;
          case 'hard':
            baseCoins = 100;
            break;
        }
        
        // Winner gets full amount, loser gets half, tie gets full amount
        const coinsEarned = isTie ? baseCoins : (iWon ? baseCoins : Math.floor(baseCoins / 2));
        
        const myName = playerProfile.username || authUser.displayName || 'You';
        const opponentName = opponent?.name || 'Opponent';
        
        const finalResults = {
          mode: 'online-pvp' as const,
          difficulty,
          score: myFinalScore,
          totalQuestions,
          winner: isTie ? 'Tie' : (iWon ? myName : opponentName),
          players: [
            { id: playerProfile.id, name: myName, score: myFinalScore, isWinner: isTie ? false : iWon },
            { id: opponentId || 'opponent', name: opponentName, score: opponentFinalScore, isWinner: !iWon },
          ],
          questions: data.questions || [], // Include questions and answers
          myId: playerProfile.id,
          opponentId: opponentId || 'opponent',
          coinsEarned, // Add coins earned
        };
        setGameState('finished');
        // Disconnect from socket to prevent disconnect alert
        setTimeout(() => {
          socketMultiplayerService.disconnect();
        }, 100);
        onGameEnd(finalResults);
      };

      socketMultiplayerService.onOpponentDisconnect = () => {
        // Only show disconnect alert if game hasn't ended yet
        if (!gameEndedRef.current) {
          Alert.alert('Opponent Left', 'Your opponent has disconnected.');
          onBackToMenu();
        }
      };

      socketMultiplayerService.onError = (error) => {
        Alert.alert('Error', error);
        onBackToMenu();
      };

      // Check if we're already in a room (from friend challenge) AFTER setting up handlers
      const currentRoom = socketMultiplayerService.getCurrentRoom();
      console.log('[OnlineMultiplayer] Current room before connect:', currentRoom);
      console.log('[OnlineMultiplayer] Is connected:', socketMultiplayerService.getIsConnected());
      
      if (currentRoom) {
        console.log('[OnlineMultiplayer] Already in room from friend challenge:', currentRoom);
        setGameState('ready');
        setStatusMessage('Match ready!');
        setCountdown(3); // Start 3-second countdown
        // Event handlers are already set up, just wait for game-start event
        return;
      }

      // Connect to Socket.IO server
      // For physical devices on same WiFi: use your computer's IP address
      // For emulator: use localhost (Android) or 10.0.2.2 (Android emulator bridge)
      const serverUrl = 'https://mathgameapp.onrender.com';
      const connected = await socketMultiplayerService.connect(serverUrl, authUser, playerProfile.id);
      
      if (!connected) {
        Alert.alert('Connection Error', 'Failed to connect to multiplayer server. Make sure the server is running.');
        onBackToMenu();
        return;
      }
      
      setGameState('matchmaking');
      setStatusMessage('Finding opponent...');
      
      // Join matchmaking queue
      socketMultiplayerService.joinMatchmaking(difficulty);
      
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Error', 'Failed to connect to multiplayer service.');
      onBackToMenu();
    }
  };

  // Removed checkForOpponent - now handled by Socket.IO events

  const startGame = () => {
    setGameState('playing');
    setStatusMessage('Game started!');
    setQuestionNumber(1);
    setTimeLeft(120); // Reset to 2 minutes
    setGameStartTime(Date.now());
    setMyQuestionsCompleted(0);
    setOpponentQuestionsCompleted(0);
    generateNewEquation();
  };

  // Generate equation based on difficulty
  const generateNewEquation = () => {
    let num1: number, num2: number, operation: string, answer: number;

    switch (difficulty) {
      case 'easy':
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        if (Math.random() > 0.5) {
          operation = '+';
          answer = num1 + num2;
        } else {
          operation = '-';
          if (num1 < num2) [num1, num2] = [num2, num1];
          answer = num1 - num2;
        }
        break;

      case 'medium':
        num1 = Math.floor(Math.random() * 20) + 1;
        num2 = Math.floor(Math.random() * 20) + 1;
        const medOp = Math.floor(Math.random() * 3);
        if (medOp === 0) {
          operation = '+';
          answer = num1 + num2;
        } else if (medOp === 1) {
          operation = '-';
          if (num1 < num2) [num1, num2] = [num2, num1];
          answer = num1 - num2;
        } else {
          operation = '×';
          num1 = Math.floor(Math.random() * 12) + 1;
          num2 = Math.floor(Math.random() * 12) + 1;
          answer = num1 * num2;
        }
        break;

      case 'hard':
        num1 = Math.floor(Math.random() * 50) + 10;
        num2 = Math.floor(Math.random() * 50) + 10;
        const hardOp = Math.floor(Math.random() * 4);
        if (hardOp === 0) {
          operation = '+';
          answer = num1 + num2;
        } else if (hardOp === 1) {
          operation = '-';
          if (num1 < num2) [num1, num2] = [num2, num1];
          answer = num1 - num2;
        } else if (hardOp === 2) {
          operation = '×';
          num1 = Math.floor(Math.random() * 15) + 5;
          num2 = Math.floor(Math.random() * 15) + 5;
          answer = num1 * num2;
        } else {
          operation = '÷';
          answer = Math.floor(Math.random() * 12) + 2;
          num2 = Math.floor(Math.random() * 12) + 2;
          num1 = answer * num2;
        }
        break;

      default:
        num1 = 1;
        num2 = 1;
        operation = '+';
        answer = 2;
    }

    setCurrentEquation({
      question: `${num1} ${operation} ${num2} = ?`,
      answer,
    });
    setCurrentAnswer('');
    setQuestionStartTime(Date.now());
  };

  // Handle answer submission
  const handleSubmitAnswer = () => {
    if (!currentEquation || currentAnswer === '') return;

    const userAnswer = parseInt(currentAnswer, 10);
    const correct = userAnswer === currentEquation.answer;
    const timeSpent = (Date.now() - questionStartTime) / 1000;

    // Submit to server with question details
    socketMultiplayerService.submitAnswer(
      userAnswer, 
      correct, 
      timeSpent, 
      currentEquation.question, 
      currentEquation.answer
    );

    // Don't update local score - let server broadcast the score update
    // This prevents double-counting when server broadcasts to all players

    // Move to next question
    if (questionNumber < totalQuestions) {
      setQuestionNumber(prev => prev + 1);
      generateNewEquation();
    } else {
      // Completed all 10 questions
      const completionTime = (Date.now() - gameStartTime) / 1000; // Total time in seconds
      setMyQuestionsCompleted(10);
      setWaitingForOpponent(true); // Show waiting message
      // Send completion time to server
      socketMultiplayerService.sendCompletionTime(completionTime);
    }
  };

  // Handle keypad input
  const handleNumberPress = (num: string) => {
    if (currentAnswer.length < 6) {
      setCurrentAnswer(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setCurrentAnswer(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setCurrentAnswer('');
  };

  const renderConnectionScreen = () => (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={styles.statusText}>{statusMessage}</Text>
      <TouchableOpacity style={styles.cancelButton} onPress={onBackToMenu}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMatchmakingScreen = () => (
    <View style={styles.centerContent}>
      <Text style={styles.titleText}>🎮 Finding Match</Text>
      <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
      <Text style={styles.statusText}>{statusMessage}</Text>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>⚔️ {playerProfile.username}</Text>
        <Text style={styles.difficultyText}>Difficulty: {difficulty}</Text>
      </View>
      <TouchableOpacity style={styles.cancelButton} onPress={onBackToMenu}>
        <Text style={styles.cancelButtonText}>Cancel Matchmaking</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReadyScreen = () => (
    <View style={styles.centerContent}>
      <Text style={styles.titleText}>🎮 Match Found!</Text>
      <View style={styles.vsContainer}>
        <View style={styles.playerCard}>
          <Text style={styles.playerCardTitle}>You</Text>
          <Text style={styles.playerCardName}>{playerProfile.username}</Text>
          <Text style={styles.playerCardLevel}>Level {playerProfile.level}</Text>
        </View>
        <Text style={styles.vsText}>VS</Text>
        <View style={styles.playerCard}>
          <Text style={styles.playerCardTitle}>Opponent</Text>
          <Text style={styles.playerCardName}>{opponent?.name || 'Friend'}</Text>
          <Text style={styles.playerCardLevel}>Level {opponent?.level || '?'}</Text>
        </View>
      </View>
      {countdown !== null ? (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownNumber}>{countdown}</Text>
          <Text style={styles.countdownLabel}>Get Ready!</Text>
        </View>
      ) : (
        <>
          <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 30 }} />
          <Text style={styles.countdownText}>Starting soon...</Text>
        </>
      )}
    </View>
  );

  const renderGameScreen = () => {
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <View style={styles.gameContainer}>
        {/* Progress Bar with Timer */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              Question {questionNumber}/{totalQuestions}
            </Text>
            <Text style={[styles.timerText, timeLeft <= 20 && styles.timerWarning]}>
              {formatTime(timeLeft)}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${(questionNumber / totalQuestions) * 100}%` }]} 
            />
          </View>
        </View>

        {/* Scores */}
        <View style={styles.scoresContainer}>
        <View style={[styles.scoreCard, styles.myScoreCard]}>
          <Text style={styles.scoreName}>You</Text>
          <Text style={styles.scoreValue}>{myScore}</Text>
        </View>
        <View style={[styles.scoreCard, styles.opponentScoreCard]}>
          <Text style={styles.scoreName}>{opponent?.name || 'Opponent'}</Text>
          <Text style={styles.scoreValue}>{opponentScore}</Text>
        </View>
      </View>

      {/* Equation Display */}
      {currentEquation && (
        <View style={styles.equationContainer}>
          <Text style={styles.equationText}>{currentEquation.question}</Text>
        </View>
      )}

      {/* Answer Display */}
      <View style={styles.answerContainer}>
        <Text style={styles.answerText}>{currentAnswer || '...'}</Text>
      </View>

      {/* Keypad */}
      <View style={styles.keypadContainer}>
        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.keypadButton}
                onPress={() => handleNumberPress(key)}
              >
                <Text style={styles.keypadButtonText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        
        {/* Bottom Row: Delete, 0, Submit */}
        <View style={styles.keypadRow}>
          <TouchableOpacity
            style={[styles.keypadButton, styles.keypadSpecialButton]}
            onPress={handleDelete}
          >
            <Text style={styles.keypadSpecialButtonText}>⌫</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.keypadButton}
            onPress={() => handleNumberPress('0')}
          >
            <Text style={styles.keypadButtonText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, !currentAnswer && styles.submitButtonDisabled]}
            onPress={handleSubmitAnswer}
            disabled={!currentAnswer}
          >
            <Text style={styles.submitButtonText}>✓</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
    );
  };

  const renderWaitingScreen = () => (
    <View style={styles.centerContent}>
      <Text style={styles.titleText}>✅ Great Job!</Text>
      <Text style={styles.completionText}>
        You completed all {totalQuestions} questions!
      </Text>
      <Text style={styles.scoreDisplayText}>Your Score: {myScore}</Text>
      
      <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
      
      <Text style={styles.waitingText}>
        Thank you, please wait for your opponent to finish
      </Text>
      
      <View style={styles.timerDisplay}>
        <Text style={styles.timerLabel}>Time Remaining:</Text>
        <Text style={[styles.timerValue, timeLeft <= 20 && styles.timerWarning]}>
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </Text>
      </View>
    </View>
  );

  const renderFinishedScreen = () => (
    <View style={styles.centerContent}>
      <Text style={styles.titleText}>🏆 Game Over!</Text>
      <View style={styles.finalScoresContainer}>
        <View style={[styles.playerCard, myScore > opponentScore && styles.winnerCard]}>
          <Text style={styles.playerCardTitle}>You</Text>
          <Text style={styles.scoreValue}>{myScore}</Text>
          {myScore > opponentScore && <Text style={styles.winnerText}>Winner!</Text>}
        </View>
        <View style={[styles.playerCard, opponentScore > myScore && styles.winnerCard]}>
          <Text style={styles.playerCardTitle}>{opponent?.name || 'Opponent'}</Text>
          <Text style={styles.scoreValue}>{opponentScore}</Text>
          {opponentScore > myScore && <Text style={styles.winnerText}>Winner!</Text>}
        </View>
        {myScore === opponentScore && <Text style={styles.tieText}>It's a tie!</Text>}
      </View>
      <Text style={styles.statusText}>Returning to menu...</Text>
    </View>
  );

  return (
    <BackgroundWrapper colors={backgroundColors} type={backgroundType} animationType={animationType} style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBackToMenu}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Online PvP</Text>
          <View style={styles.headerRight} />
        </View>

        {gameState === 'connecting' && renderConnectionScreen()}
        {gameState === 'matchmaking' && renderMatchmakingScreen()}
        {gameState === 'ready' && renderReadyScreen()}
        {gameState === 'playing' && !waitingForOpponent && renderGameScreen()}
        {gameState === 'playing' && waitingForOpponent && renderWaitingScreen()}
        {gameState === 'finished' && renderFinishedScreen()}
      </SafeAreaView>
    </BackgroundWrapper>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    width: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'ios' ? 15 : 20,
  },
  titleText: {
    fontSize: Platform.OS === 'ios' ? 24 : 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: Platform.OS === 'ios' ? 15 : 20,
  },
  statusText: {
    fontSize: Platform.OS === 'ios' ? 16 : 18,
    color: '#fff',
    marginTop: Platform.OS === 'ios' ? 15 : 20,
    textAlign: 'center',
  },
  loader: {
    marginVertical: Platform.OS === 'ios' ? 15 : 20,
  },
  playerInfo: {
    marginTop: Platform.OS === 'ios' ? 20 : 30,
    padding: Platform.OS === 'ios' ? 15 : 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    alignItems: 'center',
  },
  playerName: {
    fontSize: Platform.OS === 'ios' ? 20 : 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: Platform.OS === 'ios' ? 6 : 8,
  },
  difficultyText: {
    fontSize: Platform.OS === 'ios' ? 14 : 16,
    color: '#4CAF50',
  },
  cancelButton: {
    marginTop: Platform.OS === 'ios' ? 25 : 40,
    paddingVertical: Platform.OS === 'ios' ? 10 : 12,
    paddingHorizontal: Platform.OS === 'ios' ? 25 : 30,
    backgroundColor: '#ff4444',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'ios' ? 14 : 16,
    fontWeight: 'bold',
  },
  vsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: Platform.OS === 'ios' ? 10 : 20,
    gap: 15,
  },
  playerCard: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: Platform.OS === 'ios' ? 10 : 12,
    borderRadius: 10,
    alignItems: 'center',
    width: 90,
  },
  playerCardTitle: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  playerCardName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
    textAlign: 'center',
  },
  playerCardLevel: {
    fontSize: 11,
    color: '#4CAF50',
  },
  vsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff4444',
    marginHorizontal: 8,
  },
  countdownText: {
    fontSize: Platform.OS === 'ios' ? 18 : 20,
    color: '#4CAF50',
    marginTop: Platform.OS === 'ios' ? 20 : 30,
    fontWeight: 'bold',
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginVertical: 20,
  },
  scoresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
  },
  scoreCard: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  scoreName: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  gameContainer: {
    flex: 1,
    padding: 12,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  timerWarning: {
    color: '#ff4444',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  myScoreCard: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  opponentScoreCard: {
    borderColor: '#ff4444',
    borderWidth: 2,
  },
  equationContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: Platform.OS === 'ios' ? 12 : 15,
    borderRadius: 12,
    marginVertical: Platform.OS === 'ios' ? 8 : 10,
    alignItems: 'center',
  },
  equationText: {
    fontSize: Platform.OS === 'ios' ? 32 : 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  answerContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: Platform.OS === 'ios' ? 10 : 12,
    borderRadius: 10,
    marginBottom: Platform.OS === 'ios' ? 10 : 12,
    minHeight: Platform.OS === 'ios' ? 55 : 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerText: {
    fontSize: Platform.OS === 'ios' ? 28 : 32,
    fontWeight: 'bold',
    color: '#333',
  },
  keypadContainer: {
    marginTop: 5,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  keypadButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: Platform.OS === 'ios' ? 55 : 60,
    height: Platform.OS === 'ios' ? 55 : 60,
    borderRadius: Platform.OS === 'ios' ? 27.5 : 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Platform.OS === 'ios' ? 5 : 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  keypadSpecialButton: {
    backgroundColor: 'rgba(255,100,100,0.9)',
  },
  keypadButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  keypadSpecialButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    width: Platform.OS === 'ios' ? 55 : 60,
    height: Platform.OS === 'ios' ? 55 : 60,
    borderRadius: Platform.OS === 'ios' ? 27.5 : 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Platform.OS === 'ios' ? 5 : 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  submitButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  finalScoresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
  },
  winnerCard: {
    borderColor: '#FFD700',
    borderWidth: 3,
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  winnerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 8,
  },
  tieText: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 10,
  },
  completionText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  scoreDisplayText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 20,
  },
  waitingText: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 30,
    fontWeight: '500',
  },
  timerDisplay: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  timerLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
  },
  timerValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  countdownContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  countdownNumber: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#4CAF50',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  countdownLabel: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
    marginTop: 10,
  },
});

export default OnlineMultiplayerScreen;
