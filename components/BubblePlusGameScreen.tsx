import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { IslandButton } from './IslandButton';
import { IslandCard } from './IslandCard';
import { useTheme } from '../contexts/ThemeContext';
import { BackgroundWrapper } from './BackgroundWrapper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BubblePlusGameScreenProps {
  difficulty: 'easy' | 'medium' | 'hard';
  onBack: () => void;
  onGameComplete: (score: number, totalQuestions: number, accuracy: number) => void;
  backgroundColors: string[];
  backgroundType: string;
  animationType?: string;
}

interface Bubble {
  id: string;
  value: number;
  x: number;
  y: number;
  animatedValue: Animated.Value;
  animatedX: Animated.Value;
  animatedY: Animated.Value;
  size: number;
  color: string;
  isCorrect: boolean;
}

interface Equation {
  question: string;
  answer: number;
  num1: number;
  num2: number;
  operation: string;
}

const BUBBLE_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#95E1D3', // Mint
  '#F38181', // Pink
  '#AA96DA', // Purple
  '#FCBAD3', // Light Pink
  '#A8E6CF', // Light Green
];

export const BubblePlusGameScreen: React.FC<BubblePlusGameScreenProps> = ({
  difficulty,
  onBack,
  onGameComplete,
  backgroundColors,
  backgroundType,
  animationType,
}) => {
  let insets;
  try {
    insets = useSafeAreaInsets();
  } catch (e) {
    // Fallback for when SafeAreaProvider is not available
    insets = { top: 0, bottom: 20, left: 0, right: 0 };
  }
  const { theme } = useTheme();
  const [score, setScore] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [currentEquation, setCurrentEquation] = useState<Equation | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGameActive, setIsGameActive] = useState(true);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [feedbackAnimation] = useState(new Animated.Value(0));
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  const [showIncorrectFeedback, setShowIncorrectFeedback] = useState(false);
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const totalQuestionsRef = useRef(0);
  const scoreRef = useRef(score);
  const totalCorrectRef = useRef(totalCorrect);
  const setScoreRef = useRef(setScore);
  const setTotalCorrectRef = useRef(setTotalCorrect);
  const escapedBubblesRef = useRef<Set<string>>(new Set());
  const isProcessingAnswerRef = useRef(false);
  const isGameActiveRef = useRef(true);
  const isMountedRef = useRef(true);
  const escapeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    scoreRef.current = score;
    setScoreRef.current = setScore;
  }, [score, setScore]);

  useEffect(() => {
    totalCorrectRef.current = totalCorrect;
    setTotalCorrectRef.current = setTotalCorrect;
  }, [totalCorrect, setTotalCorrect]);

  // Get difficulty settings
  const getDifficultySettings = () => {
    switch (difficulty) {
      case 'easy':
        return { min: 1, max: 10, bubbleCount: 4, timeLimit: 60 };
      case 'medium':
        return { min: 1, max: 20, bubbleCount: 5, timeLimit: 60 };
      case 'hard':
        return { min: 1, max: 50, bubbleCount: 6, timeLimit: 60 };
      default:
        return { min: 1, max: 10, bubbleCount: 4, timeLimit: 60 };
    }
  };

  // Generate random equation
  const generateEquation = (): Equation => {
    const settings = getDifficultySettings();
    const operations = ['+', '-', '×'];
    const operation = operations[Math.floor(Math.random() * operations.length)];

    let num1 = Math.floor(Math.random() * (settings.max - settings.min + 1)) + settings.min;
    let num2 = Math.floor(Math.random() * (settings.max - settings.min + 1)) + settings.min;
    let answer = 0;

    switch (operation) {
      case '+':
        answer = num1 + num2;
        break;
      case '-':
        // Ensure no negative answers for all difficulties
        if (num1 < num2) {
          [num1, num2] = [num2, num1];
        }
        answer = num1 - num2;
        break;
      case '×':
        answer = num1 * num2;
        break;
    }

    return {
      question: `${num1} ${operation} ${num2}`,
      answer,
      num1,
      num2,
      operation,
    };
  };

  // Generate wrong answers
  const generateWrongAnswers = (correctAnswer: number, count: number): number[] => {
    const wrongAnswers: Set<number> = new Set();
    const range = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 30;

    while (wrongAnswers.size < count) {
      // Generate offset but ensure final answer is always >= 0
      let wrongAnswer: number;
      if (correctAnswer < range / 2) {
        // If correct answer is small, bias towards positive offsets
        const offset = Math.floor(Math.random() * range);
        wrongAnswer = Math.max(0, correctAnswer - range / 4 + offset);
      } else {
        const offset = Math.floor(Math.random() * range) - range / 2;
        wrongAnswer = Math.max(0, correctAnswer + offset);
      }

      if (wrongAnswer !== correctAnswer && wrongAnswer >= 0) {
        wrongAnswers.add(wrongAnswer);
      }
    }

    return Array.from(wrongAnswers);
  };

  // Create bubbles with answers
  const createBubbles = (equation: Equation) => {
    const settings = getDifficultySettings();
    const answers = [equation.answer, ...generateWrongAnswers(equation.answer, settings.bubbleCount - 1)];

    // Shuffle answers
    for (let i = answers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }

    const newBubbles: Bubble[] = answers.map((value, index) => {
      const bubbleSize = 80 + Math.random() * 30;
      const padding = 40;

      // Start bubbles at the bottom with staggered positions
      const xPos = padding + Math.random() * (SCREEN_WIDTH - bubbleSize - padding * 2);
      // Stagger starting positions so they don't overlap
      const startY = SCREEN_HEIGHT + 50 + (index * 120); // Each bubble starts 120px below the previous one

      return {
        id: `bubble_${Date.now()}_${index}_${Math.random()}`,
        value,
        x: xPos,
        y: startY,
        animatedValue: new Animated.Value(0),
        animatedX: new Animated.Value(xPos),
        animatedY: new Animated.Value(startY),
        size: bubbleSize,
        color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
        isCorrect: value === equation.answer,
      };
    });

    console.log('Creating bubbles:', {
      count: newBubbles.length,
      correctAnswer: equation.answer,
      bubbles: newBubbles.map(b => ({
        value: b.value,
        isCorrect: b.isCorrect,
        x: b.x,
        y: b.y,
      })),
    });

    setBubbles(newBubbles);
    animateBubbles(newBubbles);
  };

  // Animate bubbles floating up
  const animateBubbles = (bubblesToAnimate: Bubble[]) => {
    bubblesToAnimate.forEach((bubble) => {
      // Initial pop-in animation
      Animated.spring(bubble.animatedValue, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Float upward continuously from bottom to top
      const floatDuration = 8000 + Math.random() * 2000; // 8-10 seconds to cross screen
      Animated.timing(bubble.animatedY, {
        toValue: -200, // Float off the top of screen
        duration: floatDuration,
        useNativeDriver: true,
      }).start(({ finished }) => {
        // If animation finished (bubble went off-screen) and game is still active
        if (finished && isGameActiveRef.current && !isProcessingAnswerRef.current) {
          handleBubbleEscape(bubble);
        }
      });

      // Gentle horizontal drift
      Animated.loop(
        Animated.sequence([
          Animated.timing(bubble.animatedX, {
            toValue: bubble.x + 20,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(bubble.animatedX, {
            toValue: bubble.x - 20,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  };

  // Handle bubble escaping off-screen
  const handleBubbleEscape = (bubble: Bubble) => {
    if (!isGameActiveRef.current || isProcessingAnswerRef.current || !isMountedRef.current) return;

    // Prevent handling the same bubble escape multiple times
    if (escapedBubblesRef.current.has(bubble.id)) return;
    escapedBubblesRef.current.add(bubble.id);

    isProcessingAnswerRef.current = true;
    setIsProcessingAnswer(true);

    // If the correct bubble escaped, count as incorrect
    if (bubble.isCorrect && isMountedRef.current) {
      setShowIncorrectFeedback(true);
      const newScore = Math.max(0, scoreRef.current - 5);
      scoreRef.current = newScore;
      setScore(newScore);
    }

    // Clear any existing timeout
    if (escapeTimeoutRef.current) {
      clearTimeout(escapeTimeoutRef.current);
    }

    // Move to next question after a short delay
    escapeTimeoutRef.current = setTimeout(() => {
      if (!isGameActiveRef.current || !isMountedRef.current) return;
      setShowIncorrectFeedback(false);
      nextQuestion();
    }, 1000);
  };

  // Handle bubble pop
  const handleBubblePop = (bubble: Bubble) => {
    if (!isGameActiveRef.current || isProcessingAnswerRef.current) return;

    isProcessingAnswerRef.current = true;
    setIsProcessingAnswer(true);

    if (bubble.isCorrect) {
      // Correct answer!
      setShowCorrectFeedback(true);
      const newScore = scoreRef.current + 10;
      scoreRef.current = newScore;
      setScore(newScore);

      const newTotalCorrect = totalCorrectRef.current + 1;
      totalCorrectRef.current = newTotalCorrect;
      setTotalCorrect(newTotalCorrect);

      // Pop animation
      Animated.sequence([
        Animated.spring(bubble.animatedValue, {
          toValue: 1.3,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.timing(bubble.animatedValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowCorrectFeedback(false);
        nextQuestion();
      });
    } else {
      // Wrong answer - continue playing, don't move to next question
      setShowIncorrectFeedback(true);
      const newScore = Math.max(0, scoreRef.current - 5);
      scoreRef.current = newScore;
      setScore(newScore);

      // Shake animation
      Animated.sequence([
        Animated.timing(bubble.animatedX, {
          toValue: bubble.x - 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(bubble.animatedX, {
          toValue: bubble.x + 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(bubble.animatedX, {
          toValue: bubble.x - 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(bubble.animatedX, {
          toValue: bubble.x,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowIncorrectFeedback(false);
        // Allow trying again - reset processing flag
        isProcessingAnswerRef.current = false;
        setIsProcessingAnswer(false);
      });
    }
  };

  // Next question
  const nextQuestion = () => {
    isProcessingAnswerRef.current = false;
    setIsProcessingAnswer(false);
    // Clear the escaped bubbles set for the new question
    escapedBubblesRef.current.clear();
    totalQuestionsRef.current += 1;
    setQuestionNumber(prev => prev + 1);
    const newEquation = generateEquation();
    setCurrentEquation(newEquation);
    createBubbles(newEquation);
  };

  // End game
  const endGame = useCallback(() => {
    isGameActiveRef.current = false;
    isMountedRef.current = false;
    setIsGameActive(false);

    // Clear all timers and intervals
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (escapeTimeoutRef.current) {
      clearTimeout(escapeTimeoutRef.current);
    }

    const totalQuestions = totalQuestionsRef.current;
    const accuracy = totalQuestions > 0 ? (totalCorrectRef.current / totalQuestions) * 100 : 0;
    const finalScore = scoreRef.current;

    setTimeout(() => {
      onGameComplete(finalScore, totalQuestions, accuracy);
    }, 500);
  }, [onGameComplete]);

  // Initialize game
  useEffect(() => {
    const equation = generateEquation();
    setCurrentEquation(equation);
    createBubbles(equation);

    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (escapeTimeoutRef.current) {
        clearTimeout(escapeTimeoutRef.current);
      }
    };
  }, []);

  const handleQuit = () => {
    Alert.alert(
      'Quit Game',
      'Are you sure you want to quit? Your progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: () => {
            isGameActiveRef.current = false;
            isMountedRef.current = false;
            setIsGameActive(false);
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            if (escapeTimeoutRef.current) {
              clearTimeout(escapeTimeoutRef.current);
            }
            onBack();
          },
        },
      ]
    );
  };

  return (
    <BackgroundWrapper
      colors={backgroundColors}
      type={backgroundType}
      animationType={animationType}
      style={styles.container}
      onCorrectAnswer={showCorrectFeedback}
      onIncorrectAnswer={showIncorrectFeedback}
      feedbackReset={() => {
        setShowCorrectFeedback(false);
        setShowIncorrectFeedback(false);
      }}
    >
      <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <IslandButton
            icon="✕"
            size="small"
            variant="danger"
            onPress={handleQuit}
          />

          <IslandCard variant="floating" padding={12} style={styles.timerCard}>
            <Text style={[styles.timerText, { color: timeLeft <= 10 ? '#FF4757' : theme.colors.text }]}>
              ⏱️ {timeLeft}s
            </Text>
          </IslandCard>

          <IslandCard variant="floating" padding={12} style={styles.scoreCard}>
            <Text style={[styles.scoreText, { color: theme.colors.text }]}>
              🏆 {score}
            </Text>
          </IslandCard>
        </View>

        {/* Equation Display */}
        <View style={styles.equationContainer}>
          <IslandCard variant="floating" padding={20}>
            <Text style={styles.equationLabel}>Bubble Pop PLUS ⚡</Text>
            <Text style={[styles.equation, { color: theme.colors.text }]}>
              {currentEquation?.question} = ?
            </Text>
            <Text style={[styles.questionCounter, { color: theme.colors.textSecondary }]}>
              Question #{questionNumber}
            </Text>
          </IslandCard>
        </View>

        {/* Instruction */}
        <IslandCard variant="subtle" padding={10} style={styles.instructionCard}>
          <Text style={[styles.instruction, { color: theme.colors.textSecondary }]}>
            🫧 Fast mode! Pop before they escape!
          </Text>
        </IslandCard>

        {/* Bubbles */}
        <View style={styles.bubbleContainer}>
          {bubbles.map((bubble) => (
            <Animated.View
              key={bubble.id}
              style={[
                styles.bubbleWrapper,
                {
                  transform: [
                    { translateX: bubble.animatedX },
                    { translateY: bubble.animatedY },
                    { scale: bubble.animatedValue },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleBubblePop(bubble)}
                disabled={!isGameActive}
              >
                <LinearGradient
                  colors={[bubble.color, `${bubble.color}CC`]}
                  style={[
                    styles.bubble,
                    {
                      width: bubble.size,
                      height: bubble.size,
                      borderRadius: bubble.size / 2,
                    },
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.bubbleShine} />
                  <Text style={styles.bubbleText}>{bubble.value}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Feedback Overlay */}
        {showCorrectFeedback && (
          <View style={styles.feedbackOverlay}>
            <Text style={styles.correctFeedback}>✨ Correct! ✨</Text>
          </View>
        )}
        {showIncorrectFeedback && (
          <View style={styles.feedbackOverlay}>
            <Text style={styles.incorrectFeedback}>❌ Try Again!</Text>
          </View>
        )}
      </SafeAreaView>
    </BackgroundWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  timerCard: {
    minWidth: 80,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreCard: {
    minWidth: 80,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  equationContainer: {
    paddingHorizontal: 30,
    marginTop: 10,
    alignItems: 'center',
  },
  equationLabel: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 5,
  },
  equation: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  questionCounter: {
    fontSize: 12,
    textAlign: 'center',
  },
  instructionCard: {
    marginHorizontal: 40,
    marginTop: 15,
    alignItems: 'center',
  },
  instruction: {
    fontSize: 14,
    textAlign: 'center',
  },
  bubbleContainer: {
    flex: 1,
    position: 'relative',
  },
  bubbleWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  bubble: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  bubbleShine: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  bubbleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  feedbackOverlay: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctFeedback: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  incorrectFeedback: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF4757',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
});

export default BubblePlusGameScreen;
