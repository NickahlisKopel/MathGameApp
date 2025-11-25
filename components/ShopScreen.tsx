import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Background, ProfileIcon, DailyChallenge, DailyChallengeSubmission, RARITY_COLORS } from '../types/Shop';
import { PlayerProfile } from '../types/Player';
import { ShopService } from '../services/ShopService';
import { useTheme, getContrastColor } from '../contexts/ThemeContext';
import { IslandButton } from './IslandButton';
import { IslandCard } from './IslandCard';
import { IslandMenu } from './IslandMenu';

interface Props {
  visible: boolean;
  onClose: () => void;
  player: PlayerProfile;
  onPlayerUpdated: (player: PlayerProfile) => void;
  activeBackgroundColors: string[];
  activeBackgroundType: 'solid' | 'gradient' | 'custom' | 'animated';
  activeAnimationType?: 'space' | 'particle' | 'wave' | 'forest';
  onBackgroundChanged?: () => void;
}

type TabType = 'backgrounds' | 'icons' | 'daily';

const { width, height } = Dimensions.get('window');

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

// Static image mapping for profile icons
const PROFILE_ICON_IMAGES: { [key: string]: any } = {
  'Alien/AlienwHaloWhite.png': require('../assets/Alien/AlienwHaloWhite.png'),
  'Alien/AlienwHaloPink.png': require('../assets/Alien/AlienwHaloPink.png'),
  'Alien/AlienwHaloBlack.png': require('../assets/Alien/AlienwHaloBlack.png'),
  'Alien/AlienBlackGoldHalo.png': require('../assets/Alien/AlienBlackGoldHalo.png'),
  'InChangeWeTrustPink.png': require('../assets/InChangeWeTrustPink.png'),
  'InChangeWeTrustPinkfilled.png': require('../assets/InChangeWeTrustPinkfilled.png'),
  'InChangeWeTrust.png': require('../assets/InChangeWeTrust.png'),
};

export default function ShopScreen({ visible, onClose, player, onPlayerUpdated, activeBackgroundColors, activeBackgroundType, activeAnimationType, onBackgroundChanged }: Props) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('backgrounds');
  const [backgrounds, setBackgrounds] = useState<{ [category: string]: { unlocked: Background[]; locked: Background[] } }>({});
  const [profileIcons, setProfileIcons] = useState<{ [category: string]: { unlocked: ProfileIcon[]; locked: ProfileIcon[] } }>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Blue'])); // Default expand Blue category
  const [expandedIconCategories, setExpandedIconCategories] = useState<Set<string>>(new Set(['Aliens'])); // Default expand Aliens category
  const [selectedBackground, setSelectedBackground] = useState<string>('');
  const [selectedIcon, setSelectedIcon] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [dailyChallenge, setDailyChallenge] = useState<(DailyChallenge & { submissions?: DailyChallengeSubmission[] }) | null>(null);
  const [hexCodeInput, setHexCodeInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewBackground, setPreviewBackground] = useState<Background | null>(null);
  const [showIconPreview, setShowIconPreview] = useState(false);
  const [previewIcon, setPreviewIcon] = useState<ProfileIcon | null>(null);
  const [showHexCheatSheet, setShowHexCheatSheet] = useState(false);
  
  // Helper function to get image source
  const getIconImageSource = (imagePath: string) => {
    return PROFILE_ICON_IMAGES[imagePath] || null;
  };

  useEffect(() => {
    if (visible) {
      loadShopData();
      loadProfileIcons();
      loadDailyChallenge();
    }  }, [visible]);

  const loadShopData = async () => {
    try {
      const shopData = await ShopService.getBackgroundsForShop();
      setBackgrounds(shopData);
      
      const activeBackground = await ShopService.getActiveBackground();
      setSelectedBackground(activeBackground?.id || '');
    } catch (error) {
      console.error('Error loading shop data:', error);
    }
  };

  const loadProfileIcons = async () => {
    try {
      const iconsData = await ShopService.getProfileIconsForShop();
      setProfileIcons(iconsData);
      
      const activeIcon = await ShopService.getActiveProfileIcon();
      setSelectedIcon(activeIcon?.id || '');
    } catch (error) {
      console.error('Error loading profile icons:', error);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleIconCategory = (category: string) => {
    const newExpanded = new Set(expandedIconCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedIconCategories(newExpanded);
  };

  const getCategoryEmoji = (category: string) => {
    const emojis: { [key: string]: string } = {
      'Red': '❤️',
      'Pink': '💖',
      'Orange': '🧡', 
      'Yellow': '💛',
      'Green': '💚',
      'Blue': '💙',
      'Purple': '💜',
      'Cyan': '🩵',
      'Other': '🎨',
    };
    return emojis[category] || '🎨';
  };

  const loadDailyChallenge = async () => {
    try {
      const challenge = await ShopService.checkDailyChallenge();
      setDailyChallenge(challenge);
    } catch (error) {
      console.error('Error loading daily challenge:', error);
    }
  };

  const handlePurchase = async (background: Background) => {
    if (!background.price) return;
    
    Alert.alert(
      'Purchase Background',
      `Do you want to purchase "${background.name}" for ${background.price} coins?\n\nYou have ${player.coins} coins.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await ShopService.purchaseBackground(background.id);
              
              if (result.success) {
                Alert.alert('Success!', result.message);
                await loadShopData();
                
                // Reload player profile to get updated coins
                const updatedPlayer = await require('../services/PlayerStorageService').PlayerStorageService.loadPlayerProfile();
                if (updatedPlayer) {
                  onPlayerUpdated(updatedPlayer);
                }
              } else {
                Alert.alert('Purchase Failed', result.message);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to purchase background');
            } finally {
              setLoading(false);
            }  },  },
      ]
    );
  };

  const handleSetActive = async (backgroundId: string) => {
    try {
      setLoading(true);
      const success = await ShopService.setActiveBackground(backgroundId);
      
      if (success) {
        setSelectedBackground(backgroundId);
        Alert.alert('Success!', 'Background applied successfully');
        // Notify parent component that background changed
        onBackgroundChanged?.();
      } else {
        Alert.alert('Error', 'Failed to apply background');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to apply background');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseIcon = async (icon: ProfileIcon) => {
    if (!icon.price) return;
    
    Alert.alert(
      'Purchase Profile Icon',
      `Do you want to purchase "${icon.name}" for ${icon.price} coins?\n\nYou have ${player.coins} coins.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await ShopService.purchaseProfileIcon(icon.id);
              
              if (result.success) {
                await loadProfileIcons();
                
                // Reload player profile to get updated coins
                const updatedPlayer = await require('../services/PlayerStorageService').PlayerStorageService.loadPlayerProfile();
                if (updatedPlayer) {
                  onPlayerUpdated(updatedPlayer);
                }
                
                // Ask if user wants to equip the icon
                Alert.alert(
                  'Purchase Successful! 🎉',
                  `${result.message}\n\nWould you like to equip "${icon.name}" as your profile icon now?`,
                  [
                    { 
                      text: 'Not Now', 
                      style: 'cancel' 
                    },
                    {
                      text: 'Equip Now',
                      onPress: async () => {
                        await handleSetActiveIcon(icon.id);
                      },
                    },
                  ]
                );
              } else {
                Alert.alert('Purchase Failed', result.message);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to purchase profile icon');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSetActiveIcon = async (iconId: string) => {
    try {
      setLoading(true);
      const success = await ShopService.setActiveProfileIcon(iconId);
      
      if (success) {
        setSelectedIcon(iconId);
        
        // Reload player profile to update the profile icon in parent component
        const updatedPlayer = await require('../services/PlayerStorageService').PlayerStorageService.loadPlayerProfile();
        if (updatedPlayer) {
          onPlayerUpdated(updatedPlayer);
        }
        
        Alert.alert('Success!', 'Profile icon applied successfully');
      } else {
        Alert.alert('Error', 'Failed to apply profile icon');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to apply profile icon');
    } finally {
      setLoading(false);
    }
  };

  const handleDailyChallengeSubmit = async () => {
    if (!hexCodeInput.trim()) {
      Alert.alert('Error', 'Please enter a hex code');
      return;
    }
    
    setLoading(true);
    try {
      // Auto-prepend # since input strips it
      const formattedHex = `#${hexCodeInput.trim()}`;
      const result = await ShopService.submitDailyChallenge(formattedHex);
      
      if (result.success) {
        const title = result.isCorrect ? 'Perfect Match! 🎯' : 'New Color Unlocked! 🎨';
        Alert.alert(title, result.message);
        
        // Clear input after any successful submission
        setHexCodeInput('');
        
        // Reload data to show new backgrounds
        await loadDailyChallenge();
        await loadShopData();
        
        // Switch to backgrounds tab to show the new unlock
        setTimeout(() => {
          setActiveTab('backgrounds');  }, 1500);
      } else {
        Alert.alert('Invalid Input', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit challenge');
    } finally {
      setLoading(false);
    }
  };

  const showBackgroundPreview = (background: Background) => {
    setPreviewBackground(background);
    setShowPreview(true);
  };

  const showProfileIconPreview = (icon: ProfileIcon) => {
    setPreviewIcon(icon);
    setShowIconPreview(true);
  };

  const getRarityColor = (rarity: string) => {
    return RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] || '#95a5a6';
  };

  const renderBackgroundItem = ({ item: background }: { item: Background }) => {
    const isSelected = selectedBackground === background.id;
    const isUnlocked = background.isUnlocked;
    const isPlaceholder = (background as any).isPlaceholder;
    
    return (
      <TouchableOpacity
        onPress={() => !isPlaceholder && (isUnlocked ? handleSetActive(background.id) : showBackgroundPreview(background))}
        disabled={loading || isPlaceholder}
        activeOpacity={isPlaceholder ? 1 : 0.9}
        style={{ minWidth: 90, maxWidth: 110, marginRight: 8, opacity: isPlaceholder ? 0.5 : 1 }}
      >
        <IslandCard
          variant={isSelected ? "floating" : "elevated"}
          padding={8}
          style={styles.backgroundItem}
        >
        {background.type === 'solid' ? (
          <View
            style={[
              styles.backgroundPreview,
              { backgroundColor: background.colors[0], minHeight: 45, maxHeight: 60 }
            ]}
          >
            <Text style={[styles.backgroundEmoji, { fontSize: 22 }]}>{background.preview}</Text>
            {isSelected && <Text style={[styles.activeIndicator, { fontSize: 16 }]}>✓</Text>}
            {!isUnlocked && <View style={styles.lockedOverlay} />}
          </View>
        ) : (
          <LinearGradient
            colors={background.colors as [string, string, ...string[]]}
            style={[styles.backgroundPreview, { minHeight: 45, maxHeight: 60 }]}
          >
            <Text style={[styles.backgroundEmoji, { fontSize: 22 }]}>{background.preview}</Text>
            {isSelected && <Text style={[styles.activeIndicator, { fontSize: 16 }]}>✓</Text>}
            {!isUnlocked && <View style={styles.lockedOverlay} />}
          </LinearGradient>
        )}
        
        <View style={styles.backgroundInfo}>
          <Text style={[styles.backgroundName, { color: theme.colors.textSecondary, fontSize: 10 }, !isUnlocked && styles.lockedText]} numberOfLines={1}>
            {background.name}
          </Text>
          {background.rarity && (
            <Text style={[styles.backgroundRarity, { color: getRarityColor(background.rarity), fontSize: 9 }]}>
              {background.rarity.toUpperCase()}
            </Text>
          )}
          
          {!isUnlocked && (
            <View style={styles.unlockInfo}>
              {background.unlockType === 'purchase' && background.price && (
                <TouchableOpacity
                  style={[
                    styles.purchaseButton,
                    player.coins < background.price && styles.purchaseButtonDisabled,
                    { paddingVertical: 3, paddingHorizontal: 6 }
                  ]}
                  onPress={() => handlePurchase(background)}
                  disabled={loading || player.coins < background.price}
                >
                  <Text style={[
                    styles.purchaseButtonText,
                    player.coins < background.price && styles.purchaseButtonTextDisabled,
                    { fontSize: 10 }
                  ]}>
                    {background.price} 🪙
                  </Text>
                </TouchableOpacity>
              )}
              
              {background.unlockType === 'achievement' && background.requirement && (
                <Text style={[styles.requirementText, { fontSize: 9, color: theme.colors.textSecondary }]} numberOfLines={2}>
                  {background.requirement.description}
                </Text>
              )}
              
              {background.unlockType === 'challenge' && background.requirement && (
                <Text style={[styles.requirementText, { fontSize: 9, color: theme.colors.textSecondary }]} numberOfLines={2}>
                  {background.requirement.description}
                </Text>
              )}
              
              {background.unlockType === 'daily' && (
                <Text style={[styles.requirementText, { fontSize: 9, color: theme.colors.textSecondary }]}>
                  Daily Challenge
                </Text>
              )}
            </View>
          )}
        </View>
        </IslandCard>
      </TouchableOpacity>
    );
  };

  const renderProfileIconItem = ({ item: icon }: { item: ProfileIcon }) => {
    const isSelected = selectedIcon === icon.id;
    const isUnlocked = icon.isUnlocked;
    const isImageFile = icon.imagePath.endsWith('.png') || icon.imagePath.endsWith('.jpg') || icon.imagePath.endsWith('.jpeg');
    
    return (
      <TouchableOpacity
        onPress={() => isUnlocked ? handleSetActiveIcon(icon.id) : showProfileIconPreview(icon)}
        disabled={loading}
        activeOpacity={0.9}
        style={{ minWidth: 90, maxWidth: 110, marginRight: 8 }}
      >
        <IslandCard
          variant={isSelected ? "floating" : "elevated"}
          padding={8}
          style={styles.backgroundItem}
        >
          <View
            style={[
              styles.backgroundPreview,
              { backgroundColor: theme.colors.surface, minHeight: 45, maxHeight: 60, justifyContent: 'center', alignItems: 'center' }
            ]}
          >
            {isImageFile && getIconImageSource(icon.imagePath) ? (
              <Image 
                source={getIconImageSource(icon.imagePath)} 
                style={{ width: 35, height: 35 }}
                resizeMode="contain"
              />
            ) : (
              <Text style={[styles.backgroundEmoji, { fontSize: 28 }]}>{icon.imagePath}</Text>
            )}
            {isSelected && <Text style={[styles.activeIndicator, { fontSize: 16, position: 'absolute', top: 2, right: 2 }]}>✓</Text>}
            {!isUnlocked && <View style={styles.lockedOverlay} />}
          </View>
        
        <View style={styles.backgroundInfo}>
          <Text style={[styles.backgroundName, { color: theme.colors.textSecondary, fontSize: 10 }, !isUnlocked && styles.lockedText]} numberOfLines={1}>
            {icon.name}
          </Text>
          {icon.rarity && (
            <Text style={[styles.backgroundRarity, { color: getRarityColor(icon.rarity), fontSize: 9 }]}>
              {icon.rarity.toUpperCase()}
            </Text>
          )}
          
          {!isUnlocked && (
            <View style={styles.unlockInfo}>
              {icon.unlockType === 'purchase' && icon.price && (
                <TouchableOpacity
                  style={[
                    styles.purchaseButton,
                    player.coins < icon.price && styles.purchaseButtonDisabled,
                    { paddingVertical: 3, paddingHorizontal: 6 }
                  ]}
                  onPress={() => handlePurchaseIcon(icon)}
                  disabled={loading || player.coins < icon.price}
                >
                  <Text style={[
                    styles.purchaseButtonText,
                    player.coins < icon.price && styles.purchaseButtonTextDisabled,
                    { fontSize: 10 }
                  ]}>
                    {icon.price} 🪙
                  </Text>
                </TouchableOpacity>
              )}
              
              {icon.unlockType === 'achievement' && icon.requirement && (
                <Text style={[styles.requirementText, { fontSize: 9, color: theme.colors.textSecondary }]} numberOfLines={2}>
                  {icon.requirement.description}
                </Text>
              )}
            </View>
          )}
        </View>
        </IslandCard>
      </TouchableOpacity>
    );
  };

  const renderBackgrounds = () => {
    const sortedCategories = Object.keys(backgrounds).sort();
    
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={true}>
        {!sortedCategories.some(cat => expandedCategories.has(cat)) && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ textAlign: 'center', opacity: 0.7, color: theme.colors.textSecondary }}>
              Tap a category to view backgrounds
            </Text>
          </View>
        )}
        {sortedCategories.map(category => {
          const categoryData = backgrounds[category];
          const totalUnlocked = categoryData.unlocked.length;
          const totalLocked = categoryData.locked.length;
          const isExpanded = expandedCategories.has(category);
          
          return (
            <View key={category} style={styles.categorySection}>
              <TouchableOpacity 
                style={[styles.categoryHeader, { backgroundColor: theme.colors.card, paddingVertical: 10, paddingHorizontal: 12 }]}
                onPress={() => toggleCategory(category)}
              >
                <View style={styles.categoryTitleRow}>
                  <Text style={[styles.categoryEmoji, { fontSize: 16 }]}>{getCategoryEmoji(category)}</Text>
                  <Text style={[styles.categoryTitle, { color: theme.colors.text, fontSize: 14 }]}>{category}</Text>
                  <Text style={[styles.categoryCount, { color: theme.colors.textTertiary, backgroundColor: theme.colors.surface, fontSize: 11, paddingHorizontal: 6, paddingVertical: 2 }]}>
                    {totalUnlocked}/{totalUnlocked + totalLocked}
                  </Text>
                </View>
                <Text style={[styles.categoryToggle, { color: theme.colors.textSecondary, fontSize: 12 }]}>
                  {isExpanded ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>
              
              {isExpanded && (
                <View style={styles.categoryContent}>
                  <FlatList
                    data={[...categoryData.unlocked, ...categoryData.locked]}
                    renderItem={renderBackgroundItem}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    contentContainerStyle={styles.horizontalGrid}
                    style={styles.horizontalScroll}
                  />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderProfileIcons = () => {
    const sortedCategories = Object.keys(profileIcons).sort();
    
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={true}>
        {!sortedCategories.some(cat => expandedIconCategories.has(cat)) && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ textAlign: 'center', opacity: 0.7, color: theme.colors.textSecondary }}>
              Tap a category to view profile icons
            </Text>
          </View>
        )}
        {sortedCategories.map(category => {
          const categoryData = profileIcons[category];
          const totalUnlocked = categoryData.unlocked.length;
          const totalLocked = categoryData.locked.length;
          const isExpanded = expandedIconCategories.has(category);
          
          return (
            <View key={category} style={styles.categorySection}>
              <TouchableOpacity 
                style={[styles.categoryHeader, { backgroundColor: theme.colors.card, paddingVertical: 10, paddingHorizontal: 12 }]}
                onPress={() => toggleIconCategory(category)}
              >
                <View style={styles.categoryTitleRow}>
                  <Text style={[styles.categoryEmoji, { fontSize: 16 }]}>
                    {category === 'Alphabet' ? '🔤' : category === 'Logo' ? '🎨' : category === 'Aliens' ? '👽' : '⭐'}
                  </Text>
                  <Text style={[styles.categoryTitle, { color: theme.colors.text, fontSize: 14 }]}>{category}</Text>
                  <Text style={[styles.categoryCount, { color: theme.colors.textTertiary, backgroundColor: theme.colors.surface, fontSize: 11, paddingHorizontal: 6, paddingVertical: 2 }]}>
                    {totalUnlocked}/{totalUnlocked + totalLocked}
                  </Text>
                </View>
                <Text style={[styles.categoryToggle, { color: theme.colors.textSecondary, fontSize: 12 }]}>
                  {isExpanded ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>
              
              {isExpanded && (
                <View style={styles.categoryContent}>
                  <FlatList
                    data={[...categoryData.unlocked, ...categoryData.locked]}
                    renderItem={renderProfileIconItem}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    contentContainerStyle={styles.horizontalGrid}
                    style={styles.horizontalScroll}
                  />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderDailyChallenge = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>🎨 Daily Color Challenge</Text>
        <Text style={[styles.cardSubtitle, { color: theme.colors.textTertiary }]}>
          One guess per day! Your color gets unlocked, plus bonus for exact match! 🎯
        </Text>
        
        {dailyChallenge ? (
          <>
            {!dailyChallenge.isCompleted ? (
              <>
                <View style={styles.colorPreview}>
                  <View 
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: dailyChallenge.hexCode }
                    ]} 
                  />
                  <Text style={[styles.colorLabel, { color: '#ffffff' }]}>Match this color!</Text>
                </View>
                
                <View style={styles.inputContainer}>
                  <View style={styles.inputLabelRow}>
                    <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Enter Hex Code:</Text>
                    <TouchableOpacity 
                      style={styles.tipButton}
                      onPress={() => setShowHexCheatSheet(true)}
                    >
                      <Text style={styles.tipButtonText}>💡</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.hexInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }]}
                    value={hexCodeInput}
                    onChangeText={(text) => setHexCodeInput(text.replace('#', ''))}
                    placeholder="FF6B6B"
                    placeholderTextColor={theme.colors.placeholderText}
                    maxLength={6}
                    autoCapitalize="characters"
                  />
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!hexCodeInput.trim() || loading) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleDailyChallengeSubmit}
                  disabled={!hexCodeInput.trim() || loading}
                >
                  <Text style={[
                    styles.submitButtonText,
                    (!hexCodeInput.trim() || loading) && styles.submitButtonTextDisabled,
                  ]}>
                    {loading ? 'Checking...' : 'Submit Guess'}
                  </Text>
                </TouchableOpacity>
                
                <Text style={styles.hint}>
                  💡 Format: RRGGBB (# is optional). You get one guess per day - make it count!
                </Text>
              </>
            ) : (
              <View style={styles.completedChallenge}>
                <Text style={styles.completedText}>✅ Today's challenge completed!</Text>
                <Text style={styles.completedSubtext}>
                  You submitted: {dailyChallenge.userGuess || 'Unknown'}
                </Text>
                <Text style={styles.nextChallengeText}>
                  Come back in 24 hours for a new color challenge!
                </Text>
              </View>
            )}
            
            {/* Leaderboard Section */}
            {dailyChallenge.submissions && dailyChallenge.submissions.length > 0 && (
              <View style={styles.leaderboardSection}>
                <Text style={[styles.leaderboardTitle, { color: '#ffffff' }]}>
                  🏆 Today's Submissions
                </Text>
                <Text style={[styles.leaderboardSubtitle, { color: theme.colors.textTertiary }]}>
                  {dailyChallenge.submissions.filter(s => s.isCorrect).length} correct guess{dailyChallenge.submissions.filter(s => s.isCorrect).length !== 1 ? 'es' : ''} so far!
                </Text>
                
                <ScrollView 
                  style={styles.leaderboardScroll}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {dailyChallenge.submissions.map((submission, index) => (
                    <View 
                      key={`${submission.playerId}-${submission.submittedAt}`}
                      style={[
                        styles.leaderboardItem,
                        { backgroundColor: submission.isCorrect ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.05)' }
                      ]}
                    >
                      <View style={styles.leaderboardRank}>
                        <Text style={styles.leaderboardRankText}>
                          {submission.isCorrect ? '✅' : '📝'}
                        </Text>
                      </View>
                      
                      <View style={styles.leaderboardInfo}>
                        <Text style={[styles.leaderboardPlayerName, { color: '#ffffff' }]}>
                          {submission.playerName}
                        </Text>
                        <Text style={[styles.leaderboardGuess, { color: theme.colors.textSecondary }]}>
                          Guess: {submission.guess}
                        </Text>
                        <Text style={[styles.leaderboardSimilarity, { color: submission.isCorrect ? '#4CAF50' : '#FFA726' }]}>
                          {submission.similarity?.toFixed(1) || '0.0'}% match
                        </Text>
                      </View>
                      
                      <View 
                        style={[
                          styles.leaderboardColorSwatch,
                          { backgroundColor: submission.guess }
                        ]}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.noChallengeText}>
            No daily challenge available. Check back later!
          </Text>
        )}
      </View>
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <BackgroundWrapper 
        colors={activeBackgroundColors.length >= 1 ? activeBackgroundColors : ['#667eea', '#764ba2']} 
        type={activeBackgroundType} 
        style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingTop: 0 }]}
      >
        <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]} edges={['top', 'left', 'right']}>
          {/* Header - Bubble Island Style */}
          <View style={styles.headerBubbleRow}>
            <IslandCard variant="floating" padding={16} style={styles.headerTitleBubble}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>🛍️ Shop</Text>
            </IslandCard>
            <IslandCard variant="floating" padding={14} style={styles.coinsBubble}>
              <Text style={[styles.coinsText, { color: theme.colors.text }]}>{player.coins} 🪙</Text>
            </IslandCard>
            <IslandButton
              icon="✕"
              size="small"
              variant="danger"
              onPress={onClose}
              style={styles.closeBubble}
            />
          </View>

          {/* Tab Navigation - Scrollable Bubble Islands */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBubbleRow}
            style={styles.tabScrollContainer}
          >
            <TouchableOpacity
              style={styles.tabButtonBubble}
              onPress={() => setActiveTab('backgrounds')}
              activeOpacity={0.8}
            >
              <IslandCard
                variant={activeTab === 'backgrounds' ? "floating" : "elevated"}
                padding={16}
                style={activeTab === 'backgrounds' ? styles.activeTabBubble : styles.tabBubble}
              >
                <Text style={[activeTab === 'backgrounds' ? styles.activeTabText : styles.tabText, { color: theme.colors.text }]}>
                  🎨 Backgrounds
                </Text>
              </IslandCard>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabButtonBubble}
              onPress={() => setActiveTab('icons')}
              activeOpacity={0.8}
            >
              <IslandCard
                variant={activeTab === 'icons' ? "floating" : "elevated"}
                padding={16}
                style={activeTab === 'icons' ? styles.activeTabBubble : styles.tabBubble}
              >
                <Text style={[activeTab === 'icons' ? styles.activeTabText : styles.tabText, { color: theme.colors.text }]}>
                  👤 Profile Icons
                </Text>
              </IslandCard>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabButtonBubble}
              onPress={() => setActiveTab('daily')}
              activeOpacity={0.8}
            >
              <IslandCard
                variant={activeTab === 'daily' ? "floating" : "elevated"}
                padding={16}
                style={activeTab === 'daily' ? styles.activeTabBubble : styles.tabBubble}
              >
                <Text style={[activeTab === 'daily' ? styles.activeTabText : styles.tabText, { color: theme.colors.text }]}>
                  📅 Daily Challenge
                </Text>
              </IslandCard>
            </TouchableOpacity>
          </ScrollView>

          {/* Content */}
          <View style={{ width: '100%', flex: 1 }}>
            {activeTab === 'backgrounds' && renderBackgrounds()}
            {activeTab === 'icons' && renderProfileIcons()}
            {activeTab === 'daily' && renderDailyChallenge()}
          </View>
        </SafeAreaView>
      </BackgroundWrapper>

      {/* Background Preview Modal */}
      <Modal visible={showPreview} animationType="fade" transparent>
        <View style={styles.previewOverlay}>
          <View style={[styles.previewContainer, { backgroundColor: theme.colors.surface }]}>
            {previewBackground && (
              <>
                {previewBackground.type === 'solid' ? (
                  <View
                    style={[
                      styles.previewLarge,
                      { backgroundColor: previewBackground.colors[0] }
                    ]}
                  >
                    <Text style={styles.previewEmoji}>{previewBackground.preview}</Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={previewBackground.colors as [string, string, ...string[]]}
                    style={styles.previewLarge}
                  >
                    <Text style={styles.previewEmoji}>{previewBackground.preview}</Text>
                  </LinearGradient>
                )}
                <Text style={[styles.previewName, { color: theme.colors.text }]}>{previewBackground.name}</Text>
                <Text style={[styles.previewRarity, { color: getRarityColor(previewBackground.rarity) }]}>
                  {previewBackground.rarity.toUpperCase()}
                </Text>
                <TouchableOpacity
                  style={styles.previewCloseButton}
                  onPress={() => setShowPreview(false)}
                >
                  <Text style={[styles.previewCloseText, { color: theme.colors.text }]}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Profile Icon Preview Modal */}
      <Modal visible={showIconPreview} animationType="fade" transparent>
        <View style={styles.previewOverlay}>
          <View style={[styles.previewContainer, { backgroundColor: theme.colors.surface }]}>
            {previewIcon && (
              <>
                <View
                  style={[
                    styles.previewLarge,
                    { backgroundColor: theme.colors.card, justifyContent: 'center', alignItems: 'center' }
                  ]}
                >
                  {getIconImageSource(previewIcon.imagePath) ? (
                    <Image 
                      source={getIconImageSource(previewIcon.imagePath)} 
                      style={{ width: 120, height: 120 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={[styles.previewEmoji, { fontSize: 80 }]}>{previewIcon.imagePath}</Text>
                  )}
                </View>
                <Text style={[styles.previewName, { color: theme.colors.text }]}>{previewIcon.name}</Text>
                <Text style={[styles.previewRarity, { color: getRarityColor(previewIcon.rarity) }]}>
                  {previewIcon.rarity.toUpperCase()}
                </Text>
                {previewIcon.requirement && (
                  <Text style={[styles.requirementText, { color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
                    {previewIcon.requirement.description}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.previewCloseButton}
                  onPress={() => setShowIconPreview(false)}
                >
                  <Text style={[styles.previewCloseText, { color: theme.colors.text }]}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Hex Code Cheat Sheet Modal */}
      <Modal visible={showHexCheatSheet} animationType="fade" transparent>
        <View style={styles.previewOverlay}>
          <View style={[styles.cheatSheetContainer, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.cheatSheetTitle, { color: theme.colors.text }]}>🎨 Hex Color Cheat Sheet</Text>
            
            <ScrollView style={styles.cheatSheetScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.colorSection}>
                <Text style={[styles.cheatSheetSectionTitle, { color: theme.colors.text }]}>Basic Colors</Text>
                <View style={styles.colorRow}>
                  <TouchableOpacity style={[styles.colorChip, { backgroundColor: '#FF0000' }]} onPress={() => { setHexCodeInput('#FF0000'); setShowHexCheatSheet(false); }}>
                    <Text style={styles.colorCode}>Red{'\n'}#FF0000</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.colorChip, { backgroundColor: '#00FF00' }]} onPress={() => { setHexCodeInput('#00FF00'); setShowHexCheatSheet(false); }}>
                    <Text style={styles.colorCode}>Green{'\n'}#00FF00</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.colorChip, { backgroundColor: '#0000FF' }]} onPress={() => { setHexCodeInput('#0000FF'); setShowHexCheatSheet(false); }}>
                    <Text style={styles.colorCode}>Blue{'\n'}#0000FF</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.colorRow}>
                  <TouchableOpacity style={[styles.colorChip, { backgroundColor: '#FFFF00' }]} onPress={() => { setHexCodeInput('#FFFF00'); setShowHexCheatSheet(false); }}>
                    <Text style={[styles.colorCode, { color: '#000' }]}>Yellow{'\n'}#FFFF00</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.colorChip, { backgroundColor: '#FF00FF' }]} onPress={() => { setHexCodeInput('#FF00FF'); setShowHexCheatSheet(false); }}>
                    <Text style={styles.colorCode}>Magenta{'\n'}#FF00FF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.colorChip, { backgroundColor: '#00FFFF' }]} onPress={() => { setHexCodeInput('#00FFFF'); setShowHexCheatSheet(false); }}>
                    <Text style={[styles.colorCode, { color: '#000' }]}>Cyan{'\n'}#00FFFF</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.colorSection}>
                <Text style={[styles.cheatSheetSectionTitle, { color: theme.colors.text }]}>Popular Colors</Text>
                <View style={styles.colorRow}>
                  <TouchableOpacity style={[styles.colorChip, { backgroundColor: '#FF6B6B' }]} onPress={() => { setHexCodeInput('#FF6B6B'); setShowHexCheatSheet(false); }}>
                    <Text style={styles.colorCode}>Coral{'\n'}#FF6B6B</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.colorChip, { backgroundColor: '#4ECDC4' }]} onPress={() => { setHexCodeInput('#4ECDC4'); setShowHexCheatSheet(false); }}>
                    <Text style={styles.colorCode}>Turquoise{'\n'}#4ECDC4</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.colorChip, { backgroundColor: '#45B7D1' }]} onPress={() => { setHexCodeInput('#45B7D1'); setShowHexCheatSheet(false); }}>
                    <Text style={styles.colorCode}>Sky Blue{'\n'}#45B7D1</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.colorRow}>
                  <TouchableOpacity style={[styles.colorChip, { backgroundColor: '#96CEB4' }]} onPress={() => { setHexCodeInput('#96CEB4'); setShowHexCheatSheet(false); }}>
                    <Text style={[styles.colorCode, { color: '#000' }]}>Mint{'\n'}#96CEB4</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.colorChip, { backgroundColor: '#FECA57' }]} onPress={() => { setHexCodeInput('#FECA57'); setShowHexCheatSheet(false); }}>
                    <Text style={[styles.colorCode, { color: '#000' }]}>Orange{'\n'}#FECA57</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.colorChip, { backgroundColor: '#FF9FF3' }]} onPress={() => { setHexCodeInput('#FF9FF3'); setShowHexCheatSheet(false); }}>
                    <Text style={[styles.colorCode, { color: '#000' }]}>Pink{'\n'}#FF9FF3</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.colorSection}>
                <Text style={[styles.cheatSheetSectionTitle, { color: theme.colors.text }]}>Dark Colors</Text>
                <View style={styles.colorRow}>
                  <TouchableOpacity style={[styles.colorChip, { backgroundColor: '#2C3E50' }]} onPress={() => { setHexCodeInput('#2C3E50'); setShowHexCheatSheet(false); }}>
                    <Text style={styles.colorCode}>Navy{'\n'}#2C3E50</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.colorChip, { backgroundColor: '#8B4513' }]} onPress={() => { setHexCodeInput('#8B4513'); setShowHexCheatSheet(false); }}>
                    <Text style={styles.colorCode}>Brown{'\n'}#8B4513</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.colorChip, { backgroundColor: '#800080' }]} onPress={() => { setHexCodeInput('#800080'); setShowHexCheatSheet(false); }}>
                    <Text style={styles.colorCode}>Purple{'\n'}#800080</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
            
            <TouchableOpacity
              style={styles.cheatSheetCloseButton}
              onPress={() => setShowHexCheatSheet(false)}
            >
              <Text style={styles.cheatSheetCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
      compactGrid: {
        paddingHorizontal: 8,
        paddingTop: 6,
        paddingBottom: 12,
      },
      compactGridRow: {
        justifyContent: 'space-between',
        marginBottom: 8,
      },
      horizontalGrid: {
        paddingHorizontal: 8,
        paddingVertical: 6,
      },
      horizontalScroll: {
        marginBottom: 12,
      },
    headerBubbleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
      marginTop: 40,
      marginBottom: 18,
    },
    headerTitleBubble: {
      minWidth: 120,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 6,
    },
    coinsBubble: {
      minWidth: 90,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 6,
    },
    closeBubble: {
      marginLeft: 10,
      marginRight: 0,
      alignSelf: 'center',
    },
    tabScrollContainer: {
      flexGrow: 0,
      marginBottom: 10,
    },
    tabBubbleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      gap: 16,
    },
    tabButtonBubble: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabBubble: {
      minWidth: 120,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.10,
      shadowRadius: 6,
      elevation: 4,
    },
    activeTabBubble: {
      minWidth: 120,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 8,
    },
  container: {
    flex: 1,  },
  safeArea: {
    flex: 1,  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  coinsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,  },
  coinsText: {
    fontSize: 14,
    fontWeight: 'bold',  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',  },
  activeTabButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    padding: 20,  },
  sectionHeader: {
    marginBottom: 15,  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backgroundGrid: {
    paddingBottom: 20,  },
  row: {
    justifyContent: 'space-between',  },
  backgroundItem: {
    width: (width - 60) / 2,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,  },
  selectedBackground: {
    borderColor: '#4CAF50',
    borderWidth: 3,  },
  backgroundPreview: {
    height: 80,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',  },
  backgroundEmoji: {
    fontSize: 30,  },
  activeIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,  },
  backgroundInfo: {
    alignItems: 'center',  },
  backgroundName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,  },
  lockedText: {
    opacity: 0.6,  },
  backgroundRarity: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,  },
  unlockInfo: {
    alignItems: 'center',
    width: '100%',  },
  purchaseButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 5,  },
  purchaseButtonDisabled: {
    backgroundColor: '#ccc',  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',  },
  purchaseButtonTextDisabled: {
    color: '#999',  },
  requirementText: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 5,  },
  card: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  cardSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,  },
  colorPreview: {
    alignItems: 'center',
    marginBottom: 20,  },
  colorSwatch: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,  },
  colorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',  },
  inputContainer: {
    marginBottom: 20,  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',  },
  tipButton: {
    marginLeft: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',  },
  tipButtonText: {
    fontSize: 16,  },
  hexInput: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'white',  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',  },
  submitButtonTextDisabled: {
    color: '#999',  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
  },
  completedChallenge: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  completedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  completedSubtext: {
    fontSize: 14,
    marginBottom: 10,
    opacity: 0.7,
  },
  nextChallengeText: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.6,
  },
  noChallengeText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',  },
  previewContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    margin: 20,  },
  previewLarge: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,  },
  previewEmoji: {
    fontSize: 50,  },
  previewName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  previewRarity: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,  },
  previewCloseButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,  },
  previewCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',  },
  cheatSheetContainer: {
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxHeight: '80%',  },
  cheatSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,  },
  cheatSheetScroll: {
    maxHeight: 400,  },
  colorSection: {
    marginBottom: 20,  },
  cheatSheetSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  colorChip: {
    width: 80,
    height: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',  },
  colorCode: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,  },
  cheatSheetCloseButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 10,  },
  cheatSheetCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',  },
  leaderboardSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  leaderboardSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  leaderboardScroll: {
    maxHeight: 300,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  leaderboardRank: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderboardRankText: {
    fontSize: 24,
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  leaderboardPlayerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  leaderboardGuess: {
    fontSize: 13,
    marginBottom: 2,
  },
  leaderboardSimilarity: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  leaderboardColorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categorySection: {
    marginBottom: 15,  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,  },
  categoryEmoji: {
    fontSize: 20,
    marginRight: 10,  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,  },
  categoryCount: {
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 10,
  },
  categoryToggle: {
    fontSize: 16,
    color: '#666',
  },
  headerTitleCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinsIslandCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButtonWrapper: {
    flex: 1,
    marginHorizontal: 5,
    fontWeight: 'bold',  },
  categoryContent: {
    marginLeft: 10,  },
});
