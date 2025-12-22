import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NeumorphicButton } from './NeumorphicButton';
import { NeumorphicCard } from './NeumorphicCard';
import { useNeumorphicColors, spacing, typography } from '../../styles/neumorphicTheme';

interface NeumorphicResultsScreenProps {
  score: number;
  accuracy: number;
  avgTimePerEquation: number;
  equationCount: number;
  gameTime: number;
  timeLeft: number;
  difficulty: string;
  gameMode: 'classic' | 'times_tables';
  completedTables?: number[];
  currentTable?: number;
  currentMultiplier?: number;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  onShare?: () => void;
}

export const NeumorphicResultsScreen: React.FC<NeumorphicResultsScreenProps> = ({
  score,
  accuracy,
  avgTimePerEquation,
  equationCount,
  gameTime,
  timeLeft,
  difficulty,
  gameMode,
  completedTables,
  currentTable,
  currentMultiplier,
  onPlayAgain,
  onMainMenu,
  onShare,
}) => {
  const neumorphicColors = useNeumorphicColors();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: neumorphicColors.background.main,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    header: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    emoji: {
      fontSize: 80,
      marginBottom: spacing.md,
    },
    title: {
      ...typography.h1,
      color: neumorphicColors.text.primary,
      fontWeight: 'bold',
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.h3,
      color: neumorphicColors.text.secondary,
      textAlign: 'center',
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xl,
    },
    statCard: {
      flex: 1,
      marginHorizontal: spacing.xs,
      alignItems: 'center',
    },
    statValue: {
      ...typography.h1,
      color: neumorphicColors.primary.main,
      fontWeight: 'bold',
      marginBottom: spacing.xs,
    },
    statLabel: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
      textAlign: 'center',
    },
    summaryCard: {
      marginBottom: spacing.xl,
    },
    summaryTitle: {
      ...typography.h3,
      color: neumorphicColors.text.primary,
      fontWeight: '600',
      marginBottom: spacing.md,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: neumorphicColors.background.dark,
    },
    summaryLabel: {
      ...typography.body,
      color: neumorphicColors.text.secondary,
    },
    summaryValue: {
      ...typography.body,
      color: neumorphicColors.text.primary,
      fontWeight: '600',
    },
    achievementCard: {
      alignItems: 'center',
      marginBottom: spacing.xl,
      borderWidth: 2,
      borderColor: neumorphicColors.success.main,
    },
    achievementIcon: {
      fontSize: 48,
      marginBottom: spacing.md,
    },
    achievementText: {
      ...typography.h3,
      color: neumorphicColors.success.main,
      fontWeight: 'bold',
      marginBottom: spacing.xs,
    },
    achievementSubtext: {
      ...typography.body,
      color: neumorphicColors.text.secondary,
    },
    actionsContainer: {
      gap: spacing.md,
    },
    actionButton: {
      marginBottom: spacing.sm,
    },
  });

  const getPerformanceEmoji = () => {
    if (accuracy >= 90) return '🏆';
    if (accuracy >= 75) return '🌟';
    if (accuracy >= 60) return '👍';
    return '💪';
  };

  const getPerformanceMessage = () => {
    if (accuracy >= 90) return 'Outstanding!';
    if (accuracy >= 75) return 'Great Job!';
    if (accuracy >= 60) return 'Good Work!';
    return 'Keep Practicing!';
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.emoji}>{getPerformanceEmoji()}</Text>
          <Text style={styles.title}>{gameMode === 'times_tables' ? 'Times Tables Complete!' : 'Game Complete!'}</Text>
          <Text style={styles.subtitle}>{getPerformanceMessage()}</Text>
        </View>

        <View style={styles.statsGrid}>
          <NeumorphicCard variant="floating" padding={spacing.lg} style={styles.statCard}>
            <Text style={styles.statValue}>{score}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </NeumorphicCard>

          <NeumorphicCard variant="floating" padding={spacing.lg} style={styles.statCard}>
            <Text style={styles.statValue}>{accuracy}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </NeumorphicCard>

          <NeumorphicCard variant="floating" padding={spacing.lg} style={styles.statCard}>
            <Text style={styles.statValue}>{avgTimePerEquation}s</Text>
            <Text style={styles.statLabel}>Avg Time</Text>
          </NeumorphicCard>
        </View>

        <NeumorphicCard variant="raised" padding={spacing.lg} style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{gameMode === 'times_tables' ? 'Times Tables Summary' : 'Game Summary'}</Text>

          {gameMode === 'times_tables' ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tables Completed:</Text>
                <Text style={styles.summaryValue}>{completedTables?.length || 0}/15</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Current Table:</Text>
                <Text style={styles.summaryValue}>{currentTable}×</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Progress:</Text>
                <Text style={styles.summaryValue}>{currentMultiplier}/15</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Equations:</Text>
                <Text style={styles.summaryValue}>{equationCount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Difficulty:</Text>
                <Text style={styles.summaryValue}>{difficulty.toUpperCase()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Time Played:</Text>
                <Text style={styles.summaryValue}>{gameTime - timeLeft}s</Text>
              </View>
            </>
          )}
        </NeumorphicCard>

        {accuracy >= 90 && (
          <NeumorphicCard variant="floating" padding={spacing.lg} style={styles.achievementCard}>
            <Text style={styles.achievementIcon}>🎯</Text>
            <Text style={styles.achievementText}>Perfect Performance!</Text>
            <Text style={styles.achievementSubtext}>You're a math master!</Text>
          </NeumorphicCard>
        )}

        <View style={styles.actionsContainer}>
          <NeumorphicButton title="Play Again" icon="🔄" onPress={onPlayAgain} variant="success" size="large" fullWidth style={styles.actionButton} />

          {onShare && (
            <NeumorphicButton title="Share Results" icon="📤" onPress={onShare} variant="secondary" size="medium" fullWidth style={styles.actionButton} />
          )}

          <NeumorphicButton title="Main Menu" icon="🏠" onPress={onMainMenu} variant="primary" size="medium" fullWidth style={styles.actionButton} />
        </View>
      </ScrollView>
    </View>
  );
};

export default NeumorphicResultsScreen;
