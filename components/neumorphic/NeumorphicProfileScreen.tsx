import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { NeumorphicButton } from './NeumorphicButton';
import { NeumorphicCard } from './NeumorphicCard';
import { NeumorphicInput } from './NeumorphicInput';
import { useNeumorphicColors, spacing, typography, borderRadius } from '../../styles/neumorphicTheme';
import { PlayerProfile, Achievement, GameResult } from '../../types/Player';

interface NeumorphicProfileScreenProps {
  player: PlayerProfile;
  onPlayerUpdated: (player: PlayerProfile) => void;
  onClose: () => void;
  onOpenFriends?: () => void;
  onOpenShop?: () => void;
  onLogout?: () => void;
  onProfileReset?: () => void;
}

type TabType = 'overview' | 'stats' | 'achievements';

export const NeumorphicProfileScreen: React.FC<NeumorphicProfileScreenProps> = ({
  player,
  onPlayerUpdated,
  onClose,
  onOpenFriends,
  onOpenShop,
  onLogout,
  onProfileReset,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  const neumorphicColors = useNeumorphicColors();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: neumorphicColors.background.main,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      paddingTop: spacing.xl,
    },
    headerTitle: {
      ...typography.h2,
      color: neumorphicColors.text.primary,
      fontWeight: 'bold',
    },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    tabButton: {
      flex: 1,
    },
    tab: {
      alignItems: 'center',
    },
    tabText: {
      ...typography.body,
      color: neumorphicColors.text.secondary,
    },
    tabTextActive: {
      color: neumorphicColors.primary.main,
      fontWeight: '600',
    },
    tabContent: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    headerCard: {
      marginBottom: spacing.lg,
    },
    profileHeader: {
      flexDirection: 'row',
      marginBottom: spacing.lg,
    },
    avatarContainer: {
      position: 'relative',
      marginRight: spacing.md,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: neumorphicColors.primary.light,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      ...typography.h1,
      color: neumorphicColors.primary.main,
      fontWeight: 'bold',
    },
    levelBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: neumorphicColors.success.main,
      justifyContent: 'center',
      alignItems: 'center',
    },
    levelBadgeText: {
      ...typography.caption,
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    profileInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    username: {
      ...typography.h2,
      color: neumorphicColors.text.primary,
      fontWeight: 'bold',
      marginBottom: spacing.xs,
    },
    joinDate: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
      marginBottom: spacing.sm,
    },
    streakContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    streakValue: {
      ...typography.body,
      color: '#FFD700',
      fontWeight: 'bold',
      marginRight: spacing.xs,
    },
    streakIcon: {
      fontSize: 16,
      marginRight: spacing.xs,
    },
    streakLabel: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
    },
    progressSection: {
      marginTop: spacing.md,
    },
    progressLabel: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
      marginBottom: spacing.xs,
    },
    progressBar: {
      height: 8,
      backgroundColor: neumorphicColors.background.dark,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: spacing.xs,
    },
    progressFill: {
      height: '100%',
      backgroundColor: neumorphicColors.primary.main,
      borderRadius: 4,
    },
    progressText: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
      textAlign: 'right',
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
      gap: spacing.sm,
    },
    statCard: {
      flex: 1,
      alignItems: 'center',
    },
    statIcon: {
      fontSize: 32,
      marginBottom: spacing.sm,
    },
    statValue: {
      ...typography.h3,
      color: neumorphicColors.text.primary,
      fontWeight: 'bold',
      marginBottom: spacing.xs,
    },
    statLabel: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
    },
    quickActions: {
      marginBottom: spacing.lg,
      gap: spacing.md,
    },
    actionCardWrapper: {
      marginBottom: spacing.sm,
    },
    actionCard: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionIcon: {
      fontSize: 32,
      marginRight: spacing.md,
    },
    actionContent: {
      flex: 1,
    },
    actionTitle: {
      ...typography.h3,
      color: neumorphicColors.text.primary,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    actionSubtitle: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
    },
    actionArrow: {
      ...typography.h3,
      color: neumorphicColors.text.secondary,
    },
    achievementsCard: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.h3,
      color: neumorphicColors.text.primary,
      fontWeight: '600',
      marginBottom: spacing.md,
    },
    achievementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: neumorphicColors.background.dark,
    },
    achievementIcon: {
      fontSize: 24,
      marginRight: spacing.md,
    },
    achievementInfo: {
      flex: 1,
    },
    achievementName: {
      ...typography.body,
      color: neumorphicColors.text.primary,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    achievementDesc: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
    },
    emptyText: {
      ...typography.body,
      color: neumorphicColors.text.disabled,
      textAlign: 'center',
      paddingVertical: spacing.lg,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: neumorphicColors.background.dark,
    },
    statRowLabel: {
      ...typography.body,
      color: neumorphicColors.text.secondary,
    },
    statRowValue: {
      ...typography.body,
      color: neumorphicColors.text.primary,
      fontWeight: '600',
      },
    achievementProgress: {
      ...typography.body,
      color: neumorphicColors.text.secondary,
      marginBottom: spacing.lg,
    },
    achievementCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    achievementUnlocked: {
      borderWidth: 2,
      borderColor: neumorphicColors.success.main,
    },
    achievementCardIcon: {
      fontSize: 32,
      marginRight: spacing.md,
    },
    lockedIcon: {
      opacity: 0.4,
    },
    achievementCardInfo: {
      flex: 1,
    },
    achievementCardName: {
      ...typography.body,
      color: neumorphicColors.text.primary,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    lockedText: {
      color: neumorphicColors.text.disabled,
    },
    achievementCardDesc: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
      marginBottom: spacing.xs,
    },
    achievementReward: {
      ...typography.caption,
      color: neumorphicColors.success.main,
      fontWeight: '600',
    },
    footer: {
      flexDirection: 'row',
      padding: spacing.lg,
      gap: spacing.md,
    },
    footerButton: {
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modal: {
      width: '100%',
      maxWidth: 400,
    },
    modalTitle: {
      ...typography.h2,
      color: neumorphicColors.text.primary,
      fontWeight: 'bold',
      marginBottom: spacing.xs,
    },
    modalSubtitle: {
      ...typography.body,
      color: neumorphicColors.text.secondary,
      marginBottom: spacing.lg,
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.md,
    },
    modalButton: {
      flex: 1,
    },
  });

  // Helper functions
  const getCurrentLevel = () => {
    return Math.floor(player.experience / 100) + 1;
  };

  const getExperienceForNextLevel = () => {
    return getCurrentLevel() * 100;
  };

  const getProgressToNextLevel = () => {
    const currentLevelXP = (getCurrentLevel() - 1) * 100;
    const nextLevelXP = getCurrentLevel() * 100;
    const progress = (player.experience - currentLevelXP) / (nextLevelXP - currentLevelXP);
    return Math.min(Math.max(progress, 0), 1);
  };

  const getOverallAccuracy = () => {
    return player.totalQuestions > 0
      ? Math.round((player.totalCorrectAnswers / player.totalQuestions) * 100)
      : 0;
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const handleUsernameChange = () => {
    if (!newUsername.trim()) {
      Alert.alert('Error', 'Please enter a new username');
      return;
    }

    if (newUsername.trim().length < 2 || newUsername.trim().length > 20) {
      Alert.alert('Error', 'Username must be 2-20 characters long');
      return;
    }

    if (player.coins < 100) {
      Alert.alert('Insufficient Coins', `You need 100 coins. You have ${player.coins} coins.`);
      return;
    }

    Alert.alert(
      'Change Username?',
      `Change username to "${newUsername.trim()}" for 100 coins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: () => {
            // Update player profile
            const updatedPlayer = {
              ...player,
              username: newUsername.trim(),
              coins: player.coins - 100,
            };
            onPlayerUpdated(updatedPlayer);
            setShowUsernameModal(false);
            setNewUsername('');
            Alert.alert('Success!', 'Username changed successfully!');
          },
        },
      ]
    );
  };

  // Render tab content
  const renderOverview = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <NeumorphicCard variant="floating" padding={spacing.lg} style={styles.headerCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{player.username.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{getCurrentLevel()}</Text>
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.username}>{player.username}</Text>
            <Text style={styles.joinDate}>Joined {formatDate(player.createdAt)}</Text>
            <View style={styles.streakContainer}>
              <Text style={styles.streakValue}>{player.currentStreak}</Text>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
          </View>
        </View>

        {/* Level Progress */}
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>Level {getCurrentLevel()} Progress</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getProgressToNextLevel() * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {player.experience} / {getExperienceForNextLevel()} XP
          </Text>
        </View>
      </NeumorphicCard>

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <NeumorphicCard variant="raised" padding={spacing.md} style={styles.statCard}>
          <Text style={styles.statIcon}>💰</Text>
          <Text style={styles.statValue}>{player.coins}</Text>
          <Text style={styles.statLabel}>Coins</Text>
        </NeumorphicCard>

        <NeumorphicCard variant="raised" padding={spacing.md} style={styles.statCard}>
          <Text style={styles.statIcon}>🎮</Text>
          <Text style={styles.statValue}>{player.gamesPlayed}</Text>
          <Text style={styles.statLabel}>Games</Text>
        </NeumorphicCard>

        <NeumorphicCard variant="raised" padding={spacing.md} style={styles.statCard}>
          <Text style={styles.statIcon}>🎯</Text>
          <Text style={styles.statValue}>{getOverallAccuracy()}%</Text>
          <Text style={styles.statLabel}>Accuracy</Text>
        </NeumorphicCard>
      </View>

      {/* Quick Actions */}
      {(onOpenFriends || onOpenShop) && (
        <View style={styles.quickActions}>
          {onOpenFriends && (
            <TouchableOpacity
              onPress={onOpenFriends}
              style={styles.actionCardWrapper}
            >
              <NeumorphicCard variant="raised" padding={spacing.md} style={styles.actionCard}>
                <Text style={styles.actionIcon}>👥</Text>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Friends</Text>
                  <Text style={styles.actionSubtitle}>
                    {player.friends?.length || 0} friends
                  </Text>
                </View>
                <Text style={styles.actionArrow}>→</Text>
              </NeumorphicCard>
            </TouchableOpacity>
          )}

          {onOpenShop && (
            <TouchableOpacity
              onPress={onOpenShop}
              style={styles.actionCardWrapper}
            >
              <NeumorphicCard variant="raised" padding={spacing.md} style={styles.actionCard}>
                <Text style={styles.actionIcon}>🛍️</Text>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Shop</Text>
                  <Text style={styles.actionSubtitle}>Buy items</Text>
                </View>
                <Text style={styles.actionArrow}>→</Text>
              </NeumorphicCard>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Recent Achievements */}
      <NeumorphicCard variant="raised" padding={spacing.lg} style={styles.achievementsCard}>
        <Text style={styles.sectionTitle}>🏆 Recent Achievements</Text>
        {player.achievements
          .filter((a) => a.isUnlocked)
          .slice(0, 3)
          .map((achievement) => (
            <View key={achievement.id} style={styles.achievementRow}>
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementName}>{achievement.name}</Text>
                <Text style={styles.achievementDesc}>{achievement.description}</Text>
              </View>
            </View>
          ))}
        {player.achievements.filter((a) => a.isUnlocked).length === 0 && (
          <Text style={styles.emptyText}>Play games to unlock achievements!</Text>
        )}
      </NeumorphicCard>
    </ScrollView>
  );

  const renderStats = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <NeumorphicCard variant="raised" padding={spacing.lg}>
        <Text style={styles.sectionTitle}>📊 Detailed Statistics</Text>

        <View style={styles.statRow}>
          <Text style={styles.statRowLabel}>Total Games Played</Text>
          <Text style={styles.statRowValue}>{player.gamesPlayed}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statRowLabel}>Correct Answers</Text>
          <Text style={styles.statRowValue}>{player.totalCorrectAnswers}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statRowLabel}>Total Questions</Text>
          <Text style={styles.statRowValue}>{player.totalQuestions}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statRowLabel}>Overall Accuracy</Text>
          <Text style={styles.statRowValue}>{getOverallAccuracy()}%</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statRowLabel}>Best Score</Text>
          <Text style={styles.statRowValue}>{player.bestScore}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statRowLabel}>Best Accuracy</Text>
          <Text style={styles.statRowValue}>{player.bestAccuracy}%</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statRowLabel}>Fastest Answer</Text>
          <Text style={styles.statRowValue}>
            {player.fastestAnswerTime > 0 ? `${player.fastestAnswerTime.toFixed(1)}s` : 'N/A'}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statRowLabel}>Total Coins Earned</Text>
          <Text style={styles.statRowValue}>{player.totalCoinsEarned}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statRowLabel}>Current Streak</Text>
          <Text style={styles.statRowValue}>{player.currentStreak} days 🔥</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statRowLabel}>Longest Streak</Text>
          <Text style={styles.statRowValue}>{player.longestStreak} days</Text>
        </View>
      </NeumorphicCard>
    </ScrollView>
  );

  const renderAchievements = () => {
    const unlockedCount = player.achievements.filter((a) => a.isUnlocked).length;
    const totalCount = player.achievements.length;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <NeumorphicCard variant="raised" padding={spacing.lg}>
          <Text style={styles.sectionTitle}>🏆 All Achievements</Text>
          <Text style={styles.achievementProgress}>
            {unlockedCount} / {totalCount} Unlocked
          </Text>

          {player.achievements
            .sort((a, b) => {
              if (a.isUnlocked && !b.isUnlocked) return -1;
              if (!a.isUnlocked && b.isUnlocked) return 1;
              return 0;
            })
            .map((achievement) => (
              <NeumorphicCard
                key={achievement.id}
                variant={achievement.isUnlocked ? 'floating' : 'inset'}
                padding={spacing.md}
                style={[
                  styles.achievementCard,
                  achievement.isUnlocked && styles.achievementUnlocked,
                ]}
              >
                <Text style={[styles.achievementCardIcon, !achievement.isUnlocked && styles.lockedIcon]}>
                  {achievement.isUnlocked ? achievement.icon : '🔒'}
                </Text>
                <View style={styles.achievementCardInfo}>
                  <Text
                    style={[
                      styles.achievementCardName,
                      !achievement.isUnlocked && styles.lockedText,
                    ]}
                  >
                    {achievement.name}
                  </Text>
                  <Text style={styles.achievementCardDesc}>{achievement.description}</Text>
                  {achievement.reward && achievement.reward.coins > 0 && (
                    <Text style={styles.achievementReward}>+{achievement.reward.coins} coins</Text>
                  )}
                </View>
              </NeumorphicCard>
            ))}
        </NeumorphicCard>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <NeumorphicButton icon="✕" title="" size="small" variant="error" onPress={onClose} />
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setActiveTab('overview')}
          style={styles.tabButton}
        >
          <NeumorphicCard
            variant={activeTab === 'overview' ? 'inset' : 'raised'}
            padding={spacing.sm}
            style={styles.tab}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </NeumorphicCard>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('stats')}
          style={styles.tabButton}
        >
          <NeumorphicCard
            variant={activeTab === 'stats' ? 'inset' : 'raised'}
            padding={spacing.sm}
            style={styles.tab}
          >
            <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
              Stats
            </Text>
          </NeumorphicCard>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('achievements')}
          style={styles.tabButton}
        >
          <NeumorphicCard
            variant={activeTab === 'achievements' ? 'inset' : 'raised'}
            padding={spacing.sm}
            style={styles.tab}
          >
            <Text style={[styles.tabText, activeTab === 'achievements' && styles.tabTextActive]}>
              Achievements
            </Text>
          </NeumorphicCard>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'stats' && renderStats()}
      {activeTab === 'achievements' && renderAchievements()}

      {/* Settings Actions */}
      <View style={styles.footer}>
        <NeumorphicButton
          title="Change Username"
          icon="✏️"
          onPress={() => setShowUsernameModal(true)}
          variant="primary"
          size="small"
          style={styles.footerButton}
        />

        {onLogout && (
          <NeumorphicButton
            title="Logout"
            icon="🚪"
            onPress={onLogout}
            variant="error"
            size="small"
            style={styles.footerButton}
          />
        )}
      </View>

      {/* Username Change Modal */}
      <Modal visible={showUsernameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <NeumorphicCard variant="floating" padding={spacing.xl} style={styles.modal}>
            <Text style={styles.modalTitle}>Change Username</Text>
            <Text style={styles.modalSubtitle}>Cost: 100 coins</Text>

            <NeumorphicInput
              label="New Username"
              icon="✏️"
              placeholder="Enter new username"
              value={newUsername}
              onChangeText={setNewUsername}
              maxLength={20}
            />

            <View style={styles.modalActions}>
              <NeumorphicButton
                title="Cancel"
                onPress={() => {
                  setShowUsernameModal(false);
                  setNewUsername('');
                }}
                variant="error"
                size="medium"
                style={styles.modalButton}
              />
              <NeumorphicButton
                title="Change"
                onPress={handleUsernameChange}
                variant="success"
                size="medium"
                style={styles.modalButton}
              />
            </View>
          </NeumorphicCard>
        </View>
      </Modal>
    </View>
  );
};

 
