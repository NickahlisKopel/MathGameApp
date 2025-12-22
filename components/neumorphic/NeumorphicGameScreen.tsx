import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { NeumorphicButton } from './NeumorphicButton';
import { NeumorphicCard } from './NeumorphicCard';
import { useNeumorphicColors, spacing, typography, borderRadius } from '../../styles/neumorphicTheme';

interface NeumorphicGameScreenProps {
  // Game state
  currentEquation: { question: string; answer: number };
  currentAnswer: string;
  score: number;
  timeLeft?: number;
  isCorrect: boolean | null;

  // Game settings
  gameMode: 'classic' | 'times_tables';
  difficulty?: string;

  // Times tables specific
  currentTable?: number;
  currentMultiplier?: number;

  // Callbacks
  onNumberPress: (num: string) => void;
  onDeletePress: () => void;
  onSubmitPress: () => void;
  onQuitPress: () => void;
  onNotepadPress: () => void;

  // Feedback
  showTextFeedback?: boolean;
  textFeedbackMessage?: string;
  textFeedbackCorrect?: boolean;
  reduceMotion?: boolean;
}

export const NeumorphicGameScreen: React.FC<NeumorphicGameScreenProps> = ({
  currentEquation,
  currentAnswer,
  score,
  timeLeft,
  isCorrect,
  gameMode,
  difficulty,
  currentTable,
  currentMultiplier,
  onNumberPress,
  onDeletePress,
  onSubmitPress,
  onQuitPress,
  onNotepadPress,
  showTextFeedback,
  textFeedbackMessage,
  textFeedbackCorrect,
  reduceMotion,
}) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const neumorphicColors = useNeumorphicColors();
  const [answerBgColor, setAnswerBgColor] = useState(neumorphicColors.background.main);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: neumorphicColors.background.main,
    },
    content: {
      flex: 1,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    quitButton: {
      width: 48,
      minWidth: 48,
    },
    notepadButton: {
      width: 48,
      minWidth: 48,
    },
    scoreCard: {
      flex: 1,
      marginHorizontal: spacing.md,
      alignItems: 'center',
    },
    scoreLabel: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
      marginBottom: spacing.xs,
    },
    scoreValue: {
      ...typography.h2,
      color: neumorphicColors.text.primary,
      fontWeight: 'bold',
    },
    progressText: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
      marginTop: spacing.xs,
    },
    timerCard: {
      alignSelf: 'center',
      marginBottom: spacing.md,
      minWidth: 100,
    },
    timerText: {
      ...typography.h3,
      color: neumorphicColors.text.primary,
      textAlign: 'center',
    },
    equationCard: {
      alignSelf: 'center',
      marginBottom: spacing.xl,
      minWidth: 200,
    },
    equation: {
      ...typography.h1,
      color: neumorphicColors.text.primary,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    answerSection: {
      marginBottom: spacing.xl,
    },
    answerCard: {
      minHeight: 70,
      justifyContent: 'center',
      alignItems: 'center',
    },
    answerText: {
      ...typography.h2,
      color: neumorphicColors.text.primary,
      fontWeight: '600',
    },
    placeholderText: {
      color: neumorphicColors.text.disabled,
      fontWeight: '400',
    },
    feedbackContainer: {
      marginTop: spacing.md,
      alignItems: 'center',
    },
    feedbackText: {
      ...typography.body,
      fontWeight: '600',
    },
    correctFeedback: {
      color: neumorphicColors.success.main,
    },
    incorrectFeedback: {
      color: neumorphicColors.error.main,
    },
    keypadContainer: {
      marginBottom: spacing.md,
    },
    keypadGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    keypadButton: {
      width: '30%',
      marginBottom: spacing.sm,
    },
    resultFeedbackContainer: {
      position: 'absolute',
      bottom: spacing.xxl,
      left: spacing.lg,
      right: spacing.lg,
      alignItems: 'center',
    },
    resultFeedback: {
      ...typography.h3,
      fontWeight: 'bold',
      textAlign: 'center',
    },
  });

  // Fade animation for equation change
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentEquation.question]);

  // Answer input feedback color
  useEffect(() => {
    if (isCorrect === true) {
      setAnswerBgColor(neumorphicColors.success.light);
      setTimeout(() => setAnswerBgColor(neumorphicColors.background.main), 500);
    } else if (isCorrect === false) {
      setAnswerBgColor(neumorphicColors.error.light);
      setTimeout(() => setAnswerBgColor(neumorphicColors.background.main), 500);
    }
  }, [isCorrect]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const renderKeypad = () => {
    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];

    return (
      <View style={styles.keypadGrid}>
        {numbers.map((num) => {
          const isDelete = num === '⌫';
          const isSubmit = num === '✓';
          const variant = isSubmit ? 'success' : isDelete ? 'error' : 'primary';

          return (
            <NeumorphicButton
              key={num}
              title={num}
              onPress={() => {
                if (isDelete) {
                  onDeletePress();
                } else if (isSubmit) {
                  onSubmitPress();
                } else {
                  onNumberPress(num);
                }
              }}
              variant={variant}
              size="large"
              style={styles.keypadButton}
            />
          );
        })}
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.content}>
            {/* Header Section */}
            <View style={styles.header}>
              <NeumorphicButton
                icon="✕"
                title=""
                size="small"
                variant="error"
                onPress={onQuitPress}
                style={styles.quitButton}
              />

              <NeumorphicCard variant="floating" padding={spacing.md} style={styles.scoreCard}>
                <Text style={styles.scoreLabel}>Score</Text>
                <Text style={styles.scoreValue}>{score}</Text>
                {gameMode === 'times_tables' && currentTable && currentMultiplier && (
                  <Text style={styles.progressText}>
                    {currentTable}× Table: {currentMultiplier}/15
                  </Text>
                )}
              </NeumorphicCard>

              <NeumorphicButton
                icon="📝"
                title=""
                size="small"
                variant="primary"
                onPress={onNotepadPress}
                style={styles.notepadButton}
              />
            </View>

            {/* Timer (Classic Mode Only) */}
            {gameMode === 'classic' && timeLeft !== undefined && (
              <NeumorphicCard variant="floating" padding={spacing.sm} style={styles.timerCard}>
                <Text style={styles.timerText}>⏱️ {timeLeft}s</Text>
              </NeumorphicCard>
            )}

            {/* Equation Display */}
            <Animated.View style={{ opacity: fadeAnim }}>
              <NeumorphicCard variant="floating" padding={spacing.xl} style={styles.equationCard}>
                <Text style={styles.equation}>{currentEquation.question}</Text>
              </NeumorphicCard>
            </Animated.View>

            {/* Answer Input */}
            <View style={styles.answerSection}>
              <NeumorphicCard
                variant="inset"
                padding={spacing.lg}
                style={[styles.answerCard, { backgroundColor: answerBgColor }]}
              >
                <Text
                  style={[
                    styles.answerText,
                    !currentAnswer && styles.placeholderText,
                  ]}
                >
                  {currentAnswer || 'Enter your answer'}
                </Text>
              </NeumorphicCard>

              {/* Text Feedback */}
              {showTextFeedback && textFeedbackMessage && (
                <View style={styles.feedbackContainer}>
                  <Text
                    style={[
                      styles.feedbackText,
                      textFeedbackCorrect ? styles.correctFeedback : styles.incorrectFeedback,
                    ]}
                  >
                    {textFeedbackMessage}
                  </Text>
                </View>
              )}
            </View>

            {/* Keypad */}
            <NeumorphicCard variant="raised" padding={spacing.md} style={styles.keypadContainer}>
              {renderKeypad()}
            </NeumorphicCard>

            {/* Animated Result Feedback */}
            {!reduceMotion && isCorrect !== null && (
              <View style={styles.resultFeedbackContainer}>
                <Text
                  style={[
                    styles.resultFeedback,
                    isCorrect ? styles.correctFeedback : styles.incorrectFeedback,
                  ]}
                >
                  {isCorrect ? '🎉 Correct!' : `❌ Wrong! Answer: ${currentEquation.answer}`}
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};


