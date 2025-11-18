import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Background, 
  ShopData, 
  DailyChallenge,
  DailyChallengeSubmission, 
  DEFAULT_SHOP_DATA,
  DEFAULT_BACKGROUNDS 
} from '../types/Shop';
import { PlayerStorageService } from './PlayerStorageService';
import { getServerUrl } from '../config/ServerConfig';

const STORAGE_KEYS = {
  SHOP_DATA: 'shop_data',
  DAILY_CHALLENGES: 'daily_challenges',
};

export class ShopService {
  // Initialize shop data for new players
  static async initializeShopData(): Promise<ShopData> {
    const shopData: ShopData = {
      ...DEFAULT_SHOP_DATA,
      backgrounds: DEFAULT_BACKGROUNDS.map(bg => ({ ...bg })),
    };
    
    await this.saveShopData(shopData);
    return shopData;
  }

  // Load shop data
  static async loadShopData(): Promise<ShopData> {
    try {
      const shopDataString = await AsyncStorage.getItem(STORAGE_KEYS.SHOP_DATA);
      if (!shopDataString) {
        return await this.initializeShopData();
      }
      
      const shopData: ShopData = JSON.parse(shopDataString);
      
      // Convert date strings back to Date objects
      shopData.lastDailyCheck = new Date(shopData.lastDailyCheck);
      shopData.purchaseHistory = shopData.purchaseHistory.map(item => ({
        ...item,
        purchasedAt: new Date(item.purchasedAt),
      }));
      shopData.dailyChallenges = shopData.dailyChallenges.map(challenge => ({
        ...challenge,
        completedAt: challenge.completedAt ? new Date(challenge.completedAt) : undefined,
      }));
      shopData.backgrounds = shopData.backgrounds.map(bg => ({
        ...bg,
        unlockedAt: bg.unlockedAt ? new Date(bg.unlockedAt) : null,
      }));
      // Debug: log backgrounds and their unlockedAt values
      console.log('DEBUG backgrounds after mapping:', shopData.backgrounds.map(bg => ({ id: bg.id, unlockedAt: bg.unlockedAt })));
      
      // Ensure all default backgrounds exist (for app updates)
      this.ensureDefaultBackgrounds(shopData);
      
      return shopData;
    } catch (error) {
      console.error('Error loading shop data:', error);
      return await this.initializeShopData();
    }
  }

  // Save shop data
  static async saveShopData(shopData: ShopData): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SHOP_DATA, JSON.stringify(shopData));
    } catch (error) {
      console.error('Error saving shop data:', error);
      throw new Error('Failed to save shop data');
    }
  }

  // Ensure all default backgrounds exist (for app updates)
  private static ensureDefaultBackgrounds(shopData: ShopData): void {
    const existingIds = new Set(shopData.backgrounds.map(bg => bg.id));
    
    DEFAULT_BACKGROUNDS.forEach(defaultBg => {
      if (!existingIds.has(defaultBg.id)) {
        shopData.backgrounds.push({ ...defaultBg });
      }
    });
  }

  // Purchase a background
  static async purchaseBackground(backgroundId: string): Promise<{ success: boolean; message: string }> {
    try {
      const [shopData, player] = await Promise.all([
        this.loadShopData(),
        PlayerStorageService.loadPlayerProfile(),
      ]);
      
      if (!player) {
        return { success: false, message: 'Player profile not found' };
      }
      
      const background = shopData.backgrounds.find(bg => bg.id === backgroundId);
      if (!background) {
        return { success: false, message: 'Background not found' };
      }
      
      if (background.isUnlocked) {
        return { success: false, message: 'Background already unlocked' };
      }
      
      if (background.unlockType !== 'purchase' || !background.price) {
        return { success: false, message: 'Background cannot be purchased' };
      }
      
      if (player.coins < background.price) {
        return { success: false, message: `Not enough coins. Need ${background.price}, have ${player.coins}` };
      }
      
      // Deduct coins
      const success = await PlayerStorageService.spendCoins(background.price);
      if (!success) {
        return { success: false, message: 'Failed to process payment' };
      }
      
      // Unlock background
      background.isUnlocked = true;
      background.unlockedAt = new Date();
      
      // Add to purchase history
      shopData.purchaseHistory.push({
        itemId: backgroundId,
        purchasedAt: new Date(),
        price: background.price,
      });
      
      await this.saveShopData(shopData);
      
      return { success: true, message: `Successfully purchased ${background.name}!` };
    } catch (error) {
      console.error('Error purchasing background:', error);
      return { success: false, message: 'Failed to purchase background' };
    }
  }

  // Set active background
  static async setActiveBackground(backgroundId: string): Promise<boolean> {
    try {
      const shopData = await this.loadShopData();
      const background = shopData.backgrounds.find(bg => bg.id === backgroundId);
      
      if (!background || !background.isUnlocked) {
        return false;
      }
      
      shopData.selectedBackground = backgroundId;
      await this.saveShopData(shopData);
      return true;
    } catch (error) {
      console.error('Error setting active background:', error);
      return false;
    }
  }

  // Get current active background
  static async getActiveBackground(): Promise<Background | null> {
    try {
      const shopData = await this.loadShopData();
      return shopData.backgrounds.find(bg => bg.id === shopData.selectedBackground) || null;
    } catch (error) {
      console.error('Error getting active background:', error);
      return null;
    }
  }

  // Check and unlock achievement-based backgrounds
  static async checkAchievementBackgrounds(unlockedAchievements: string[]): Promise<string[]> {
    try {
      const shopData = await this.loadShopData();
      const newlyUnlocked: string[] = [];
      
      shopData.backgrounds.forEach(background => {
        if (
          background.unlockType === 'achievement' &&
          !background.isUnlocked &&
          background.requirement?.type === 'achievement' &&
          unlockedAchievements.includes(background.requirement.target as string)
        ) {
          background.isUnlocked = true;
          background.unlockedAt = new Date();
          newlyUnlocked.push(background.id);
        }
      });
      
      if (newlyUnlocked.length > 0) {
        await this.saveShopData(shopData);
      }
      
      return newlyUnlocked;
    } catch (error) {
      console.error('Error checking achievement backgrounds:', error);
      return [];
    }
  }

  // Check and unlock challenge-based backgrounds
  static async checkChallengeBackgrounds(player: any): Promise<string[]> {
    try {
      const shopData = await this.loadShopData();
      const newlyUnlocked: string[] = [];
      
      shopData.backgrounds.forEach(background => {
        if (
          background.unlockType === 'challenge' &&
          !background.isUnlocked &&
          background.requirement
        ) {
          let shouldUnlock = false;
          
          switch (background.requirement.type) {
            case 'games_played':
              shouldUnlock = player.gamesPlayed >= background.requirement.target;
              break;
            case 'accuracy':
              shouldUnlock = player.bestAccuracy >= background.requirement.target;
              break;
            case 'score':
              shouldUnlock = player.bestScore >= background.requirement.target;
              break;
            case 'level':
              shouldUnlock = player.level >= background.requirement.target;
              break;
            case 'streak':
              shouldUnlock = player.currentStreak >= background.requirement.target;
              break;
          }
          
          if (shouldUnlock) {
            background.isUnlocked = true;
            background.unlockedAt = new Date();
            newlyUnlocked.push(background.id);
          }
        }
      });
      
      if (newlyUnlocked.length > 0) {
        await this.saveShopData(shopData);
      }
      
      return newlyUnlocked;
    } catch (error) {
      console.error('Error checking challenge backgrounds:', error);
      return [];
    }
  }

  // Generate daily challenge
  static generateDailyChallenge(date: string): DailyChallenge {
    // Generate a random hex code based on the date (deterministic)
    const dateNum = parseInt(date.replace(/-/g, ''));
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
      '#10AC84', '#EE5A24', '#0984E3', '#6C5CE7', '#A29BFE',
      '#FD79A8', '#E84393', '#00B894', '#00CEC9', '#FFB8B8',
    ];
    // Helper to generate a random hex string matching /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/
    function generateRandomHexColor(): string {
      const length = Math.random() < 0.5 ? 3 : 6;
      let hex = '';
      for (let i = 0; i < length; i++) {
        hex += Math.floor(Math.random() * 16).toString(16);
      }
      // Optionally prepend '#'
      return Math.random() < 0.5 ? `#${hex}` : hex;
    }
    // Example usage:
    // let randomHex = generateRandomHexColor();
    
    const colorIndex = dateNum % colors.length;
    const hexCode = generateRandomHexColor();
    
    const names = [
      'Mystical Aura', 'Daily Wonder', 'Secret Shade', 'Hidden Hue',
      'Magic Moment', 'Special Spectrum', 'Unique Universe', 'Daily Delight',
      'Precious Palette', 'Treasure Tone', 'Wonder Wave', 'Special Spark',
    ];
    
    const nameIndex = Math.floor(dateNum / 100) % names.length;
    const backgroundName = names[nameIndex];
    
    return {
      id: `daily_${date}`,
      date,
      hexCode,
      backgroundName,
      isCompleted: false,
    };
  }

  // Check for new daily challenge (from server)
  static async checkDailyChallenge(): Promise<DailyChallenge & { submissions?: DailyChallengeSubmission[] } | null> {
    try {
      const player = await PlayerStorageService.loadPlayerProfile();
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Fetch from server
      const SERVER_URL = getServerUrl();
      const url = `${SERVER_URL}/api/daily-challenge/${today}${player ? `?playerId=${player.id}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Failed to fetch daily challenge from server');
        return null;
      }
      
      const data = await response.json();
      
      // Update local storage
      const shopData = await this.loadShopData();
      let todayChallenge = shopData.dailyChallenges.find(c => c.date === today);
      
      if (!todayChallenge) {
        todayChallenge = {
          id: `daily_${today}`,
          date: today,
          hexCode: data.hexCode,
          backgroundName: 'Daily Wonder',
          isCompleted: !!data.playerSubmission,
          completedAt: data.playerSubmission?.submittedAt ? new Date(data.playerSubmission.submittedAt) : undefined,
          userGuess: data.playerSubmission?.guess,
        };
        shopData.dailyChallenges.push(todayChallenge);
      } else {
        // Update with server data
        todayChallenge.hexCode = data.hexCode;
        todayChallenge.isCompleted = !!data.playerSubmission;
        todayChallenge.completedAt = data.playerSubmission?.submittedAt ? new Date(data.playerSubmission.submittedAt) : undefined;
        todayChallenge.userGuess = data.playerSubmission?.guess;
      }
      
      shopData.lastDailyCheck = new Date();
      
      // Keep only last 30 days of challenges
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      shopData.dailyChallenges = shopData.dailyChallenges.filter(c => {
        const challengeDate = new Date(c.date);
        return challengeDate >= thirtyDaysAgo;
      });
      
      await this.saveShopData(shopData);
      
      return {
        ...todayChallenge,
        submissions: data.submissions || [],
      };
    } catch (error) {
      console.error('Error checking daily challenge:', error);
      return null;
    }
  }

  // Submit daily challenge hex code (to server)
  static async submitDailyChallenge(hexCode: string): Promise<{ success: boolean; message: string; background: Background; isCorrect?: boolean; submissions?: DailyChallengeSubmission[] }> {
    try {
      console.log('[ShopService] submitDailyChallenge called with:', hexCode);
      
      const player = await PlayerStorageService.loadPlayerProfile();
      if (!player) {
        return { success: false, message: 'Player profile not found', background: null as any };
      }
      
      console.log('[ShopService] Player:', { id: player.id, username: player.username });
      
      const shopData = await this.loadShopData();
      const today = new Date().toISOString().split('T')[0];
      
      console.log('[ShopService] Today:', today);
      
      const todayChallenge = shopData.dailyChallenges.find(c => c.date === today);
      if (!todayChallenge) {
        console.log('[ShopService] No challenge found for today');
        return { success: false, message: 'No daily challenge available', background: null as any };
      }
      
      if (todayChallenge.isCompleted) {
        console.log('[ShopService] Challenge already completed');
        return { success: false, message: 'Daily challenge already completed', background: null as any };
      }
      
      // Validate hex code format
      const hexPattern = /^#?[0-9A-Fa-f]{6}$/;
      if (!hexPattern.test(hexCode)) {
        console.log('[ShopService] Invalid hex code format:', hexCode);
        return { success: false, message: 'Please enter a valid hex code (like #FF6B6B)', background: null as any };
      }
      
      // Submit to server
      const SERVER_URL = getServerUrl();
      const payload = {
        playerId: player.id,
        playerName: player.username,
        date: today,
        guess: hexCode,
      };
      
      console.log('[ShopService] Submitting to server:', SERVER_URL, payload);
      
      const response = await fetch(`${SERVER_URL}/api/daily-challenge/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const error = await response.json();
        return { success: false, message: error.error || 'Failed to submit', background: null as any };
      }
      
      const serverResult = await response.json();
      const { isCorrect, hexCode: targetHexCode, submissions } = serverResult;
      
      // Normalize hex codes
      const normalizeHex = (hex: string) => hex.replace('#', '').toLowerCase();
      const inputHex = normalizeHex(hexCode);
      const normalizedInputColor = `#${inputHex.toUpperCase()}`;
      
      // Create multiple background variations for the user's input color
      const baseColorName = isCorrect ? todayChallenge.backgroundName : `Your Color ${new Date().toLocaleDateString()}`;
      const colorVariations = [
        {
          id: `custom_${today}_${inputHex}_solid`,
          name: `${baseColorName} (Solid)`,
          type: 'solid' as const,
          colors: [normalizedInputColor],
          preview: '⬛',
        },
        {
          id: `custom_${today}_${inputHex}_gradient`,
          name: `${baseColorName} (Gradient)`,
          type: 'gradient' as const,
          colors: [normalizedInputColor, this.getLighterShade(normalizedInputColor)],
          preview: '🌅',
        },
        {
          id: `custom_${today}_${inputHex}_dark_gradient`,
          name: `${baseColorName} (Dark Fade)`,
          type: 'gradient' as const,
          colors: [normalizedInputColor, this.getDarkerShade(normalizedInputColor)],
          preview: '🌙',
        },
        {
          id: `custom_${today}_${inputHex}_rainbow`,
          name: `${baseColorName} (Rainbow)`,
          type: 'gradient' as const,
          colors: [normalizedInputColor, this.getComplementaryColor(normalizedInputColor), normalizedInputColor],
          preview: '🌈',
        },
      ];

      // Add all variations if they don't already exist
      let newBackgroundsCount = 0;
      colorVariations.forEach(variation => {
        const existingBg = shopData.backgrounds.find(bg => bg.id === variation.id);
        if (!existingBg) {
          const background: Background = {
            ...variation,
            rarity: isCorrect ? 'special' : 'common',
            unlockType: 'daily',
            isUnlocked: true,
            unlockedAt: new Date(),
          };
          shopData.backgrounds.push(background);
          newBackgroundsCount++;
        }
      });
      
      let message = '';
      let additionalBackground: Background | undefined = undefined;
      
      if (isCorrect) {
        // If correct, also give them the special daily background
        const dailyBackground: Background = {
          id: todayChallenge.id,
          name: `${todayChallenge.backgroundName} (Perfect Match!)`,
          type: 'gradient',
          colors: [todayChallenge.hexCode, '#FFD700'], // Add gold accent for perfect match
          preview: '🏆',
          rarity: 'legendary',
          unlockType: 'daily',
          isUnlocked: true,
          unlockedAt: new Date(),
        };
        
        const existingDailyBg = shopData.backgrounds.find(bg => bg.id === dailyBackground.id);
        if (!existingDailyBg) {
          shopData.backgrounds.push(dailyBackground);
          additionalBackground = dailyBackground;
        }
        
        message = `🎯 Perfect match! You unlocked ${newBackgroundsCount} color variations AND the legendary bonus background!`;
      } else {
        message = `🎨 Awesome! You unlocked ${newBackgroundsCount} variations of your color: solid, gradient, dark fade, and rainbow! The target was ${todayChallenge.hexCode} - come back tomorrow for a new challenge!`;
      }
      
      // Mark challenge as completed after any attempt (one try per day)
      todayChallenge.isCompleted = true;
      todayChallenge.completedAt = new Date();
      todayChallenge.userGuess = hexCode;
      
      await this.saveShopData(shopData);
      
      return { 
        success: true, 
        message,
        background: additionalBackground
          ? additionalBackground
          : {
              ...colorVariations[0],
              rarity: isCorrect ? 'special' : 'common',
              unlockType: 'daily',
              isUnlocked: true,
              unlockedAt: new Date(),
            },
        isCorrect,
        submissions,
      };
    } catch (error) {
      console.error('Error submitting daily challenge:', error);
      return { success: false, message: 'Failed to submit challenge', background: null as any};
    }
  }

  // Get available backgrounds organized by category
  static async getBackgroundsForShop(): Promise<{ [category: string]: { unlocked: Background[]; locked: Background[] } }> {
    try {
      const shopData = await this.loadShopData();
      
      const categorized: { [category: string]: { unlocked: Background[]; locked: Background[] } } = {};
      
      shopData.backgrounds.forEach(bg => {
        const category = bg.category || 'Other';
        
        if (!categorized[category]) {
          categorized[category] = { unlocked: [], locked: [] };
        }
        
        if (bg.isUnlocked) {
          categorized[category].unlocked.push(bg);
        } else {
          categorized[category].locked.push(bg);
        }
      });
      
      // Sort within each category
      Object.values(categorized).forEach(categoryData => {
        categoryData.unlocked.sort((a, b) => a.name.localeCompare(b.name));
        categoryData.locked.sort((a, b) => {
          // Sort by rarity first, then by name
          const rarityOrder = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, special: 6 };
          if (rarityOrder[a.rarity] !== rarityOrder[b.rarity]) {
            return rarityOrder[a.rarity] - rarityOrder[b.rarity];
          }
          return a.name.localeCompare(b.name);
        });
      });
      
      // Ensure each category has minimum 2 items
      Object.keys(categorized).forEach(category => {
        const categoryData = categorized[category];
        const totalItems = categoryData.unlocked.length + categoryData.locked.length;
        
        if (totalItems < 2) {
          const itemsToAdd = 2 - totalItems;
          for (let i = 0; i < itemsToAdd; i++) {
            categoryData.locked.push({
              id: `placeholder_${category}_${i}`,
              name: 'More Coming Soon!',
              type: 'gradient',
              colors: ['#999999', '#666666'],
              preview: '⏳',
              price: 0,
              rarity: 'common',
              category: category,
              unlockType: 'purchase',
              isUnlocked: false,
              isPlaceholder: true, // Flag to identify placeholders
            } as any);
          }
        }
      });
      
      return categorized;
    } catch (error) {
      console.error('Error getting backgrounds for shop:', error);
      return {};
    }
  }

  // Check and unlock backgrounds based on player requirements
  static async checkAndUnlockBackgrounds(): Promise<Background[]> {
    try {
      const player = await PlayerStorageService.loadPlayerProfile();
      if (!player) return [];

      const shopData = await this.loadShopData();
      const newlyUnlocked: Background[] = [];

      for (const bg of shopData.backgrounds) {
        // Skip already unlocked or backgrounds without requirements
        if (bg.isUnlocked || !bg.requirement) continue;

        let shouldUnlock = false;

        switch (bg.requirement.type) {
          case 'streak':
            shouldUnlock = player.currentStreak >= (bg.requirement.target as number);
            break;
          case 'level':
            shouldUnlock = player.level >= (bg.requirement.target as number);
            break;
          case 'games_played':
            shouldUnlock = player.gamesPlayed >= (bg.requirement.target as number);
            break;
          case 'accuracy':
            const accuracy = player.totalQuestions > 0 
              ? (player.totalCorrectAnswers / player.totalQuestions) * 100 
              : 0;
            shouldUnlock = accuracy >= (bg.requirement.target as number);
            break;
          case 'score':
            shouldUnlock = player.bestScore >= (bg.requirement.target as number);
            break;
        }

        if (shouldUnlock) {
          bg.isUnlocked = true;
          bg.unlockedAt = new Date();
          newlyUnlocked.push(bg);
          console.log(`🎉 Unlocked background: ${bg.name}`);
        }
      }

      if (newlyUnlocked.length > 0) {
        await this.saveShopData(shopData);
      }

      return newlyUnlocked;
    } catch (error) {
      console.error('Error checking background unlocks:', error);
      return [];
    }
  }

  // Get colors for active background
  static async getActiveBackgroundColors(): Promise<string[]> {
    try {
      const shopData = await this.loadShopData();
      const activeBackground = shopData.backgrounds.find(bg => bg.id === shopData.selectedBackground);
      
      if (activeBackground && activeBackground.isUnlocked) {
        console.log('Found active background:', activeBackground.name, activeBackground.colors);
        return activeBackground.colors;
      }
      
      // Fallback to first unlocked background
      const firstUnlocked = shopData.backgrounds.find(bg => bg.isUnlocked);
      if (firstUnlocked) {
        console.log('Using first unlocked background:', firstUnlocked.name, firstUnlocked.colors);
        return firstUnlocked.colors;
      }
      
      console.log('Using default colors');
      return ['#667eea', '#764ba2']; // Default gradient
    } catch (error) {
      console.error('Error getting active background colors:', error);
      return ['#667eea', '#764ba2']; // Default gradient
    }
  }

  // Clear all shop data (for testing)
  static async clearShopData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SHOP_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.DAILY_CHALLENGES);
    } catch (error) {
      console.error('Error clearing shop data:', error);
      throw new Error('Failed to clear shop data');
    }
  }

  // Reset shop data to defaults (for profile reset)
  static async resetShopData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.SHOP_DATA,
        STORAGE_KEYS.DAILY_CHALLENGES,
      ]);
    } catch (error) {
      console.error('Error resetting shop data:', error);
      throw new Error('Failed to reset shop data');
    }
  }

  // Helper methods for color manipulation
  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  private static rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }

  private static getLighterShade(hex: string): string {
    const rgb = this.hexToRgb(hex);
    // Make it 40% lighter
    const factor = 0.4;
    const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor));
    const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor));
    const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor));
    return this.rgbToHex(r, g, b);
  }

  private static getDarkerShade(hex: string): string {
    const rgb = this.hexToRgb(hex);
    // Make it 60% darker
    const factor = 0.4;
    const r = Math.round(rgb.r * factor);
    const g = Math.round(rgb.g * factor);
    const b = Math.round(rgb.b * factor);
    return this.rgbToHex(r, g, b);
  }

  private static getComplementaryColor(hex: string): string {
    const rgb = this.hexToRgb(hex);
    // Create a complementary color by shifting hue
    const r = 255 - rgb.r;
    const g = 255 - rgb.g;
    const b = 255 - rgb.b;
    return this.rgbToHex(r, g, b);
  }
}
