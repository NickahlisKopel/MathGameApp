import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  PlayerProfile, 
  PlayerSettings, 
  PlayerCustomization, 
  GameResult, 
  Achievement,
  DEFAULT_PLAYER_SETTINGS,
  DEFAULT_PLAYER_CUSTOMIZATION 
} from '../types/Player';

const STORAGE_KEYS = {
  PLAYER_PROFILE: 'player_profile',
  GAME_HISTORY: 'game_history',
  ACHIEVEMENTS: 'achievements',
  PLAYER_STATS: 'player_stats',
  APP_VERSION: 'app_version',
  ALL_PROFILES: 'all_player_profiles', // Store all profiles for friend lookups
};

export class PlayerStorageService {
  // Returns true if the player has already checked in for their streak today
  static async hasCheckedInToday(): Promise<boolean> {
    const player = await this.loadPlayerProfile();
    if (!player) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return player.lastStreakDate === todayStr;
  }
  // Call this on app open or login to update streak
  // Returns { checkedInToday: true } if this is the first login of the day
  static async updateDailyStreak(): Promise<{ checkedInToday: boolean }> {
    const player = await this.loadPlayerProfile();
    if (!player) return { checkedInToday: false };

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const lastStreakDate = player.lastStreakDate;
    let checkedInToday = false;

    if (!lastStreakDate) {
      // First login ever
      player.currentStreak = 1;
      player.longestStreak = 1;
      player.lastStreakDate = todayStr;
      checkedInToday = true;
    } else {
      // Compare calendar dates, not time differences
      const lastDate = new Date(lastStreakDate + 'T00:00:00');
      const todayDate = new Date(todayStr + 'T00:00:00');
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Already logged in today, do nothing
        checkedInToday = false;
      } else if (diffDays === 1) {
        // Consecutive day
        player.currentStreak += 1;
        if (player.currentStreak > player.longestStreak) player.longestStreak = player.currentStreak;
        player.lastStreakDate = todayStr;
        checkedInToday = true;
      } else if (diffDays > 1) {
        // Missed a day, reset streak
        player.currentStreak = 1;
        player.lastStreakDate = todayStr;
        checkedInToday = true;
      }
    }
    await this.savePlayerProfile(player);
    return { checkedInToday };
  }
  // Create new player profile
  static async createNewPlayer(username: string, avatarUrl?: string, email?: string): Promise<PlayerProfile> {
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const newPlayer: PlayerProfile = {
      id: playerId,
      username: username.trim(),
      email: email,
      createdAt: now,
      lastActive: now,

      // Streaks
      currentStreak: 0,
      longestStreak: 0,
      
      // Currency and progression
      coins: 100, // Starting coins
      totalCoinsEarned: 100,
      experience: 0,
      level: 1,
      
      // Game statistics
      gamesPlayed: 0,
      totalCorrectAnswers: 0,
      totalQuestions: 0,
      bestScore: 0,
      bestAccuracy: 0,
      fastestAnswerTime: 0,
      
      // Settings and preferences
      settings: { ...DEFAULT_PLAYER_SETTINGS },
      
      // Customization
      customization: { ...DEFAULT_PLAYER_CUSTOMIZATION, avatar: avatarUrl || DEFAULT_PLAYER_CUSTOMIZATION.avatar },
      
      // Achievements
      achievements: await this.getDefaultAchievements(),
      unlockedAchievements: [],
    };

    await this.savePlayerProfile(newPlayer);
    
    // Initialize shop data for new player
    try {
      const { ShopService } = await import('./ShopService');
      await ShopService.initializeShopData();
    } catch (error) {
      console.error('Error initializing shop data:', error);
    }
    
    return newPlayer;
  }

  // Save player profile
  static async savePlayerProfile(player: PlayerProfile): Promise<void> {
    try {
      player.lastActive = new Date();
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYER_PROFILE, JSON.stringify(player));
      
      // Also save to all profiles for friend lookups
      await this.saveToAllProfiles(player);
    } catch (error) {
      console.error('Error saving player profile:', error);
      throw new Error('Failed to save player profile');
    }
  }

  // Save player to all profiles collection (for friend lookups)
  static async saveToAllProfiles(player: PlayerProfile): Promise<void> {
    try {
      const allProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
      let allProfiles: { [key: string]: PlayerProfile } = {};
      
      if (allProfilesData) {
        allProfiles = JSON.parse(allProfilesData);
      }
      
      // Store this player's profile by their ID
      allProfiles[player.id] = player;
      
      await AsyncStorage.setItem(STORAGE_KEYS.ALL_PROFILES, JSON.stringify(allProfiles));
    } catch (error) {
      console.error('Error saving to all profiles:', error);
    }
  }

  // Load a specific player profile by ID (for friend lookups)
  static async loadPlayerProfileById(playerId: string): Promise<PlayerProfile | null> {
    try {
      const allProfilesData = await AsyncStorage.getItem(STORAGE_KEYS.ALL_PROFILES);
      
      if (!allProfilesData) return null;
      
      const allProfiles: { [key: string]: PlayerProfile } = JSON.parse(allProfilesData);
      const player = allProfiles[playerId];
      
      if (!player) return null;
      
      // Convert date strings back to Date objects
      player.createdAt = new Date(player.createdAt);
      player.lastActive = new Date(player.lastActive);
      
      if (player.friendRequests) {
        player.friendRequests = player.friendRequests.map(req => ({
          ...req,
          timestamp: new Date(req.timestamp),
        }));
      }
      
      return player;
    } catch (error) {
      console.error('Error loading player profile by ID:', error);
      return null;
    }
  }

  // Load player profile
  static async loadPlayerProfile(): Promise<PlayerProfile | null> {
    try {
      const profileData = await AsyncStorage.getItem(STORAGE_KEYS.PLAYER_PROFILE);
      if (!profileData) return null;
      
      const player: PlayerProfile = JSON.parse(profileData);
      
      // Convert date strings back to Date objects
      player.createdAt = new Date(player.createdAt);
      player.lastActive = new Date(player.lastActive);
      
      // Ensure achievements have proper date conversion
      player.achievements = player.achievements.map(achievement => ({
        ...achievement,
        unlockedAt: achievement.unlockedAt ? new Date(achievement.unlockedAt) : undefined,
      }));

      // Update achievements with new ones (migration system)
      const originalAchievementCount = player.achievements.length;
      player.achievements = await this.updatePlayerAchievements(player.achievements);
      
      // Save if new achievements were added
      if (player.achievements.length > originalAchievementCount) {
        console.log(`Added ${player.achievements.length - originalAchievementCount} new achievements!`);
        await this.savePlayerProfile(player);
      }
      
      return player;
    } catch (error) {
      console.error('Error loading player profile:', error);
      return null;
    }
  }

  // Update player settings
  static async updatePlayerSettings(settings: Partial<PlayerSettings>): Promise<void> {
    const player = await this.loadPlayerProfile();
    if (!player) throw new Error('No player profile found');
    
    player.settings = { ...player.settings, ...settings };
    await this.savePlayerProfile(player);
  }

  // Update player customization
  static async updatePlayerCustomization(customization: Partial<PlayerCustomization>): Promise<void> {
    const player = await this.loadPlayerProfile();
    if (!player) throw new Error('No player profile found');
    
    player.customization = { ...player.customization, ...customization };
    await this.savePlayerProfile(player);
  }

  // Add coins to player
  static async addCoins(amount: number): Promise<number> {
    const player = await this.loadPlayerProfile();
    if (!player) throw new Error('No player profile found');
    
    player.coins += amount;
    player.totalCoinsEarned += amount;
    await this.savePlayerProfile(player);
    
    return player.coins;
  }

  // Spend coins
  static async spendCoins(amount: number): Promise<boolean> {
    const player = await this.loadPlayerProfile();
    if (!player) throw new Error('No player profile found');
    
    if (player.coins < amount) return false;
    
    player.coins -= amount;
    await this.savePlayerProfile(player);
    
    return true;
  }

  // Add experience and check for level up
  static async addExperience(amount: number): Promise<{ newLevel: number; leveledUp: boolean }> {
    const player = await this.loadPlayerProfile();
    if (!player) throw new Error('No player profile found');
    
    const oldLevel = player.level;
    player.experience += amount;
    
    // Calculate new level (simple formula: level = floor(sqrt(experience / 100)) + 1)
    const newLevel = Math.floor(Math.sqrt(player.experience / 100)) + 1;
    const leveledUp = newLevel > oldLevel;
    
    if (leveledUp) {
      player.level = newLevel;
      // Bonus coins for leveling up
      player.coins += newLevel * 50;
      player.totalCoinsEarned += newLevel * 50;
    }
    
    await this.savePlayerProfile(player);
    
    return { newLevel, leveledUp };
  }

  // Save game result and update stats
  static async saveGameResult(result: GameResult): Promise<void> {
    const player = await this.loadPlayerProfile();
    if (!player) throw new Error('No player profile found');
    
    // Update player stats
    player.gamesPlayed += 1;
    player.totalCorrectAnswers += result.score;
    player.totalQuestions += result.totalQuestions;
    
    // Update bests
    if (result.score > player.bestScore) {
      player.bestScore = result.score;
    }
    
    if (result.accuracy > player.bestAccuracy) {
      player.bestAccuracy = result.accuracy;
    }
    
    if (result.averageTime > 0 && (player.fastestAnswerTime === 0 || result.averageTime < player.fastestAnswerTime)) {
      player.fastestAnswerTime = result.averageTime;
    }
    
    // Add coins and experience
    player.coins += result.coinsEarned;
    player.totalCoinsEarned += result.coinsEarned;
    
    const { leveledUp } = await this.addExperience(result.experienceGained);
    
    // Check achievements
    const newlyUnlockedAchievements = await this.checkAndUnlockAchievements(player, result);
    
    // Check for background unlocks based on achievements and challenges
    try {
      const { ShopService } = await import('./ShopService');
      await ShopService.checkAchievementBackgrounds(player.unlockedAchievements);
      await ShopService.checkChallengeBackgrounds(player);
    } catch (error) {
      console.error('Error checking background unlocks:', error);
    }
    
    await this.savePlayerProfile(player);
    
    // Save game to history
    await this.saveGameToHistory(result);
  }

  // Save individual game to history
  static async saveGameToHistory(result: GameResult): Promise<void> {
    try {
      const historyData = await AsyncStorage.getItem(STORAGE_KEYS.GAME_HISTORY);
      let history: GameResult[] = historyData ? JSON.parse(historyData) : [];
      
      history.unshift(result); // Add to beginning
      
      // Keep only last 100 games
      if (history.length > 100) {
        history = history.slice(0, 100);
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.GAME_HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving game to history:', error);
    }
  }

  // Get game history
  static async getGameHistory(limit: number = 20): Promise<GameResult[]> {
    try {
      const historyData = await AsyncStorage.getItem(STORAGE_KEYS.GAME_HISTORY);
      if (!historyData) return [];
      
      const history: GameResult[] = JSON.parse(historyData);
      
      // Convert dates back to Date objects
      return history.slice(0, limit).map(game => ({
        ...game,
        playedAt: new Date(game.playedAt),
      }));
    } catch (error) {
      console.error('Error loading game history:', error);
      return [];
    }
  }

  // Check and unlock achievements
  static async checkAndUnlockAchievements(player: PlayerProfile, result: GameResult): Promise<string[]> {
    const newlyUnlocked: string[] = [];
    
    for (const achievement of player.achievements) {
      if (achievement.isUnlocked) continue;
      
      let progress = 0;
      
      switch (achievement.type) {
        case 'score':
          progress = Math.max(player.bestScore, result.score);
          break;
        case 'accuracy':
          progress = Math.max(player.bestAccuracy, result.accuracy);
          break;
        case 'speed':
          progress = player.fastestAnswerTime > 0 ? Math.min(player.fastestAnswerTime, result.averageTime) : result.averageTime;
          break;
        case 'games':
          progress = player.gamesPlayed;
          break;
        case 'streak':
          // This would need streak tracking implementation
          progress = 0;
          break;
      }
      
      achievement.progress = progress;
      
      if (progress >= achievement.requirement) {
        achievement.isUnlocked = true;
        achievement.unlockedAt = new Date();
        player.unlockedAchievements.push(achievement.id);
        newlyUnlocked.push(achievement.id);
        
        // Award achievement rewards
        player.coins += achievement.reward.coins;
        player.totalCoinsEarned += achievement.reward.coins;
        player.experience += achievement.reward.experience;
        
        // Unlock customization items
        if (achievement.reward.unlocks) {
          achievement.reward.unlocks.forEach(item => {
            if (item.startsWith('theme:')) {
              player.customization.unlockedThemes.push(item.replace('theme:', ''));
            } else if (item.startsWith('avatar:')) {
              player.customization.unlockedAvatars.push(item.replace('avatar:', ''));
            } else if (item.startsWith('badge:')) {
              player.customization.unlockedBadges.push(item.replace('badge:', ''));
            }
          });
        }
      }
    }
    
    return newlyUnlocked;
  }

  // Get default achievements
  static async getDefaultAchievements(): Promise<Achievement[]> {
    return [
      // Beginner Achievements
      {
        id: 'first_game',
        name: 'First Steps',
        description: 'Complete your first game',
        icon: '🎯',
        type: 'games',
        requirement: 1,
        reward: { coins: 50, experience: 20 },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'first_correct',
        name: 'Getting Started',
        description: 'Answer your first question correctly',
        icon: '✅',
        type: 'special',
        requirement: 1,
        reward: { coins: 25, experience: 10 },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Play 5 games',
        icon: '🐦',
        type: 'games',
        requirement: 5,
        reward: { coins: 100, experience: 50 },
        isUnlocked: false,
        progress: 0,
      },

      // Accuracy Achievements
      {
        id: 'perfect_score',
        name: 'Perfect!',
        description: 'Get 100% accuracy in a game',
        icon: '💯',
        type: 'accuracy',
        requirement: 100,
        reward: { coins: 100, experience: 50, unlocks: ['badge:perfect'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'precision_master',
        name: 'Precision Master',
        description: 'Get 100% accuracy in 5 games',
        icon: '🎯',
        type: 'special',
        requirement: 5,
        reward: { coins: 300, experience: 150, unlocks: ['background:precision_blue'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'sharpshooter',
        name: 'Sharpshooter',
        description: 'Maintain 95%+ accuracy over 10 games',
        icon: '🏹',
        type: 'accuracy',
        requirement: 95,
        reward: { coins: 250, experience: 125, unlocks: ['badge:sharpshooter'] },
        isUnlocked: false,
        progress: 0,
      },

      // Speed Achievements
      {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Answer in under 2 seconds on average',
        icon: '⚡',
        type: 'speed',
        requirement: 2,
        reward: { coins: 150, experience: 75, unlocks: ['theme:lightning'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'lightning_reflexes',
        name: 'Lightning Reflexes',
        description: 'Answer in under 1.5 seconds on average',
        icon: '⚡⚡',
        type: 'speed',
        requirement: 1.5,
        reward: { coins: 300, experience: 150, unlocks: ['background:lightning_storm'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'flash',
        name: 'The Flash',
        description: 'Answer in under 1 second on average',
        icon: '💨',
        type: 'speed',
        requirement: 1,
        reward: { coins: 500, experience: 250, unlocks: ['avatar:speedster'] },
        isUnlocked: false,
        progress: 0,
      },

      // Score Achievements
      {
        id: 'high_scorer',
        name: 'High Scorer',
        description: 'Score 20 or more in a single game',
        icon: '🏆',
        type: 'score',
        requirement: 20,
        reward: { coins: 200, experience: 100, unlocks: ['avatar:champion'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'math_machine',
        name: 'Math Machine',
        description: 'Score 30 or more in a single game',
        icon: '🤖',
        type: 'score',
        requirement: 30,
        reward: { coins: 400, experience: 200, unlocks: ['background:digital_matrix'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'unstoppable',
        name: 'Unstoppable',
        description: 'Score 40 or more in a single game',
        icon: '🔥',
        type: 'score',
        requirement: 40,
        reward: { coins: 600, experience: 300, unlocks: ['badge:unstoppable'] },
        isUnlocked: false,
        progress: 0,
      },

      // Games Played Milestones
      {
        id: 'enthusiast',
        name: 'Math Enthusiast',
        description: 'Play 25 games',
        icon: '📚',
        type: 'games',
        requirement: 25,
        reward: { coins: 300, experience: 150 },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'veteran',
        name: 'Veteran Player',
        description: 'Play 50 games',
        icon: '⭐',
        type: 'games',
        requirement: 50,
        reward: { coins: 500, experience: 250, unlocks: ['theme:gold'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'dedicated',
        name: 'Dedicated Scholar',
        description: 'Play 100 games',
        icon: '🎓',
        type: 'games',
        requirement: 100,
        reward: { coins: 800, experience: 400, unlocks: ['background:scholar_library'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'math_legend',
        name: 'Math Legend',
        description: 'Play 200 games',
        icon: '👑',
        type: 'games',
        requirement: 200,
        reward: { coins: 1500, experience: 750, unlocks: ['avatar:legend', 'badge:crown'] },
        isUnlocked: false,
        progress: 0,
      },

      // Space-Themed Achievements
      {
        id: 'space_cadet',
        name: 'Space Cadet',
        description: 'Play 10 games with the space background',
        icon: '🚀',
        type: 'special',
        requirement: 10,
        reward: { coins: 200, experience: 100, unlocks: ['badge:cadet'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'space_explorer',
        name: 'Space Explorer',
        description: 'Get 100 correct answers with the space background',
        icon: '🌌',
        type: 'special',
        requirement: 100,
        reward: { coins: 500, experience: 250, unlocks: ['background:deep_space'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'astronaut',
        name: 'Astronaut',
        description: 'Achieve 95%+ accuracy in 20 space games',
        icon: '👨‍🚀',
        type: 'special',
        requirement: 20,
        reward: { coins: 800, experience: 400, unlocks: ['avatar:astronaut'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'space_commander',
        name: 'Space Commander',
        description: 'Perfect score in 10 space background games',
        icon: '🛸',
        type: 'special',
        requirement: 10,
        reward: { coins: 1000, experience: 500, unlocks: ['background:alien_planet'] },
        isUnlocked: false,
        progress: 0,
      },

      // Streak Achievements
      {
        id: 'on_fire',
        name: 'On Fire!',
        description: 'Win 3 games in a row with 80%+ accuracy',
        icon: '🔥',
        type: 'streak',
        requirement: 3,
        reward: { coins: 200, experience: 100, unlocks: ['badge:fire'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'hot_streak',
        name: 'Hot Streak',
        description: 'Win 5 games in a row with 85%+ accuracy',
        icon: '🔥🔥',
        type: 'streak',
        requirement: 5,
        reward: { coins: 400, experience: 200, unlocks: ['background:flame_gradient'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'unstoppable_force',
        name: 'Unstoppable Force',
        description: 'Win 10 games in a row with 90%+ accuracy',
        icon: '💥',
        type: 'streak',
        requirement: 10,
        reward: { coins: 800, experience: 400, unlocks: ['avatar:champion_gold'] },
        isUnlocked: false,
        progress: 0,
      },

      // Difficulty Achievements
      {
        id: 'medium_master',
        name: 'Medium Master',
        description: 'Complete 20 medium difficulty games',
        icon: '🥈',
        type: 'special',
        requirement: 20,
        reward: { coins: 300, experience: 150, unlocks: ['badge:silver'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'hard_mode_hero',
        name: 'Hard Mode Hero',
        description: 'Complete 20 hard difficulty games',
        icon: '🥇',
        type: 'special',
        requirement: 20,
        reward: { coins: 600, experience: 300, unlocks: ['badge:gold', 'background:golden_sunset'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'nightmare_mode',
        name: 'Nightmare Mode',
        description: 'Get perfect score on hard difficulty',
        icon: '👹',
        type: 'special',
        requirement: 1,
        reward: { coins: 1000, experience: 500, unlocks: ['background:dark_storm'] },
        isUnlocked: false,
        progress: 0,
      },

      // Milestone Achievements
      {
        id: 'hundred_club',
        name: 'Hundred Club',
        description: 'Answer 100 questions correctly',
        icon: '💯',
        type: 'special',
        requirement: 100,
        reward: { coins: 250, experience: 125 },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'thousand_answers',
        name: 'Thousand Answers',
        description: 'Answer 1000 questions correctly',
        icon: '🎯',
        type: 'special',
        requirement: 1000,
        reward: { coins: 1000, experience: 500, unlocks: ['background:achievement_wall'] },
        isUnlocked: false,
        progress: 0,
      },

      // Special Fun Achievements
      {
        id: 'night_owl',
        name: 'Night Owl',
        description: 'Play a game after 10 PM',
        icon: '🦉',
        type: 'special',
        requirement: 1,
        reward: { coins: 100, experience: 50, unlocks: ['background:midnight_sky'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'early_riser',
        name: 'Early Riser',
        description: 'Play a game before 7 AM',
        icon: '🌅',
        type: 'special',
        requirement: 1,
        reward: { coins: 100, experience: 50, unlocks: ['background:sunrise'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'weekend_warrior',
        name: 'Weekend Warrior',
        description: 'Play 10 games on weekends',
        icon: '🗡️',
        type: 'special',
        requirement: 10,
        reward: { coins: 300, experience: 150, unlocks: ['badge:warrior'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'consistent_player',
        name: 'Consistent Player',
        description: 'Play for 7 days in a row',
        icon: '📅',
        type: 'special',
        requirement: 7,
        reward: { coins: 400, experience: 200, unlocks: ['background:daily_gradient'] },
        isUnlocked: false,
        progress: 0,
      },

      // Multiplayer Achievements
      {
        id: 'first_tie',
        name: 'Evenly Matched',
        description: 'Get your first tie in online multiplayer',
        icon: '🤝',
        type: 'special',
        requirement: 1,
        reward: { coins: 100, experience: 50, unlocks: ['badge:balanced'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'pvp_veteran',
        name: 'PvP Veteran',
        description: 'Complete 10 online multiplayer games',
        icon: '⚔️',
        type: 'special',
        requirement: 10,
        reward: { coins: 300, experience: 150, unlocks: ['background:arena'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'multiplayer_champion',
        name: 'Multiplayer Champion',
        description: 'Win 25 online multiplayer games',
        icon: '🏆',
        type: 'special',
        requirement: 25,
        reward: { coins: 1000, experience: 500, unlocks: ['avatar:pvp_champion', 'background:victory_gold'] },
        isUnlocked: false,
        progress: 0,
      },

      // Legendary Achievements
      {
        id: 'math_god',
        name: 'Math God',
        description: 'Reach level 20',
        icon: '⚡👑',
        type: 'special',
        requirement: 20,
        reward: { coins: 2000, experience: 1000, unlocks: ['avatar:math_god', 'background:divine_light'] },
        isUnlocked: false,
        progress: 0,
      },
      {
        id: 'perfectionist',
        name: 'The Perfectionist',
        description: 'Get 20 perfect scores',
        icon: '💎',
        type: 'special',
        requirement: 20,
        reward: { coins: 1500, experience: 750, unlocks: ['background:crystal_cave'] },
        isUnlocked: false,
        progress: 0,
      },
    ];
  }

  // Update player achievements (migration system for new achievements)
  static async updatePlayerAchievements(currentAchievements: Achievement[]): Promise<Achievement[]> {
    try {
      const latestAchievements = await this.getDefaultAchievements();
      const updatedAchievements: Achievement[] = [];
      
      // Create a map of current achievements for quick lookup
      const currentAchievementMap = new Map<string, Achievement>();
      currentAchievements.forEach(achievement => {
        currentAchievementMap.set(achievement.id, achievement);
      });
      
      // Merge achievements - keep existing progress/unlocks, add new ones
      latestAchievements.forEach(latestAchievement => {
        const existingAchievement = currentAchievementMap.get(latestAchievement.id);
        
        if (existingAchievement) {
          // Keep existing achievement with current progress
          updatedAchievements.push(existingAchievement);
        } else {
          // Add new achievement
          updatedAchievements.push(latestAchievement);
          console.log(`Added new achievement: ${latestAchievement.name}`);
        }
      });
      
      return updatedAchievements;
    } catch (error) {
      console.error('Error updating achievements:', error);
      return currentAchievements; // Return original on error
    }
  }

  // Check if player exists
  static async playerExists(): Promise<boolean> {
    try {
      const profileData = await AsyncStorage.getItem(STORAGE_KEYS.PLAYER_PROFILE);
      return profileData !== null;
    } catch (error) {
      console.error('Error checking if player exists:', error);
      return false;
    }
  }

  // Delete player data (for testing or reset)
  static async deletePlayerData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PLAYER_PROFILE,
        STORAGE_KEYS.GAME_HISTORY,
        STORAGE_KEYS.ACHIEVEMENTS,
        STORAGE_KEYS.PLAYER_STATS,
      ]);
    } catch (error) {
      console.error('Error deleting player data:', error);
      throw new Error('Failed to delete player data');
    }
  }

  // Reset player profile and return to username setup (without app restart)
  static async resetPlayerProfile(): Promise<void> {
    try {
      // Clear all player data
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PLAYER_PROFILE,
        STORAGE_KEYS.GAME_HISTORY,
        STORAGE_KEYS.ACHIEVEMENTS,
        STORAGE_KEYS.PLAYER_STATS,
      ]);

      // Clear shop data
      try {
        const { ShopService } = await import('./ShopService');
        await ShopService.resetShopData();
      } catch (error) {
        console.error('Error resetting shop data:', error);
      }
    } catch (error) {
      console.error('Error resetting player profile:', error);
      throw new Error('Failed to reset player profile');
    }
  }

  // Export player data (for backup or Firebase sync)
  static async exportPlayerData(): Promise<string> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      const data = await AsyncStorage.multiGet(keys);
      
      const exportData: { [key: string]: any } = {};
      data.forEach(([key, value]) => {
        if (value) {
          exportData[key] = JSON.parse(value);
        }
      });
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting player data:', error);
      throw new Error('Failed to export player data');
    }
  }

}
