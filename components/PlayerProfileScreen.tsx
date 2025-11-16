import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  Switch,
  Modal,
  TextInput,
  Button,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlayerProfile, Achievement, GameResult } from '../types/Player';
import { PlayerStorageService } from '../services/PlayerStorageService';
import { useTheme } from '../contexts/ThemeContext';
import { StorageResetService } from '../services/StorageResetService';
import * as ImagePicker from 'expo-image-picker';
import { IslandButton } from './IslandButton';
import { IslandCard } from './IslandCard';
import { IslandMenu } from './IslandMenu';

interface Props {
  player: PlayerProfile;
  onPlayerUpdated: (player: PlayerProfile) => void;
  onClose: () => void;
  onProfileReset?: () => void;
  onLogout?: (resetProfile?: boolean) => void;
  visible: boolean;
  backgroundColors: string[];
  backgroundType: 'solid' | 'gradient' | 'custom' | 'animated';
  animationType?: 'space' | 'particle' | 'wave' | 'forest';
  initialTab?: TabType;
  onOpenFriends?: () => void;
}

const { width, height } = Dimensions.get('window');

type TabType = 'overview' | 'stats' | 'achievements' | 'settings' | 'history';

// Helper component to render background conditionally
const BackgroundWrapper: React.FC<{ 
  colors: string[], 
  type: 'solid' | 'gradient' | 'custom' | 'animated', 
  style: any, 
  children: React.ReactNode 
}> = ({ colors, type, style, children }) => {
  if (type === 'solid') {
    return (
      <View style={[style, { backgroundColor: colors[0] }]}>
        {children}
      </View>
    );
  } else {
    return (
      <LinearGradient colors={colors as [string, string, ...string[]]} style={style}>
        {children}
      </LinearGradient>
    );
  }
};

export default function PlayerProfileScreen({ player, onPlayerUpdated, onClose, onProfileReset, onLogout, visible, backgroundColors, backgroundType, initialTab = 'overview', onOpenFriends }: Props) {
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [gameHistory, setGameHistory] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState('');

  useEffect(() => {
    if (visible) {
      loadGameHistory();
      // Reset to initialTab when modal is opened
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  const loadGameHistory = async () => {
    try {
      const history = await PlayerStorageService.getGameHistory(10);
      setGameHistory(history);
    } catch (error) {
      console.error('Error loading game history:', error);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      setLoading(true);
      await PlayerStorageService.updatePlayerSettings({ [key]: value });
      const updatedPlayer = await PlayerStorageService.loadPlayerProfile();
      if (updatedPlayer) {
        onPlayerUpdated(updatedPlayer);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update setting');
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameChange = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Error', 'Please enter a new username');
      return;
    }

    if (newUsername.trim() === player.username) {
      Alert.alert('Error', 'New username must be different from current username');
      return;
    }

    if (newUsername.trim().length < 2) {
      Alert.alert('Error', 'Username must be at least 2 characters long');
      return;
    }

    if (newUsername.trim().length > 20) {
      Alert.alert('Error', 'Username must be 20 characters or less');
      return;
    }

    if (player.coins < 100) {
      Alert.alert('Insufficient Coins', 'You need 100 coins to change your username. You currently have ' + player.coins + ' coins.');
      return;
    }

    Alert.alert(
      'Change Username?',
      `Change username to "${newUsername.trim()}" for 100 coins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Load current player and update username/coins manually
              const currentPlayer = await PlayerStorageService.loadPlayerProfile();
              if (!currentPlayer) throw new Error('Player profile not found');
              
              // Update the username and deduct coins
              currentPlayer.username = newUsername.trim();
              currentPlayer.coins = currentPlayer.coins - 100;
              currentPlayer.lastActive = new Date();
              
              // Save the updated profile
              await PlayerStorageService.savePlayerProfile(currentPlayer);
              
              // Note: Profile updated locally only (no Firebase sync)
              
              const updatedPlayer = await PlayerStorageService.loadPlayerProfile();
              if (updatedPlayer) {
                onPlayerUpdated(updatedPlayer);
                setShowUsernameModal(false);
                setNewUsername('');
                Alert.alert('Success!', 'Username changed successfully!');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to change username. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAvatarChange = async () => {
    if (!newAvatarUrl.trim()) {
      Alert.alert('Error', 'Please enter a valid avatar URL or select an image.');
      return;
    }
    try {
      setLoading(true);
      const currentPlayer = await PlayerStorageService.loadPlayerProfile();
      if (!currentPlayer) throw new Error('Player profile not found');
      currentPlayer.customization.avatar = newAvatarUrl.trim();
      currentPlayer.lastActive = new Date();
      await PlayerStorageService.savePlayerProfile(currentPlayer);
      
      // Note: Profile updated locally only (no Firebase sync)
      
      const updatedPlayer = await PlayerStorageService.loadPlayerProfile();
      if (updatedPlayer) {
        onPlayerUpdated(updatedPlayer);
        setShowAvatarModal(false);
        setNewAvatarUrl('');
        Alert.alert('Success!', 'Avatar updated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update avatar. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickAndUploadAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setLoading(true);
        // For now, just use the local URI (no cloud storage)
        const uid = player.id || (player as any).uid || 'unknown';
        const downloadUrl = imageUri; // Use local image URI directly
        setNewAvatarUrl(downloadUrl);
        // Optionally auto-save after upload
        await handleAvatarChangeWithUrl(downloadUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick or upload image.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChangeWithUrl = async (avatarUrl: string) => {
    try {
      setLoading(true);
      const currentPlayer = await PlayerStorageService.loadPlayerProfile();
      if (!currentPlayer) throw new Error('Player profile not found');
      currentPlayer.customization.avatar = avatarUrl;
      currentPlayer.lastActive = new Date();
      await PlayerStorageService.savePlayerProfile(currentPlayer);
      // Note: Profile updated locally only (no Firebase sync)
      const updatedPlayer = await PlayerStorageService.loadPlayerProfile();
      if (updatedPlayer) {
        onPlayerUpdated(updatedPlayer);
        setShowAvatarModal(false);
        setNewAvatarUrl('');
        Alert.alert('Success!', 'Avatar updated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update avatar. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetPlayerData = () => {
    Alert.alert(
      'Reset Player Profile',
      'Are you sure you want to reset all your progress? This will:\n\n• Delete all game history\n• Reset achievements\n• Clear shop purchases\n• Return you to username setup\n\nThis action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await PlayerStorageService.resetPlayerProfile();
              
              // Close the profile modal first
              onClose();
              
              // Then trigger the app state reset
              if (onProfileReset) {
                // Small delay to ensure modal closes first
                setTimeout(() => {
                  onProfileReset();
                }, 100);
              }
            } catch (error) {
              setLoading(false);
              Alert.alert('Error', 'Failed to reset player profile. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Level formula: level = floor(sqrt(experience / 100)) + 1
  const getCurrentLevel = () => {
    return Math.floor(Math.sqrt(player.experience / 100)) + 1;
  };

  const getExperienceForNextLevel = () => {
    const nextLevel = getCurrentLevel() + 1;
    return Math.pow(nextLevel - 1, 2) * 100;
  };

  const getExperienceForCurrentLevel = () => {
    const currentLevel = getCurrentLevel();
    return Math.pow(currentLevel - 1, 2) * 100;
  };

  const getProgressToNextLevel = () => {
    const currentLevelExp = getExperienceForCurrentLevel();
    const nextLevelExp = getExperienceForNextLevel();
    const progressExp = player.experience - currentLevelExp;
    const neededExp = nextLevelExp - currentLevelExp;
    return Math.min(progressExp / neededExp, 1);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTabButton = (tab: TabType, icon: string, label: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabIcon, activeTab === tab && styles.activeTabIcon]}>
        {icon}
      </Text>
      <Text style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderOverview = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Player Info Card */}
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <View style={styles.playerHeader}>
          <View style={styles.avatarContainer}>
            {player.customization.avatar ? (
              <Image source={{ uri: player.customization.avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {player.username.charAt(0).toUpperCase()}
              </Text>
            )}
            <TouchableOpacity style={styles.editAvatarButton} onPress={() => setShowAvatarModal(true)}>
              <Text style={styles.editAvatarText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.playerInfo}>
            <Text style={[styles.username, { color: theme.colors.text }]}>{player.username}</Text>
            <Text style={[styles.playerDetail, { color: theme.colors.textTertiary }]}>Level {getCurrentLevel()}</Text>
            <Text style={[styles.playerDetail, { color: theme.colors.textTertiary }]}>Joined {formatDate(player.createdAt)}</Text>
            {/* Streak Display (left-aligned, stacked) */}
            <View style={{ marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: 'bold', marginRight: 4 }}>{player.currentStreak}</Text>
                <Text style={{ fontSize: 14 }}>🔥</Text>
              </View>
              <Text style={{ color: theme.colors.textTertiary, fontSize: 14, marginTop: 0 }}>Longest: {player.longestStreak}</Text>
            </View>
          </View>
        </View>
        
        {/* Level Progress */}
        <View style={styles.progressContainer}>
          <Text style={[styles.progressLabel, { color: theme.colors.text }]}> 
            Progress to Level {getCurrentLevel() + 1}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${getProgressToNextLevel() * 100}%` }]} 
            />
          </View>
          <Text style={[styles.progressText, { color: theme.colors.textTertiary }]}> 
            {player.experience} / {getExperienceForNextLevel()} XP
          </Text>
        </View>
      </View>

      {/* Currency and Stats */}
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>💰 Currency & Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{player.coins}</Text>
            <Text style={[[styles.statLabel, { color: theme.colors.textTertiary }], { color: theme.colors.textTertiary }]}>Coins</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{player.gamesPlayed}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Games</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{player.bestScore}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Best Score</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {player.totalQuestions > 0 
                ? Math.round((player.totalCorrectAnswers / player.totalQuestions) * 100)
                : 0}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Accuracy</Text>
          </View>
        </View>
      </View>

      {/* Friends Button */}
      {onOpenFriends && (
        <TouchableOpacity 
          style={[styles.card, styles.friendsCard, { backgroundColor: theme.colors.card }]} 
          onPress={onOpenFriends}
        >
          <Text style={styles.friendsCardIcon}>👥</Text>
          <View style={styles.friendsCardContent}>
            <Text style={[styles.friendsCardTitle, { color: theme.colors.text }]}>Friends</Text>
            <Text style={[styles.friendsCardSubtitle, { color: theme.colors.textTertiary }]}>
              {player.friends?.length || 0} friends • {player.friendRequests?.filter(r => r.status === 'pending').length || 0} requests
            </Text>
          </View>
          <Text style={styles.friendsCardArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Recent Achievements */}
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>🏆 Recent Achievements</Text>
        {player.achievements
          .filter(a => a.isUnlocked)
          .slice(0, 3)
          .map((achievement, index) => (
            <View key={achievement.id} style={styles.achievementItem}>
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              <View style={styles.achievementText}>
                <Text style={[styles.achievementName, { color: theme.colors.text }]}>{achievement.name}</Text>
                <Text style={[styles.achievementDescription, { color: theme.colors.textTertiary }]}>
                  {achievement.description}
                </Text>
              </View>
            </View>
          ))}
        {player.achievements.filter(a => a.isUnlocked).length === 0 && (
          <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
            Complete games to unlock achievements!
          </Text>
        )}
      </View>
    </ScrollView>
  );

  const renderStats = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>📊 Detailed Statistics</Text>
        
        <View style={styles.statRow}>
          <Text style={[styles.statRowLabel, { color: theme.colors.textSecondary }]}>Total Games Played</Text>
          <Text style={styles.statRowValue}>{player.gamesPlayed}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={[styles.statRowLabel, { color: theme.colors.textSecondary }]}>Correct Answers</Text>
          <Text style={styles.statRowValue}>{player.totalCorrectAnswers}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={[styles.statRowLabel, { color: theme.colors.textSecondary }]}>Total Questions</Text>
          <Text style={styles.statRowValue}>{player.totalQuestions}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={[styles.statRowLabel, { color: theme.colors.textSecondary }]}>Overall Accuracy</Text>
          <Text style={styles.statRowValue}>
            {player.totalQuestions > 0 
              ? Math.round((player.totalCorrectAnswers / player.totalQuestions) * 100)
              : 0}%
          </Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={[styles.statRowLabel, { color: theme.colors.textSecondary }]}>Best Single Game Score</Text>
          <Text style={styles.statRowValue}>{player.bestScore}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={[styles.statRowLabel, { color: theme.colors.textSecondary }]}>Best Accuracy</Text>
          <Text style={styles.statRowValue}>{player.bestAccuracy}%</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={[styles.statRowLabel, { color: theme.colors.textSecondary }]}>Fastest Answer Time</Text>
          <Text style={styles.statRowValue}>
            {player.fastestAnswerTime > 0 ? `${player.fastestAnswerTime.toFixed(1)}s` : 'N/A'}
          </Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={[styles.statRowLabel, { color: theme.colors.textSecondary }]}>Total Coins Earned</Text>
          <Text style={styles.statRowValue}>{player.totalCoinsEarned}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={[styles.statRowLabel, { color: theme.colors.textSecondary }]}>Experience Points</Text>
          <Text style={styles.statRowValue}>{player.experience} XP</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderAchievements = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>🏆 Achievements</Text>
        <Text style={[styles.achievementProgress, { color: theme.colors.textTertiary }]}>
          {player.achievements.filter(a => a.isUnlocked).length} / {player.achievements.length} Unlocked
        </Text>
        
        {player.achievements
          .sort((a, b) => {
            // Unlocked achievements first, then locked ones
            if (a.isUnlocked && !b.isUnlocked) return -1;
            if (!a.isUnlocked && b.isUnlocked) return 1;
            return 0; // Keep original order within unlocked/locked groups
          })
          .map((achievement) => (
          <View 
            key={achievement.id} 
            style={[
              styles.achievementCard,
              { borderColor: theme.colors.border },
              achievement.isUnlocked && [
                styles.achievementUnlocked,
                { 
                  borderColor: '#4CAF50',
                  backgroundColor: isDarkMode ? 'rgba(76, 175, 80, 0.1)' : '#f8fff8'
                }
              ]
            ]}
          >
            <View style={styles.achievementHeader}>
              <Text style={[
                styles.achievementIcon,
                !achievement.isUnlocked && styles.achievementIconLocked
              ]}>
                {achievement.isUnlocked ? achievement.icon : '🔒'}
              </Text>
              <View style={styles.achievementDetails}>
                <Text style={[
                  styles.achievementName,
                  { color: achievement.isUnlocked ? '#ffffff' : theme.colors.textTertiary },
                  !achievement.isUnlocked && styles.achievementNameLocked
                ]}>
                  {achievement.name}
                </Text>
                <Text style={[
                  styles.achievementDescription,
                  { color: achievement.isUnlocked ? theme.colors.textTertiary : theme.colors.textTertiary },
                  !achievement.isUnlocked && styles.achievementDescriptionLocked
                ]}>
                  {achievement.description}
                </Text>
                {achievement.isUnlocked && achievement.unlockedAt && (
                  <Text style={[styles.achievementDate, { color: '#4CAF50' }]}>
                    Unlocked {formatDate(achievement.unlockedAt)}
                  </Text>
                )}
              </View>
            </View>
            
            {!achievement.isUnlocked && (
              <View style={styles.achievementProgressContainer}>
                <View style={styles.achievementProgressBar}>
                  <View style={[
                    styles.achievementProgressFill,
                    { width: `${Math.min((achievement.progress / achievement.requirement) * 100, 100)}%` }
                  ]} />
                </View>
                <Text style={[styles.achievementProgressText, { color: theme.colors.textTertiary }]}>
                  {achievement.progress} / {achievement.requirement}
                </Text>
              </View>
            )}
            
            <View style={[styles.achievementReward, { backgroundColor: isDarkMode ? '#000000' : '#f0f0f0' }]}>
              <Text style={[styles.rewardText, { color: theme.colors.textTertiary }]}>
                Reward: {achievement.reward.coins} 🪙 {achievement.reward.experience} XP
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderSettings = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>⚙️ Game Settings</Text>
        
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.colors.textSecondary }]}>Dark Mode</Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            disabled={loading}
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.colors.textSecondary }]}>Reduce Motion</Text>
          <Switch
            value={player.settings.reduceMotion}
            onValueChange={(value) => updateSetting('reduceMotion', value)}
            disabled={loading}
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.colors.textSecondary }]}>Sound Effects</Text>
          <Switch
            value={player.settings.soundEnabled}
            onValueChange={(value) => updateSetting('soundEnabled', value)}
            disabled={loading}
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.colors.textSecondary }]}>Background Music</Text>
          <Switch
            value={player.settings.musicEnabled}
            onValueChange={(value) => updateSetting('musicEnabled', value)}
            disabled={loading}
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.colors.textSecondary }]}>Vibration</Text>
          <Switch
            value={player.settings.vibrationEnabled}
            onValueChange={(value) => updateSetting('vibrationEnabled', value)}
            disabled={loading}
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.colors.textSecondary }]}>Show Hints</Text>
          <Switch
            value={player.settings.showHints}
            onValueChange={(value) => updateSetting('showHints', value)}
            disabled={loading}
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.colors.textSecondary }]}>Auto Submit Answers</Text>
          <Switch
            value={player.settings.autoSubmit}
            onValueChange={(value) => updateSetting('autoSubmit', value)}
            disabled={loading}
          />
        </View>
        
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: theme.colors.textSecondary }]}>Keyboard Layout</Text>
          <TouchableOpacity
            style={styles.keyboardLayoutButton}
            onPress={() => updateSetting('keyboardLayout', 
              player.settings.keyboardLayout === 'calculator' ? 'phone' : 'calculator'
            )}
            disabled={loading}
          >
            <Text style={styles.keyboardLayoutText}>
              {player.settings.keyboardLayout === 'calculator' ? '📱 Calculator' : '☎️ Phone'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>🔧 Advanced</Text>
        
        {/* Clear All Email Accounts */}
        <TouchableOpacity
          style={[styles.dangerButton, { marginBottom: 15 }]}
          onPress={() => {
            Alert.alert(
              '⚠️ Clear All Email Accounts',
              'This will delete ALL email accounts from this device. This action cannot be undone!\n\nYou will need to create new accounts to sign in with email again.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear All Accounts',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { authService } = await import('../services/AuthService');
                      await authService.clearAllEmailAccounts();
                      Alert.alert('✅ Success', 'All email accounts have been cleared from this device.');
                    } catch (error) {
                      Alert.alert('Error', 'Failed to clear accounts');
                    }
                  }
                }
              ]
            );
          }}
        >
          <Text style={styles.dangerButtonText}>🗑️ Clear All Email Accounts</Text>
        </TouchableOpacity>
        
        <View style={styles.settingRow}>
          <View style={styles.usernameChangeInfo}>
            <Text style={[styles.settingLabel, { color: theme.colors.textSecondary }]}>Change Username</Text>
            <Text style={[styles.usernameChangeSubtext, { color: theme.colors.textTertiary }]}>Current: {player.username}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.usernameChangeButton,
              player.coins < 100 && styles.usernameChangeButtonDisabled
            ]}
            onPress={() => setShowUsernameModal(true)}
            disabled={loading || player.coins < 100}
          >
            <Text style={[
              styles.usernameChangeButtonText,
              player.coins < 100 && styles.usernameChangeButtonTextDisabled
            ]}>
              100 🪙
            </Text>
          </TouchableOpacity>
        </View>

        {/* Go Online Button */}
        <TouchableOpacity
          style={[styles.onlineButton, { marginVertical: 15 }]}
          onPress={async () => {
            try {
              const { authService } = await import('../services/AuthService');
              const { socketMultiplayerService } = await import('../services/socketMultiplayerService');
              
              const user = authService.getCurrentUser();
              if (!user) {
                Alert.alert('Error', 'No user logged in');
                return;
              }
              
              if (user.isOffline) {
                Alert.alert('Offline Mode', 'You are in offline mode. Please sign in with an account to access online features.');
                return;
              }
              
              if (socketMultiplayerService.getIsConnected()) {
                Alert.alert('Already Online', 'You are already connected to the server!');
                return;
              }
              
              Alert.alert('Connecting...', 'Connecting to multiplayer server...');
              const connected = await socketMultiplayerService.connect('https://mathgameapp.onrender.com', user, player.id);
              
              if (connected) {
                Alert.alert('✅ Online', 'Successfully connected! You can now see online friends and receive challenges.');
                
                // Trigger friends status check if on friends screen
                if (onOpenFriends) {
                  // This will refresh the friends screen
                }
              } else {
                Alert.alert('Connection Failed', 'Could not connect to server. Please try again.');
              }
            } catch (error) {
              console.error('Go online error:', error);
              Alert.alert('Error', 'Failed to connect to server');
            }
          }}
          disabled={loading}
        >
          <Text style={styles.onlineButtonText}>🌐 Go Online</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.dangerButton, loading && styles.dangerButtonDisabled]} 
          onPress={resetPlayerData}
          disabled={loading}
        >
          <Text style={styles.dangerButtonText}>
            {loading ? 'Resetting...' : 'Reset Profile & Start Over'}
          </Text>
        </TouchableOpacity>

        {/* Clear Local Storage (Admin/Debug) */}
        <TouchableOpacity
          style={[styles.warningButton, loading && styles.dangerButtonDisabled]}
          onPress={() => {
            Alert.alert(
              'Clear Local Storage',
              'This will remove ALL local app data and return you to the sign-up screen. The server data will NOT be affected. This is useful for testing or syncing with a database reset.\n\nContinue?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear Storage',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const success = await StorageResetService.clearAllData();
                      if (success) {
                        Alert.alert(
                          'Storage Cleared',
                          'All local data has been removed. The app will now restart to the sign-up screen.',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                onClose();
                                onLogout && onLogout(true);
                              }
                            }
                          ]
                        );
                      } else {
                        Alert.alert('Error', 'Failed to clear local storage.');
                      }
                    } catch (error) {
                      console.error('Clear storage error:', error);
                      Alert.alert('Error', 'Failed to clear local storage.');
                    }
                  }
                }
              ]
            );
          }}
          disabled={loading}
        >
          <Text style={styles.warningButtonText}>🔄 Clear Local Storage</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity
          style={[styles.dangerButton, loading && styles.dangerButtonDisabled]}
          onPress={() => {
            Alert.alert(
              'Delete Account',
              'This will permanently delete your account from this device and remove all local game data. This cannot be undone. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { authService } = await import('../services/AuthService');
                      // Delete auth account (email/offline) and clear session
                      await authService.deleteCurrentAccount();
                      // Clear local player data and shop cache
                      const { PlayerStorageService } = await import('../services/PlayerStorageService');
                      await PlayerStorageService.resetPlayerProfile();
                      // Close and signal logout with reset
                      onClose();
                      onLogout && onLogout(true);
                      Alert.alert('Account Deleted', 'Your account and local data have been removed.');
                    } catch (error) {
                      console.error('Delete account error:', error);
                      Alert.alert('Error', 'Failed to delete account.');
                    }
                  }
                }
              ]
            );
          }}
          disabled={loading}
        >
          <Text style={styles.dangerButtonText}>🗑️ Delete My Account</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity 
          style={[styles.logoutButton]}
          onPress={() => {
            Alert.alert(
              'Sign Out',
              'Do you want to sign out of your account? Online features will be disabled until you sign in again.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  onPress: () => {
                    onClose();
                    onLogout && onLogout(false);
                  }
                },
                {
                  text: 'Sign Out & Reset Profile',
                  style: 'destructive',
                  onPress: async () => {
                    onClose();
                    if (onLogout) onLogout(true);
                  }
                }
              ]
            );
          }}
          disabled={loading}
        >
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderHistory = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>📈 Recent Games</Text>
        
        {gameHistory.length > 0 ? (
          gameHistory.map((game, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyScore}>
                  {game.score}/{game.totalQuestions}
                </Text>
                <Text style={[styles.historyDate, { color: theme.colors.textTertiary }]}>
                  {formatDate(game.playedAt)}
                </Text>
              </View>
              <View style={styles.historyDetails}>
                <Text style={[styles.historyDetail, { color: theme.colors.textTertiary }]}>
                  Accuracy: {game.accuracy}%
                </Text>
                <Text style={[styles.historyDetail, { color: theme.colors.textTertiary }]}>
                  Avg Time: {game.averageTime.toFixed(1)}s
                </Text>
                <Text style={[styles.historyDetail, { color: theme.colors.textTertiary }]}>
                  Difficulty: {game.difficulty}
                </Text>
                <Text style={[styles.historyDetail, { color: theme.colors.textTertiary }]}>
                  Earned: {game.coinsEarned} 🪙
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
            No games played yet. Start playing to see your history!
          </Text>
        )}
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'stats':
        return renderStats();
      case 'achievements':
        return renderAchievements();
      case 'settings':
        return renderSettings();
      case 'history':
        return renderHistory();
      default:
        return renderOverview();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <BackgroundWrapper colors={backgroundColors} type={backgroundType} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {/* Header - Island Style */}
          <View style={styles.header}>
            <IslandButton
              icon="✕"
              size="small"
              variant="danger"
              onPress={onClose}
            />
            <IslandCard variant="elevated" padding={12} style={styles.headerTitleCard}>
              <Text style={styles.headerTitle}>👤 Profile</Text>
            </IslandCard>
            <View style={styles.placeholder} />
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabScrollContainer}
            >
              {renderTabButton('overview', '👤', 'Overview')}
              {renderTabButton('stats', '📊', 'Stats')}
              {renderTabButton('achievements', '🏆', 'Medals')}
              {renderTabButton('settings', '⚙️', 'Settings')}
              {renderTabButton('history', '📈', 'History')}
            </ScrollView>
          </View>

          {/* Content */}
          {renderContent()}
        </SafeAreaView>
      </BackgroundWrapper>

      {/* Username Change Modal */}
      <Modal visible={showUsernameModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.usernameModal, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.usernameModalTitle, { color: theme.colors.text }]}>Change Username</Text>
            <Text style={[styles.usernameModalSubtitle, { color: theme.colors.textTertiary }]}>
              Current: {player.username}
            </Text>
            <Text style={[styles.usernameModalCost, { color: theme.colors.accent }]}>
              Cost: 100 🪙 (You have {player.coins} 🪙)
            </Text>
            
            <TextInput
              style={[styles.usernameInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }]}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter new username"
              placeholderTextColor={theme.colors.placeholderText}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <View style={styles.usernameModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowUsernameModal(false);
                  setNewUsername('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.textTertiary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (!newUsername.trim() || newUsername.trim() === player.username || player.coins < 100) && styles.confirmButtonDisabled
                ]}
                onPress={handleUsernameChange}
                disabled={!newUsername.trim() || newUsername.trim() === player.username || player.coins < 100 || loading}
              >
                <Text style={[
                  styles.confirmButtonText,
                  (!newUsername.trim() || newUsername.trim() === player.username || player.coins < 100) && styles.confirmButtonTextDisabled
                ]}>
                  {loading ? 'Changing...' : 'Change'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Avatar Modal */}
      <Modal visible={showAvatarModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Avatar</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter image URL or select an image"
              value={newAvatarUrl}
              onChangeText={setNewAvatarUrl}
            />
            <Button title="Save Avatar" onPress={handleAvatarChange} disabled={loading} />
            <Button title="Pick Image" onPress={handlePickAndUploadAvatar} disabled={loading} />
            <Button title="Cancel" onPress={() => setShowAvatarModal(false)} />
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#333',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#555'
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabScrollContainer: {
    paddingHorizontal: 10,
  },
  tabButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 5,
    borderRadius: 10,
    minWidth: 70,
  },
  activeTabButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  activeTabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  activeTabLabel: {
    color: 'white',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    position: 'relative',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  editAvatarText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  playerInfo: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  playerDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  achievementIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  achievementText: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statRowLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  statRowValue: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  achievementProgress: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  achievementCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  achievementUnlocked: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  achievementDetails: {
    flex: 1,
  },
  achievementIconLocked: {
    opacity: 0.5,
  },
  achievementNameLocked: {
    color: '#999',
  },
  achievementDescriptionLocked: {
    color: '#ccc',
  },
  achievementDate: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 5,
  },
  achievementProgressContainer: {
    marginBottom: 10,
  },
  achievementProgressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 5,
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  achievementProgressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  achievementReward: {
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    padding: 8,
  },
  rewardText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  keyboardLayoutButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  keyboardLayoutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  onlineButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  onlineButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningButton: {
    backgroundColor: '#ff9800',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  warningButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  dangerButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyItem: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
  },
  historyDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  historyDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    width: '48%',
  },
  // Username Change Styles
  usernameChangeInfo: {
    flex: 1,
  },
  usernameChangeSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  usernameChangeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  usernameChangeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  usernameChangeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  usernameChangeButtonTextDisabled: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  usernameModal: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  usernameModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  usernameModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  usernameModalCost: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  usernameInput: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
    fontSize: 10,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  usernameModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 10,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmButtonTextDisabled: {
    color: '#999',
  },
  // Avatar Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    fontSize: 14,
  },
  friendsCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendsCardIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  friendsCardContent: {
    flex: 1,
  },
  friendsCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  friendsCardSubtitle: {
    fontSize: 14,
  },
  friendsCardArrow: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  headerTitleCard: {
    flex: 1,
    marginHorizontal: 10,
  },
});
