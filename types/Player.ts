export interface PlayerProfile {
  currentStreak: number;
  longestStreak: number;
  lastStreakDate?: string; // YYYY-MM-DD of last streak increment
  id: string;
  username: string; // Display name from Firebase Auth or custom
  createdAt: Date;
  lastActive: Date;
  
  // Currency and progression
  coins: number;
  totalCoinsEarned: number;
  experience: number;
  level: number;
  
  // Game statistics
  gamesPlayed: number;
  totalCorrectAnswers: number;
  totalQuestions: number;
  bestScore: number;
  bestAccuracy: number;
  fastestAnswerTime: number;
  
  // Settings and preferences
  settings: PlayerSettings;
  
  // Customization
  customization: PlayerCustomization;
  
  // Achievements
  achievements: Achievement[];
  unlockedAchievements: string[];
  
  // Friends
  friends?: string[]; // Array of friend user IDs
  friendRequests?: FriendRequest[]; // Pending friend requests
  
  // Times Tables Progress
  timesTablesProgress?: {
    currentTable: number;
    currentMultiplier: number;
    completedTables: number[];
    progress: {[key: number]: number}; // Progress for each table
  };
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  timestamp: Date;
  status: 'pending' | 'accepted' | 'rejected';
  correlationId?: string; // Optional client-generated id for tracing
}

export interface PlayerSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  darkMode: boolean;
  reduceMotion: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  gameTime: number; // in seconds
  showHints: boolean;
  autoSubmit: boolean;
  keyboardLayout: 'calculator' | 'phone'; // Calculator: 789 top, Phone: 123 top
}

export interface PlayerCustomization {
  theme: string;
  avatar: string; // URL or asset name for profile picture
  selectedBadge?: string;
  unlockedThemes: string[];
  unlockedAvatars: string[];
  unlockedBadges: string[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'score' | 'accuracy' | 'speed' | 'streak' | 'games' | 'special';
  requirement: number;
  reward: {
    coins: number;
    experience: number;
    unlocks?: string[];
  };
  isUnlocked: boolean;
  unlockedAt?: Date;
  progress: number;
}

export interface GameResult {
  score: number;
  totalQuestions: number;
  accuracy: number;
  averageTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  coinsEarned: number;
  experienceGained: number;
  playedAt: Date;
}

export interface PlayerStats {
  gamesPlayed: number;
  totalCorrectAnswers: number;
  totalQuestions: number;
  bestScore: number;
  bestAccuracy: number;
  fastestAnswerTime: number;
  averageAccuracy: number;
  averageScore: number;
  currentStreak: number;
  longestStreak: number;
  favoriteTimePeriod?: 'morning' | 'afternoon' | 'evening' | 'night';
}

// Default values for new players
export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
  soundEnabled: true,
  musicEnabled: true,
  vibrationEnabled: true,
  darkMode: false,
  reduceMotion: false,
  difficulty: 'easy',
  gameTime: 60,
  showHints: true,
  autoSubmit: false,
  keyboardLayout: 'calculator',
};

export const DEFAULT_PLAYER_CUSTOMIZATION: PlayerCustomization = {
  theme: 'default',
  avatar: 'default',
  unlockedThemes: ['default'],
  unlockedAvatars: ['default'],
  unlockedBadges: [],
};
