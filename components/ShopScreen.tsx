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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Background, DailyChallenge, RARITY_COLORS } from '../types/Shop';
import { PlayerProfile } from '../types/Player';
import { ShopService } from '../services/ShopService';
import { useTheme, getContrastColor } from '../contexts/ThemeContext';

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

type TabType = 'backgrounds' | 'daily';

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

export default function ShopScreen({ visible, onClose, player, onPlayerUpdated, activeBackgroundColors, activeBackgroundType, activeAnimationType, onBackgroundChanged }: Props) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('backgrounds');
  const [backgrounds, setBackgrounds] = useState<{ [category: string]: { unlocked: Background[]; locked: Background[] } }>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Blue'])); // Default expand Blue category
  const [selectedBackground, setSelectedBackground] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [hexCodeInput, setHexCodeInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewBackground, setPreviewBackground] = useState<Background | null>(null);
  const [showHexCheatSheet, setShowHexCheatSheet] = useState(false);

  useEffect(() => {
    if (visible) {
      loadShopData();
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

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
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

  const handleDailyChallengeSubmit = async () => {
    if (!hexCodeInput.trim()) {
      Alert.alert('Error', 'Please enter a hex code');
      return;
    }
    
    setLoading(true);
    try {
      const result = await ShopService.submitDailyChallenge(hexCodeInput);
      
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

  const getRarityColor = (rarity: string) => {
    return RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] || '#95a5a6';
  };

  const renderBackgroundItem = ({ item: background }: { item: Background }) => {
    const isSelected = selectedBackground === background.id;
    const isUnlocked = background.isUnlocked;
    
    return (
      <TouchableOpacity
        style={[
          styles.backgroundItem,
          { backgroundColor: theme.colors.card },
          isSelected && styles.selectedBackground,
          { borderColor: getRarityColor(background.rarity) },
        ]}
        onPress={() => isUnlocked ? handleSetActive(background.id) : showBackgroundPreview(background)}
        disabled={loading}
      >
        {background.type === 'solid' ? (
          <View
            style={[
              styles.backgroundPreview,
              { backgroundColor: background.colors[0] }
            ]}
          >
            <Text style={styles.backgroundEmoji}>{background.preview}</Text>
            {isSelected && <Text style={styles.activeIndicator}>✓</Text>}
            {!isUnlocked && <View style={styles.lockedOverlay} />}
          </View>
        ) : (
          <LinearGradient
            colors={background.colors as [string, string, ...string[]]}
            style={styles.backgroundPreview}
          >
            <Text style={styles.backgroundEmoji}>{background.preview}</Text>
            {isSelected && <Text style={styles.activeIndicator}>✓</Text>}
            {!isUnlocked && <View style={styles.lockedOverlay} />}
          </LinearGradient>
        )}
        
        <View style={styles.backgroundInfo}>
          <Text style={[styles.backgroundName, { color: theme.colors.textSecondary }, !isUnlocked && styles.lockedText]}>
            {background.name}
          </Text>
          <Text style={[styles.backgroundRarity, { color: getRarityColor(background.rarity) }]}>
            {background.rarity.toUpperCase()}
          </Text>
          
          {!isUnlocked && (
            <View style={styles.unlockInfo}>
              {background.unlockType === 'purchase' && background.price && (
                <TouchableOpacity
                  style={[
                    styles.purchaseButton,
                    player.coins < background.price && styles.purchaseButtonDisabled,
                  ]}
                  onPress={() => handlePurchase(background)}
                  disabled={loading || player.coins < background.price}
                >
                  <Text style={[
                    styles.purchaseButtonText,
                    player.coins < background.price && styles.purchaseButtonTextDisabled,
                  ]}>
                    {background.price} 🪙
                  </Text>
                </TouchableOpacity>
              )}
              
              {background.unlockType === 'achievement' && background.requirement && (
                <Text style={styles.requirementText}>
                  {background.requirement.description}
                </Text>
              )}
              
              {background.unlockType === 'challenge' && background.requirement && (
                <Text style={styles.requirementText}>
                  {background.requirement.description}
                </Text>
              )}
              
              {background.unlockType === 'daily' && (
                <Text style={styles.requirementText}>
                  Daily Challenge Reward
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderBackgrounds = () => {
    const sortedCategories = Object.keys(backgrounds).sort();
    
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {sortedCategories.map(category => {
          const categoryData = backgrounds[category];
          const totalUnlocked = categoryData.unlocked.length;
          const totalLocked = categoryData.locked.length;
          const isExpanded = expandedCategories.has(category);
          
          return (
            <View key={category} style={styles.categorySection}>
              <TouchableOpacity 
                style={[styles.categoryHeader, { backgroundColor: theme.colors.card }]}
                onPress={() => toggleCategory(category)}
              >
                <View style={styles.categoryTitleRow}>
                  <Text style={styles.categoryEmoji}>{getCategoryEmoji(category)}</Text>
                  <Text style={[styles.categoryTitle, { color: '#ffffff' }]}>{category}</Text>
                  <Text style={[styles.categoryCount, { color: theme.colors.textTertiary, backgroundColor: theme.colors.surface }]}>
                    {totalUnlocked}/{totalUnlocked + totalLocked}
                  </Text>
                </View>
                <Text style={[styles.categoryToggle, { color: theme.colors.textSecondary }]}>
                  {isExpanded ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>
              
              {isExpanded && (
                <View style={styles.categoryContent}>
                  {totalUnlocked > 0 && (
                    <>
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: '#ffffff' }]}>🔓 Unlocked ({totalUnlocked})</Text>
                      </View>
                      
                      <FlatList
                        data={categoryData.unlocked}
                        renderItem={renderBackgroundItem}
                        keyExtractor={(item) => item.id}
                        numColumns={2}
                        columnWrapperStyle={styles.row}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.backgroundGrid}
                        scrollEnabled={false}
                      />
                    </>
                  )}
                  
                  {totalLocked > 0 && (
                    <>
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: '#ffffff' }]}>🔒 Locked ({totalLocked})</Text>
                      </View>
                      
                      <FlatList
                        data={categoryData.locked}
                        renderItem={renderBackgroundItem}
                        keyExtractor={(item) => item.id}
                        numColumns={2}
                        columnWrapperStyle={styles.row}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.backgroundGrid}
                        scrollEnabled={false}
                      />
                    </>
                  )}
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
        <Text style={[styles.cardTitle, { color: '#ffffff' }]}>🎨 Daily Color Challenge</Text>
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
                    <Text style={[styles.inputLabel, { color: '#ffffff' }]}>Enter Hex Code:</Text>
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
                    onChangeText={setHexCodeInput}
                    placeholder="#FF6B6B"
                    placeholderTextColor={theme.colors.placeholderText}
                    maxLength={7}
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
                  💡 Format: #RRGGBB (like #FF6B6B). You get one guess per day - make it count!
                </Text>
              </>
            ) : (
              <View style={styles.completedChallenge}>
                <Text style={styles.completedText}>✅ Today's challenge completed!</Text>
                <Text style={styles.completedSubtext}>
                  You've made your guess for today
                </Text>
                <Text style={styles.nextChallengeText}>
                  Come back in 24 hours for a new color challenge!
                </Text>
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
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: getContrastColor(activeBackgroundType, theme) }]}>🛍️ Shop</Text>
            <View style={styles.coinsContainer}>
              <Text style={[styles.coinsText, { color: getContrastColor(activeBackgroundType, theme) }]}>{player.coins} 🪙</Text>
            </View>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton, 
                { backgroundColor: activeTab === 'backgrounds' ? theme.colors.accent : theme.colors.card },
                activeTab === 'backgrounds' && styles.activeTabButton
              ]}
              onPress={() => setActiveTab('backgrounds')}
            >
              <Text style={[
                styles.tabText, 
                { color: activeTab === 'backgrounds' ? '#ffffff' : theme.colors.textSecondary },
                activeTab === 'backgrounds' && styles.activeTabText
              ]}>
                🎨 Backgrounds
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton, 
                { backgroundColor: activeTab === 'daily' ? theme.colors.accent : theme.colors.card },
                activeTab === 'daily' && styles.activeTabButton
              ]}
              onPress={() => setActiveTab('daily')}
            >
              <Text style={[
                styles.tabText, 
                { color: activeTab === 'daily' ? '#ffffff' : theme.colors.textSecondary },
                activeTab === 'daily' && styles.activeTabText
              ]}>
                📅 Daily Challenge
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {activeTab === 'backgrounds' ? renderBackgrounds() : renderDailyChallenge()}
        </SafeAreaView>
      </BackgroundWrapper>

      {/* Background Preview Modal */}
      <Modal visible={showPreview} animationType="fade" transparent>
        <View style={styles.previewOverlay}>
          <View style={[styles.previewContainer, { backgroundColor: theme.colors.card }]}>
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
                <Text style={[styles.previewName, { color: '#ffffff' }]}>{previewBackground.name}</Text>
                <Text style={[styles.previewRarity, { color: getRarityColor(previewBackground.rarity) }]}>
                  {previewBackground.rarity.toUpperCase()}
                </Text>
                <TouchableOpacity
                  style={styles.previewCloseButton}
                  onPress={() => setShowPreview(false)}
                >
                  <Text style={[styles.previewCloseText, { color: '#ffffff' }]}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Hex Code Cheat Sheet Modal */}
      <Modal visible={showHexCheatSheet} animationType="fade" transparent>
        <View style={styles.previewOverlay}>
          <View style={styles.cheatSheetContainer}>
            <Text style={styles.cheatSheetTitle}>🎨 Hex Color Cheat Sheet</Text>
            
            <ScrollView style={styles.cheatSheetScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.colorSection}>
                <Text style={styles.cheatSheetSectionTitle}>Basic Colors</Text>
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
                <Text style={styles.cheatSheetSectionTitle}>Popular Colors</Text>
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
                <Text style={styles.cheatSheetSectionTitle}>Dark Colors</Text>
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
    color: 'white',  },
  coinsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,  },
  coinsText: {
    color: 'white',
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
    alignItems: 'center', color: 'black',  },
  activeTabButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',  },
  activeTabText: {
    color: 'black',  },
  tabContent: {
    flex: 1,
    padding: 20,  },
  sectionHeader: {
    marginBottom: 15, color: 'black',  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',  },
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
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,  },
  lockedText: {
    color: '#999',  },
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
    color: '#666',
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
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
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
    fontWeight: '600',
    color: '#333',  },
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
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',  },
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
    color: '#666',
    marginBottom: 10,
  },
  nextChallengeText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',  },
  noChallengeText: {
    fontSize: 14,
    color: '#666',
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
    color: '#333',
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
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxHeight: '80%',  },
  cheatSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,  },
  cheatSheetScroll: {
    maxHeight: 400,  },
  colorSection: {
    marginBottom: 20,  },
  cheatSheetSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
    fontWeight: 'bold',  },
  categoryContent: {
    marginLeft: 10,  },
});
