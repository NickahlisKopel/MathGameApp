export interface Background {
  id: string;
  name: string;
  type: 'gradient' | 'solid' | 'custom' | 'animated';
  colors: string[]; // For gradients: [color1, color2], for solid: [color], for custom: [hexCode], for animated: theme colors
  preview: string; // Preview emoji or icon
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'special';
  category?: string; // Color category (Red, Blue, Green, etc.)
  unlockType: 'free' | 'purchase' | 'achievement' | 'daily' | 'challenge' | 'default' | 'event';
  price?: number; // Cost in coins (if purchasable)
  requirement?: {
    type: 'achievement' | 'challenge' | 'level' | 'games_played' | 'accuracy' | 'score' | 'streak';
    target: string | number;
    description: string;
  };
  isUnlocked: boolean;
  unlockedAt?: Date | null;
  animationType?: 'space' | 'particle' | 'wave' | 'forest'; // For animated backgrounds
  isPlaceholder?: boolean; // True for "More Coming Soon!" placeholder items
}

export interface ProfileIcon {
  id: string;
  name: string;
  imagePath: string; // For PNG: 'InChangeWeTrust.png' or 'alphabet/A.png' | For emoji: just the emoji character
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'special';
  category?: string; // Category like Alphabet, Animals, Symbols, Logo, etc.
  unlockType: 'free' | 'purchase' | 'achievement' | 'default';
  price?: number; // Cost in coins (if purchasable)
  requirement?: {
    type: 'achievement' | 'level' | 'games_played' | 'accuracy' | 'score' | 'streak';
    target: string | number;
    description: string;
  };
  isUnlocked: boolean;
  unlockedAt?: Date | null;
}

export interface ShopItem {
  id: string;
  type: 'background' | 'avatar' | 'badge' | 'powerup';
  item: Background | any; // Will expand for other item types
  category: string;
  featured: boolean;
  newItem: boolean;
  limitedTime?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface DailyChallenge {
  id: string;
  date: string; // YYYY-MM-DD format
  hexCode: string;
  backgroundName: string;
  isCompleted: boolean;
  completedAt?: Date;
  userGuess?: string; // User's submitted hex code
}

export interface DailyChallengeSubmission {
  playerId: string;
  playerName: string;
  date: string; // YYYY-MM-DD format
  hexCode: string;
  guess: string;
  isCorrect: boolean;
  similarity: number; // 0-100 percentage of how close the guess was
  submittedAt: Date;
}

export interface ShopData {
  backgrounds: Background[];
  profileIcons: ProfileIcon[];
  purchaseHistory: {
    itemId: string;
    purchasedAt: Date;
    price: number;
  }[];
  dailyChallenges: DailyChallenge[];
  selectedBackground: string; // Current active background ID
  selectedProfileIcon: string; // Current active profile icon ID
  lastDailyCheck: Date;
}

// Generate comprehensive categorized backgrounds
function generateCategorizedBackgrounds(): Background[] {
  const colorCategories = {
    'Red': [
      { hex: '#FF0000', name: 'Red' },
      { hex: '#FF6B6B', name: 'Coral' },
      { hex: '#E74C3C', name: 'Crimson' },
      { hex: '#C0392B', name: 'Dark Red' },
    ],
    'Pink': [
      { hex: '#FF69B4', name: 'Hot Pink' },
      { hex: '#FFB6C1', name: 'Light Pink' },
      { hex: '#FF1493', name: 'Deep Pink' },
      { hex: '#C71585', name: 'Medium Violet Red' },
    ],
    'Orange': [
      { hex: '#FFA500', name: 'Orange' },
      { hex: '#FF8C00', name: 'Dark Orange' },
      { hex: '#FF7F50', name: 'Coral' },
      { hex: '#FF6347', name: 'Tomato' },
    ],
    'Yellow': [
      { hex: '#FFFF00', name: 'Yellow' },
      { hex: '#FFD700', name: 'Gold' },
      { hex: '#F39C12', name: 'Dark Goldenrod' },
      { hex: '#F1C40F', name: 'Golden Yellow' },
    ],
    'Green': [
      { hex: '#00FF00', name: 'Lime' },
      { hex: '#32CD32', name: 'Lime Green' },
      { hex: '#228B22', name: 'Forest Green' },
      { hex: '#008000', name: 'Green' },
    ],
    'Blue': [
      { hex: '#0000FF', name: 'Blue' },
      { hex: '#1E90FF', name: 'Dodger Blue' },
      { hex: '#4169E1', name: 'Royal Blue' },
      { hex: '#0000CD', name: 'Medium Blue' },
    ],
    'Purple': [
      { hex: '#800080', name: 'Purple' },
      { hex: '#9370DB', name: 'Medium Slate Blue' },
      { hex: '#8A2BE2', name: 'Blue Violet' },
      { hex: '#4B0082', name: 'Indigo' },
    ],
    'Cyan': [
      { hex: '#00FFFF', name: 'Cyan' },
      { hex: '#40E0D0', name: 'Turquoise' },
      { hex: '#48D1CC', name: 'Medium Turquoise' },
      { hex: '#00CED1', name: 'Dark Turquoise' },
    ],
  };

  const backgrounds: Background[] = [];

  // Helper functions for color variations
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  };

  const getLighterShade = (hex: string) => {
    const rgb = hexToRgb(hex);
    const factor = 0.4;
    const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor));
    const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor));
    const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor));
    return rgbToHex(r, g, b);
  };

  const getDarkerShade = (hex: string) => {
    const rgb = hexToRgb(hex);
    const factor = 0.4;
    const r = Math.round(rgb.r * factor);
    const g = Math.round(rgb.g * factor);
    const b = Math.round(rgb.b * factor);
    return rgbToHex(r, g, b);
  };

  const getComplementaryColor = (hex: string) => {
    const rgb = hexToRgb(hex);
    const r = 255 - rgb.r;
    const g = 255 - rgb.g;
    const b = 255 - rgb.b;
    return rgbToHex(r, g, b);
  };

  const getPriceForRarity = (rarity: string) => {
    switch (rarity) {
      case 'common': return 25;
      case 'uncommon': return 50;
      case 'rare': return 100;
      case 'epic': return 200;
      default: return 25;
    }
  };

  Object.entries(colorCategories).forEach(([category, colors]) => {
    colors.forEach((color, colorIndex) => {
      const variations = [
        {
          type: 'solid' as const,
          suffix: 'Solid',
          preview: '⬛',
          colors: [color.hex],
          rarity: 'common' as const,
        },
        {
          type: 'gradient' as const,
          suffix: 'Gradient',
          preview: '🌅',
          colors: [color.hex, getLighterShade(color.hex)],
          rarity: 'common' as const,
        },
        {
          type: 'gradient' as const,
          suffix: 'Dark Fade',
          preview: '🌙',
          colors: [color.hex, getDarkerShade(color.hex)],
          rarity: 'uncommon' as const,
        },
        {
          type: 'gradient' as const,
          suffix: 'Rainbow',
          preview: '🌈',
          colors: [color.hex, getComplementaryColor(color.hex), color.hex],
          rarity: 'rare' as const,
        },
      ];

      variations.forEach((variation, index) => {
        const isDefaultUnlocked = category === 'Blue' && colorIndex === 1 && index === 1; // Dodger Blue Gradient
        
        backgrounds.push({
          id: `${category.toLowerCase()}_${color.hex.replace('#', '').toLowerCase()}_${variation.suffix.toLowerCase().replace(' ', '_')}`,
          name: `${color.name} ${variation.suffix}`,
          type: variation.type,
          colors: variation.colors,
          preview: variation.preview,
          rarity: variation.rarity,
          category: category,
          unlockType: 'purchase',
          price: getPriceForRarity(variation.rarity),
          isUnlocked: isDefaultUnlocked,
          unlockedAt: isDefaultUnlocked ? new Date() : undefined,
        });
      });
    });
  });

  // Add special animated backgrounds
  backgrounds.push({
    id: 'space_exploration',
    name: 'Space Exploration',
    type: 'animated',
    colors: ['#0B1426', '#1A237E', '#000051'], // Deep space colors
    preview: '🚀',
    rarity: 'legendary',
    category: 'Special',
    unlockType: 'event',
    requirement: {
      type: 'achievement',
      target: 'space_explorer',
      description: 'Complete 100 math problems with 90% accuracy'
    },
    isUnlocked: true, // Temporarily unlocked for demonstration
    animationType: 'space',
  });

  backgrounds.push({
    id: 'enchanted_forest',
    name: 'Enchanted Forest',
    type: 'animated',
    colors: ['#87CEEB', '#B0E0E6', '#E0F6FF'], // Sky blue colors
    preview: '🌲',
    rarity: 'epic',
    category: 'Special',
    unlockType: 'challenge',
    requirement: {
      type: 'streak',
      target: 1,
      description: 'Log in for 1 day in a row to unlock.'
    },
    isUnlocked: false,
    animationType: 'forest',
  });

  return backgrounds;
}

// Default backgrounds available to all players
export const DEFAULT_BACKGROUNDS: Background[] = generateCategorizedBackgrounds();

// Generate default profile icons
function generateDefaultProfileIcons(): ProfileIcon[] {
  const icons: ProfileIcon[] = [];
  
  // Alien variants - using your White and Black alien PNGs
  const alienVariants = [
    // White Alien variants
    { id: 'alien_white_halo', name: 'Angel Alien', imagePath: 'Alien/AlienwHaloWhite.png', rarity: 'epic' as const, price: 150, unlocked: true },
    { id: 'alien_pink_halo', name: 'Pink Halo Alien', imagePath: 'Alien/AlienwHaloPink.png', rarity: 'rare' as const, price: 100, unlocked: false },
    { id: 'alien_black_halo', name: 'Dark Angel Alien', imagePath: 'Alien/AlienwHaloBlack.png', rarity: 'epic' as const, price: 150, unlocked: false },
    { id: 'alien_black_gold', name: 'Golden Alien', imagePath: 'Alien/AlienBlackGoldHalo.png', rarity: 'legendary' as const, price: 250, unlocked: false },
  ];
  
  alienVariants.forEach((alien) => {
    icons.push({
      id: alien.id,
      name: alien.name,
      imagePath: alien.imagePath,
      rarity: alien.rarity,
      category: 'Aliens',
      unlockType: alien.unlocked ? 'default' : 'purchase',
      price: alien.price,
      isUnlocked: alien.unlocked,
      unlockedAt: alien.unlocked ? new Date() : undefined,
    });
  });
  
  // Alphabet icons (A-Z) - Using emoji as placeholder
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  alphabet.forEach((letter, index) => {
    icons.push({
      id: `icon_${letter.toLowerCase()}`,
      name: `Letter ${letter}`,
      imagePath: `${letter}`,
      rarity: index < 5 ? 'common' : index < 15 ? 'uncommon' : 'rare',
      category: 'Alphabet',
      unlockType: 'purchase',
      price: index < 5 ? 25 : index < 15 ? 50 : 100,
      isUnlocked: false,
      unlockedAt: undefined,
    });
  });
  
  // Logo icons from assets
  const logoIcons = [
    { id: 'icon_pink_logo', name: 'Pink Logo', imagePath: 'InChangeWeTrustPink.png', unlocked: false, price: 500 },
    { id: 'icon_pink_filled_logo', name: 'Pink Filled Logo', imagePath: 'InChangeWeTrustPinkfilled.png', unlocked: false, price: 500 },
    { id: 'icon_black_logo', name: 'Black Logo', imagePath: 'InChangeWeTrust.png', unlocked: false, price: 500 },
  ];
  
  logoIcons.forEach((logo) => {
    icons.push({
      id: logo.id,
      name: logo.name,
      imagePath: logo.imagePath,
      rarity: 'special',
      category: 'Logo',
      unlockType: 'purchase',
      price: logo.price,
      isUnlocked: logo.unlocked,
      unlockedAt: logo.unlocked ? new Date() : undefined,
    });
  });
  
  return icons;
}

export const DEFAULT_PROFILE_ICONS: ProfileIcon[] = generateDefaultProfileIcons();

// Rarity colors for UI
export const RARITY_COLORS = {
  common: '#95a5a6',
  uncommon: '#27ae60',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f39c12',
  special: '#e74c3c',
};

// Rarity order for sorting
export const RARITY_ORDER = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  special: 6,
};

export const DEFAULT_SHOP_DATA: ShopData = {
  backgrounds: DEFAULT_BACKGROUNDS,
  profileIcons: DEFAULT_PROFILE_ICONS,
  purchaseHistory: [],
  dailyChallenges: [],
  selectedBackground: 'blue_1e90ff_gradient', // Dodger Blue Gradient
  selectedProfileIcon: 'icon_a', // Default to letter 'A'
  lastDailyCheck: new Date(0), // Start with epoch to ensure first check
};
