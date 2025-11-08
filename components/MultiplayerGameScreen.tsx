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
import { SafeAreaView } from 'react-native-safe-area-context';
import { localMultiplayer } from '../services/localMultiplayer';
import { localAuth } from '../services/localAuth';
import { GameRewards } from '../utils/GameRewards';
import { PlayerStorageService } from '../services/PlayerStorageService';
import { PlayerProfile } from '../types/Player';

interface Equation {
  question: string;
  answer: number;
  questionId: string;
}

interface GamePlayer {
  id: string;
  name: string;
  score: number;
  answered: boolean;
  timeSpent: number;
}

interface MultiplayerGameScreenProps {
  playerProfile: PlayerProfile;
  onGameEnd: (results: any) => void;
  onBackToMenu: () => void;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const MultiplayerGameScreen: React.FC<MultiplayerGameScreenProps> = ({
  playerProfile,
  onGameEnd,
  onBackToMenu,
  difficulty,
}) => {
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [currentEquation, setCurrentEquation] = useState<Equation | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per question
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions] = useState(10); // 10 questions per multiplayer game
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Initialize multiplayer connection
  useEffect(() => {
    initializeMultiplayer();
    return () => {
      localMultiplayer.disconnect();
    };
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (gameState === 'playing' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      handleTimeUp();
    }
    return () => {
      if (interval !== undefined) {
        clearInterval(interval);
      }
    };
  }, [gameState, timeLeft]);

  const initializeMultiplayer = async () => {
    try {
      const user = localAuth.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Connect to local multiplayer
      const connected = await localMultiplayer.connect(user.displayName || 'Player');
      if (!connected) throw new Error('Failed to connect to multiplayer');

      // Set up event handlers
      localMultiplayer.onGameEvent = handleGameEvent;
      localMultiplayer.onPlayerJoined = handlePlayerJoined;
      localMultiplayer.onPlayerLeft = handlePlayerLeft;

      // Join or create a game room
      const roomId = `MathGame_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await localMultiplayer.joinOrCreateRoom(roomId, 4); // Max 4 players

      // Initialize players array with self
      setPlayers([{
        id: user.uid,
        name: user.displayName || 'Player',
        score: 0,
        answered: false,
        timeSpent: 0,
      }]);

      // Start the game after a short delay
      setTimeout(() => {
        startMultiplayerGame();
      }, 2000);

    } catch (error) {
      console.error('Multiplayer initialization error:', error);
      Alert.alert('Connection Error', 'Failed to connect to multiplayer game');
      onBackToMenu();
    }
  };

  const handleGameEvent = (eventCode: number, data: any, playerId: string) => {
    switch (eventCode) {
      case 1: // New question
        handleNewQuestion(data);
        break;
      case 2: // Player answer
        handlePlayerAnswer(data, playerId);
        break;
      case 3: // Score update
        handleScoreUpdate(data, playerId);
        break;
      case 10: // Game start
        handleGameStart(data);
        break;
      case 11: // Game end
        handleGameEnd(data);
        break;
    }
  };

  const handlePlayerJoined = (player: any) => {
    setPlayers(prev => [...prev, {
      id: player.id,
      name: player.name,
      score: 0,
      answered: false,
      timeSpent: 0,
    }]);
  };

  const handlePlayerLeft = (player: any) => {
    setPlayers(prev => prev.filter(p => p.id !== player.id));
  };

  const generateEquation = useCallback((): Equation => {
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
        num1 = Math.floor(Math.random() * 50) + 1;
        num2 = Math.floor(Math.random() * 50) + 1;
        const ops = ['+', '-', '×'];
        operation = ops[Math.floor(Math.random() * ops.length)];
        if (operation === '+') answer = num1 + num2;
        else if (operation === '-') {
          if (num1 < num2) [num1, num2] = [num2, num1];
          answer = num1 - num2;
        } else {
          num1 = Math.floor(Math.random() * 12) + 1;
          num2 = Math.floor(Math.random() * 12) + 1;
          answer = num1 * num2;
        }
        break;
      case 'hard':
        num1 = Math.floor(Math.random() * 100) + 1;
        num2 = Math.floor(Math.random() * 100) + 1;
        const hardOps = ['+', '-', '×', '÷'];
        operation = hardOps[Math.floor(Math.random() * hardOps.length)];
        if (operation === '+') answer = num1 + num2;
        else if (operation === '-') {
          if (num1 < num2) [num1, num2] = [num2, num1];
          answer = num1 - num2;
        } else if (operation === '×') {
          num1 = Math.floor(Math.random() * 25) + 1;
          num2 = Math.floor(Math.random() * 25) + 1;
          answer = num1 * num2;
        } else {
          answer = Math.floor(Math.random() * 20) + 1;
          num2 = Math.floor(Math.random() * 12) + 1;
          num1 = answer * num2;
        }
        break;
    }

    const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    return {
      question: `${num1} ${operation} ${num2} = ?`,
      answer,
      questionId,
    };
  }, [difficulty]);

  const startMultiplayerGame = () => {
    setGameState('playing');
    setGameStartTime(new Date());
    setQuestionCount(0);
    setMyScore(0);
    
    // Generate first question
    const equation = generateEquation();
    setCurrentEquation(equation);
    setQuestionStartTime(new Date());
    setTimeLeft(30);

    // Broadcast new question to all players
    localMultiplayer.sendGameEvent(1, {
      question: equation.question,
      questionId: equation.questionId,
      answer: equation.answer,
      timeLimit: 30,
    });

    // Send game start event
    localMultiplayer.sendGameEvent(10, {
      action: 'start_game',
      maxQuestions,
      difficulty,
    });
  };

  const handleNewQuestion = (data: any) => {
    if (data.questionId !== currentEquation?.questionId) {
      setCurrentEquation({
        question: data.question,
        answer: data.answer,
        questionId: data.questionId,
      });
      setQuestionStartTime(new Date());
      setTimeLeft(data.timeLimit || 30);
      setCurrentAnswer('');
      setIsCorrect(null);
      
      // Reset all players' answered status
      setPlayers(prev => prev.map(p => ({ ...p, answered: false })));
    }
  };

  const handlePlayerAnswer = (data: any, playerId: string) => {
    setPlayers(prev => prev.map(p => 
      p.id === playerId 
        ? { ...p, answered: true, timeSpent: data.timeSpent }
        : p
    ));
  };

  const handleScoreUpdate = (data: any, playerId: string) => {
    setPlayers(prev => prev.map(p => 
      p.id === playerId 
        ? { ...p, score: data.score }
        : p
    ));
  };

  const handleGameStart = (data: any) => {
    // Handle game start from other players
  };

  const handleGameEnd = (data: any) => {
    setGameState('finished');
    showResults();
  };

  const submitAnswer = (answer: string) => {
    if (!answer.trim() || !currentEquation || !questionStartTime) return;
    
    const numAnswer = parseInt(answer);
    const correct = numAnswer === currentEquation.answer;
    const timeSpent = (Date.now() - questionStartTime.getTime()) / 1000;
    
    setIsCorrect(correct);
    setCurrentAnswer(answer);
    
    if (correct) {
      setMyScore(prev => prev + 1);
    }

    // Send answer to other players
    localMultiplayer.sendPlayerAnswer(
      currentEquation.questionId,
      correct ? 1 : 0,
      timeSpent
    );

    // Send score update
    localMultiplayer.sendScoreUpdate(correct ? myScore + 1 : myScore, correct ? myScore + 1 : myScore);

    // Show feedback animation
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.3, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Move to next question after delay
    setTimeout(() => {
      nextQuestion();
    }, 2000);
  };

  const nextQuestion = () => {
    const newQuestionCount = questionCount + 1;
    setQuestionCount(newQuestionCount);

    if (newQuestionCount >= maxQuestions) {
      // Game finished
      finishGame();
    } else {
      // Generate next question
      const equation = generateEquation();
      setCurrentEquation(equation);
      setQuestionStartTime(new Date());
      setTimeLeft(30);
      setCurrentAnswer('');
      setIsCorrect(null);

      // Broadcast new question
      localMultiplayer.sendGameEvent(1, {
        question: equation.question,
        questionId: equation.questionId,
        answer: equation.answer,
        timeLimit: 30,
      });
    }
  };

  const handleTimeUp = () => {
    if (currentAnswer === '') {
      setIsCorrect(false);
      setTimeout(() => {
        nextQuestion();
      }, 1000);
    }
  };

  const finishGame = () => {
    setGameState('finished');
    
    // Send game end event
    localMultiplayer.sendGameEvent(11, {
      action: 'end_game',
      finalScore: myScore,
    });

    setTimeout(() => {
      showResults();
    }, 1000);
  };

  const showResults = async () => {
    try {
      // Calculate game duration
      const gameTime = gameStartTime ? (Date.now() - gameStartTime.getTime()) / 1000 : 0;
      
      // Create game result
      const gameResult = GameRewards.createGameResult(
        myScore,
        maxQuestions,
        gameTime,
        difficulty,
        0 // streak not implemented for multiplayer yet
      );

      // Update player profile with rewards
      const updatedProfile = {
        ...playerProfile,
        coins: playerProfile.coins + gameResult.coinsEarned,
        experience: playerProfile.experience + gameResult.experienceGained,
        gamesPlayed: playerProfile.gamesPlayed + 1,
      };
      
      // Save updated profile
      await PlayerStorageService.savePlayerProfile(updatedProfile);

      onGameEnd({
        ...gameResult,
        playerProfile: updatedProfile,
        players: players.sort((a, b) => b.score - a.score), // Sort by score
        isMultiplayer: true,
      });
    } catch (error) {
      console.error('Error saving game results:', error);
      onGameEnd({
        score: myScore,
        totalQuestions: maxQuestions,
        accuracy: Math.round((myScore / maxQuestions) * 100),
        players: players.sort((a, b) => b.score - a.score),
        isMultiplayer: true,
      });
    }
  };

  const renderKeypad = () => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', 'Enter'];
    
    return (
      <View style={styles.keypad}>
        {keys.map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.key,
              key === 'Clear' && styles.clearKey,
              key === 'Enter' && styles.enterKey,
            ]}
            onPress={() => {
              if (key === 'Clear') {
                setCurrentAnswer('');
              } else if (key === 'Enter') {
                submitAnswer(currentAnswer);
              } else {
                setCurrentAnswer(prev => prev + key);
              }
            }}
          >
            <Text style={[
              styles.keyText,
              key === 'Clear' && styles.clearKeyText,
              key === 'Enter' && styles.enterKeyText,
            ]}>
              {key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (gameState === 'waiting') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.waitingContainer}>
          <Text style={styles.title}>🎮 Multiplayer Math Battle</Text>
          <Text style={styles.subtitle}>Connecting to game...</Text>
          <Text style={styles.playerCount}>Players: {players.length}/4</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.gameContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.gameInfo}>
            <Text style={styles.questionCounter}>Question {questionCount + 1}/{maxQuestions}</Text>
            <Text style={styles.timer}>⏱️ {timeLeft}s</Text>
          </View>
          <TouchableOpacity style={styles.quitButton} onPress={onBackToMenu}>
            <Text style={styles.quitButtonText}>Quit</Text>
          </TouchableOpacity>
        </View>

        {/* Players Scoreboard */}
        <View style={styles.scoreboard}>
          {players.slice(0, 4).map((player, index) => (
            <View key={player.id} style={[
              styles.playerCard,
              player.id === localAuth.getCurrentUser()?.uid && styles.myPlayerCard
            ]}>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.playerScore}>{player.score}</Text>
              {player.answered && <Text style={styles.answeredIndicator}>✓</Text>}
            </View>
          ))}
        </View>

        {/* Question */}
        <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
          <Text style={styles.equation}>{currentEquation?.question || ''}</Text>
        </Animated.View>

        {/* Answer Input */}
        <View style={styles.answerContainer}>
          <View style={styles.answerInput}>
            <Text style={styles.answerText}>{currentAnswer || '?'}</Text>
          </View>
        </View>

        {/* Feedback */}
        {isCorrect !== null && (
          <View style={styles.feedbackContainer}>
            <Text style={[
              styles.feedback,
              isCorrect ? styles.correctFeedback : styles.incorrectFeedback
            ]}>
              {isCorrect ? '🎉 Correct!' : `❌ Wrong! Answer: ${currentEquation?.answer}`}
            </Text>
          </View>
        )}

        {/* Keypad */}
        {renderKeypad()}
      </View>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 10,
    color: '#666',
  },
  playerCount: {
    fontSize: 16,
    color: '#888',
  },
  gameContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  gameInfo: {
    flex: 1,
  },
  questionCounter: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff6b6b',
  },
  quitButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quitButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  scoreboard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  playerCard: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  myPlayerCard: {
    backgroundColor: '#4caf50',
  },
  playerName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  playerScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  answeredIndicator: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: 'bold',
  },
  questionContainer: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    marginBottom: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  equation: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  answerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  answerInput: {
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: '#4caf50',
    borderRadius: 15,
    paddingHorizontal: 30,
    paddingVertical: 15,
    minWidth: 120,
    alignItems: 'center',
  },
  answerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  feedbackContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  feedback: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  correctFeedback: {
    color: '#4caf50',
  },
  incorrectFeedback: {
    color: '#f44336',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  key: {
    width: (width - 80) / 3 - 10,
    height: 50,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  keyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  clearKey: {
    backgroundColor: '#ff9800',
  },
  clearKeyText: {
    color: 'white',
  },
  enterKey: {
    backgroundColor: '#4caf50',
  },
  enterKeyText: {
    color: 'white',
  },
});

export default MultiplayerGameScreen;