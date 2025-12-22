import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Image,
} from 'react-native';
import { NeumorphicButton } from './NeumorphicButton';
import { NeumorphicCard } from './NeumorphicCard';
import { NeumorphicInput } from './NeumorphicInput';
import { useNeumorphicColors, spacing, typography, borderRadius } from '../../styles/neumorphicTheme';
import { useTheme } from '../../contexts/ThemeContext';
import { Background, ProfileIcon, DailyChallenge, DailyChallengeSubmission, RARITY_COLORS } from '../../types/Shop';
import { PlayerProfile } from '../../types/Player';
import { ShopService } from '../../services/ShopService';
import { LinearGradient } from 'expo-linear-gradient';

interface NeumorphicShopScreenProps {
  player: PlayerProfile;
  onPlayerUpdated: (player: PlayerProfile) => void;
  onClose: () => void;
  onBackgroundChanged?: () => void;
}

type TabType = 'backgrounds' | 'icons' | 'daily';

// Static image mapping for profile icons
const PROFILE_ICON_IMAGES: { [key: string]: any } = {
  'Alien/AlienwHaloWhite.png': require('../../assets/Alien/AlienwHaloWhite.png'),
  'Alien/AlienwHaloPink.png': require('../../assets/Alien/AlienwHaloPink.png'),
  'Alien/AlienwHaloBlack.png': require('../../assets/Alien/AlienwHaloBlack.png'),
  'Alien/AlienBlackGoldHalo.png': require('../../assets/Alien/AlienBlackGoldHalo.png'),
  'InChangeWeTrustPink.png': require('../../assets/InChangeWeTrustPink.png'),
  'InChangeWeTrustPinkfilled.png': require('../../assets/InChangeWeTrustPinkfilled.png'),
  'InChangeWeTrust.png': require('../../assets/InChangeWeTrust.png'),
};

export const NeumorphicShopScreen: React.FC<NeumorphicShopScreenProps> = ({
  player,
  onPlayerUpdated,
  onClose,
  onBackgroundChanged,
}) => {
  const neumorphicColors = useNeumorphicColors();
  const [activeTab, setActiveTab] = useState<TabType>('backgrounds');
  const [backgrounds, setBackgrounds] = useState<{ [category: string]: { unlocked: Background[]; locked: Background[] } }>({});
  const [profileIcons, setProfileIcons] = useState<{ [category: string]: { unlocked: ProfileIcon[]; locked: ProfileIcon[] } }>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Blue']));
  const [expandedIconCategories, setExpandedIconCategories] = useState<Set<string>>(new Set(['Aliens']));
  const [selectedBackground, setSelectedBackground] = useState<string>('');
  const [selectedIcon, setSelectedIcon] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [dailyChallenge, setDailyChallenge] = useState<(DailyChallenge & { submissions?: DailyChallengeSubmission[] }) | null>(null);
  const [hexCodeInput, setHexCodeInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewBackground, setPreviewBackground] = useState<Background | null>(null);
  const [showIconPreview, setShowIconPreview] = useState(false);
  const [previewIcon, setPreviewIcon] = useState<ProfileIcon | null>(null);
  const [customHex1, setCustomHex1] = useState<string>('#FF6B6B');
  const [customHex2, setCustomHex2] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const themeCtx = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
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
    coinsCard: {
      minWidth: 80,
    },
    coinsText: {
      ...typography.body,
      color: neumorphicColors.text.primary,
      fontWeight: '600',
      textAlign: 'center',
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
      ...typography.caption,
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
    categorySection: {
      marginBottom: spacing.lg,
    },
    categoryHeader: {
      marginBottom: spacing.sm,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    categoryEmoji: {
      fontSize: 20,
      marginRight: spacing.sm,
    },
    categoryTitle: {
      ...typography.h3,
      color: neumorphicColors.text.primary,
      flex: 1,
    },
    categoryCount: {
      backgroundColor: neumorphicColors.background.dark,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
      marginRight: spacing.sm,
    },
    categoryCountText: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
    },
    categoryToggle: {
      ...typography.body,
      color: neumorphicColors.text.secondary,
    },
    itemsList: {
      paddingVertical: spacing.sm,
      gap: spacing.md,
    },
    itemWrapper: {
      width: 100,
    },
    itemCard: {
      alignItems: 'center',
    },
    itemPreview: {
      width: 80,
      height: 80,
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
      position: 'relative',
    },
    itemEmoji: {
      fontSize: 32,
    },
    activeIndicator: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: neumorphicColors.success.main,
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
      width: 20,
      height: 20,
      borderRadius: 10,
      textAlign: 'center',
      lineHeight: 20,
    },
    lockedOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: borderRadius.md,
    },
    itemName: {
      ...typography.caption,
      color: neumorphicColors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    lockedText: {
      opacity: 0.5,
    },
    itemRarity: {
      ...typography.caption,
      fontSize: 10,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    purchaseButton: {
      marginTop: spacing.xs,
    },
    cardTitle: {
      ...typography.h2,
      color: neumorphicColors.text.primary,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    cardSubtitle: {
      ...typography.body,
      color: neumorphicColors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    colorPreview: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    colorSwatch: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: spacing.md,
      borderWidth: 3,
      borderColor: neumorphicColors.background.light,
    },
    colorLabel: {
      ...typography.body,
      color: neumorphicColors.text.primary,
      fontWeight: '600',
    },
    submitButton: {
      marginTop: spacing.md,
    },
    completedChallenge: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    completedText: {
      ...typography.h3,
      color: neumorphicColors.success.main,
      fontWeight: 'bold',
      marginBottom: spacing.sm,
    },
    completedSubtext: {
      ...typography.body,
      color: neumorphicColors.text.secondary,
      textAlign: 'center',
    },
    noChallengeText: {
      ...typography.body,
      color: neumorphicColors.text.disabled,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalCard: {
      width: '90%',
      maxWidth: 400,
      alignItems: 'center',
    },
    previewLarge: {
      width: 150,
      height: 150,
      borderRadius: 75,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    previewEmoji: {
      fontSize: 60,
    },
    previewName: {
      ...typography.h2,
      color: neumorphicColors.text.primary,
      fontWeight: 'bold',
      marginBottom: spacing.lg,
    },
  });

  // Component: list saved presets and apply
  const SavedThemeList: React.FC<{ onApplied?: () => void }> = ({ onApplied }) => {
    const { presets, applyThemePreset } = useTheme();

    if (!presets || presets.length === 0) {
      return <Text style={[styles.cardSubtitle, { marginTop: spacing.sm }]}>No saved themes yet.</Text>;
    }

    return (
      <View>
        {presets.map((p: any) => (
          <NeumorphicCard key={p.id} variant="raised" padding={spacing.sm} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[typography.body, { color: neumorphicColors.text.primary }]}>{p.name}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <NeumorphicButton
                  title="Apply"
                  onPress={async () => { try { await applyThemePreset(p.id); Alert.alert('Theme applied'); onApplied?.(); } catch (e) { Alert.alert('Error', 'Failed to apply theme'); } }}
                  size="small"
                />
              </View>
            </View>
          </NeumorphicCard>
        ))}
      </View>
    );
  };

  useEffect(() => {
    loadShopData();
    loadProfileIcons();
    loadDailyChallenge();
  }, []);

  // When previewing a background, use its colors/type for the full-screen modal background
  const wrapperColors = showPreview && previewBackground ? previewBackground.colors : undefined;
  const wrapperType = showPreview && previewBackground ? previewBackground.type : undefined;

  const getIconImageSource = (imagePath: string) => {
    return PROFILE_ICON_IMAGES[imagePath] || null;
  };

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

  const loadDailyChallenge = async () => {
    try {
      const challenge = await ShopService.checkDailyChallenge();
      setDailyChallenge(challenge);
    } catch (error) {
      console.error('Error loading daily challenge:', error);
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

  const getRarityColor = (rarity: string) => {
    return RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] || '#95a5a6';
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

                const updatedPlayer = await require('../../services/PlayerStorageService').PlayerStorageService.loadPlayerProfile();
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
            }
          },
        },
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

                const updatedPlayer = await require('../../services/PlayerStorageService').PlayerStorageService.loadPlayerProfile();
                if (updatedPlayer) {
                  onPlayerUpdated(updatedPlayer);
                }

                Alert.alert(
                  'Purchase Successful!',
                  `${result.message}\n\nWould you like to equip "${icon.name}" now?`,
                  [
                    { text: 'Not Now', style: 'cancel' },
                    { text: 'Equip Now', onPress: async () => await handleSetActiveIcon(icon.id) },
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

        const updatedPlayer = await require('../../services/PlayerStorageService').PlayerStorageService.loadPlayerProfile();
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
      const formattedHex = `#${hexCodeInput.trim()}`;
      const result = await ShopService.submitDailyChallenge(formattedHex);

      if (result.success) {
        const title = result.isCorrect ? 'Perfect Match!' : 'New Color Unlocked!';
        Alert.alert(title, result.message);

        setHexCodeInput('');
        await loadDailyChallenge();
        await loadShopData();

        setTimeout(() => setActiveTab('backgrounds'), 1500);
      } else {
        Alert.alert('Invalid Input', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit challenge');
    } finally {
      setLoading(false);
    }
  };

  const renderBackgroundItem = ({ item: background }: { item: Background }) => {
    const isSelected = selectedBackground === background.id;
    const isUnlocked = background.isUnlocked;

    return (
      <TouchableOpacity
        onPress={() => {
          if (isUnlocked) {
            handleSetActive(background.id);
          } else {
            setPreviewBackground(background);
            setShowPreview(true);
          }
        }}
        disabled={loading}
        style={styles.itemWrapper}
      >
        <NeumorphicCard
          variant={isSelected ? 'floating' : 'raised'}
          padding={spacing.sm}
          style={styles.itemCard}
        >
          {background.type === 'solid' ? (
            <View style={[styles.itemPreview, { backgroundColor: background.colors[0] }]}>
              <Text style={styles.itemEmoji}>{background.preview}</Text>
              {isSelected && <Text style={styles.activeIndicator}>✓</Text>}
              {!isUnlocked && <View style={styles.lockedOverlay} />}
            </View>
          ) : (
            <LinearGradient
              colors={background.colors as [string, string, ...string[]]}
              style={styles.itemPreview}
            >
              <Text style={styles.itemEmoji}>{background.preview}</Text>
              {isSelected && <Text style={styles.activeIndicator}>✓</Text>}
              {!isUnlocked && <View style={styles.lockedOverlay} />}
            </LinearGradient>
          )}

          <Text style={[styles.itemName, !isUnlocked && styles.lockedText]} numberOfLines={1}>
            {background.name}
          </Text>

          {background.rarity && (
            <Text style={[styles.itemRarity, { color: getRarityColor(background.rarity) }]}>
              {background.rarity.toUpperCase()}
            </Text>
          )}

          {!isUnlocked && background.unlockType === 'purchase' && background.price && (
            <NeumorphicButton
              title={`${background.price} 🪙`}
              onPress={() => handlePurchase(background)}
              variant={player.coins >= background.price ? 'success' : 'error'}
              size="small"
              disabled={loading || player.coins < background.price}
              style={styles.purchaseButton}
            />
          )}
        </NeumorphicCard>
      </TouchableOpacity>
    );
  };

  const renderProfileIconItem = ({ item: icon }: { item: ProfileIcon }) => {
    const isSelected = selectedIcon === icon.id;
    const isUnlocked = icon.isUnlocked;
    const isImageFile = icon.imagePath.endsWith('.png') || icon.imagePath.endsWith('.jpg');

    return (
      <TouchableOpacity
        onPress={() => {
          if (isUnlocked) {
            handleSetActiveIcon(icon.id);
          } else {
            setPreviewIcon(icon);
            setShowIconPreview(true);
          }
        }}
        disabled={loading}
        style={styles.itemWrapper}
      >
        <NeumorphicCard
          variant={isSelected ? 'floating' : 'raised'}
          padding={spacing.sm}
          style={styles.itemCard}
        >
          <View style={[styles.itemPreview, { backgroundColor: neumorphicColors.background.light }]}>
            {isImageFile && getIconImageSource(icon.imagePath) ? (
              <Image
                source={getIconImageSource(icon.imagePath)}
                style={{ width: 35, height: 35 }}
                resizeMode="contain"
              />
            ) : (
              <Text style={[styles.itemEmoji, { fontSize: 28 }]}>{icon.imagePath}</Text>
            )}
            {isSelected && <Text style={styles.activeIndicator}>✓</Text>}
            {!isUnlocked && <View style={styles.lockedOverlay} />}
          </View>

          <Text style={[styles.itemName, !isUnlocked && styles.lockedText]} numberOfLines={1}>
            {icon.name}
          </Text>

          {icon.rarity && (
            <Text style={[styles.itemRarity, { color: getRarityColor(icon.rarity) }]}>
              {icon.rarity.toUpperCase()}
            </Text>
          )}

          {!isUnlocked && icon.unlockType === 'purchase' && icon.price && (
            <NeumorphicButton
              title={`${icon.price} 🪙`}
              onPress={() => handlePurchaseIcon(icon)}
              variant={player.coins >= icon.price ? 'success' : 'error'}
              size="small"
              disabled={loading || player.coins < icon.price}
              style={styles.purchaseButton}
            />
          )}
        </NeumorphicCard>
      </TouchableOpacity>
    );
  };

  const renderBackgrounds = () => {
    // Render an inline color picker for custom backgrounds
    const presetColors = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FECA57','#FF9FF3','#54A0FF','#5F27CD','#00D2D3','#FF9F43'];

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <NeumorphicCard variant="raised" padding={spacing.lg} style={{ marginBottom: spacing.md }}>
          <Text style={styles.cardTitle}>Pick a Custom Background</Text>
          <Text style={styles.cardSubtitle}>Choose a solid color or a two-color gradient. Apply to set it as your background.</Text>

          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.itemName}>Preset Colors</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm, gap: spacing.sm }}>
              {presetColors.map(c => (
                <TouchableOpacity key={c} onPress={() => { setCustomHex1(c); setCustomHex2(''); }} style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: c, marginRight: 8, marginBottom: 8, borderWidth: customHex1 === c ? 3 : 0, borderColor: neumorphicColors.primary.main }} />
              ))}
            </View>

            <View style={{ height: spacing.md }} />

            <Text style={styles.itemName}>Custom Hex</Text>
            <NeumorphicInput label="Primary Color (#RRGGBB)" placeholder="FF6B6B" value={customHex1} onChangeText={(v) => setCustomHex1(v.startsWith('#') ? v : v.toUpperCase())} />
            <NeumorphicInput label="Secondary Color (optional)" placeholder="Leave empty for solid" value={customHex2} onChangeText={(v) => setCustomHex2(v.startsWith('#') ? v : v.toUpperCase())} />

            <View style={{ height: spacing.md }} />
            <Text style={styles.itemName}>Preview</Text>
            <View style={{ height: 120, borderRadius: borderRadius.md, overflow: 'hidden', marginTop: spacing.sm }}>
              {customHex2 ? (
                <LinearGradient colors={[customHex1 || '#ffffff', customHex2 || '#ffffff']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Gradient Preview</Text>
                </LinearGradient>
              ) : (
                <View style={{ flex: 1, backgroundColor: customHex1 || '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Solid Preview</Text>
                </View>
              )}
            </View>

            <View style={{ height: spacing.md }} />
            <NeumorphicButton
              title="Apply Background"
              onPress={async () => {
                const colorsToUse = customHex2 ? [customHex1.startsWith('#') ? customHex1 : `#${customHex1}`, customHex2.startsWith('#') ? customHex2 : `#${customHex2}`] : [customHex1.startsWith('#') ? customHex1 : `#${customHex1}`];
                const type = customHex2 ? 'gradient' : 'solid';
                setLoading(true);
                try {
                  const newId = await ShopService.addCustomBackground(colorsToUse, type as any, 'Custom Background');
                  if (newId) {
                    setSelectedBackground(newId);
                    Alert.alert('Background Applied', 'Your custom background has been applied.');
                    onBackgroundChanged?.();
                  } else {
                    Alert.alert('Error', 'Failed to apply background');
                  }
                } catch (e) {
                  Alert.alert('Error', 'Failed to apply background');
                } finally {
                  setLoading(false);
                }
              }}
              fullWidth
            />

            <View style={{ height: spacing.sm }} />
            <NeumorphicButton
              title="Save as Theme"
              onPress={() => setShowSaveModal(true)}
              variant="primary"
              fullWidth
            />

            <View style={{ height: spacing.md }} />
            <Text style={styles.cardSubtitle}>Saved Themes</Text>
            <View style={{ marginTop: spacing.sm }}>
              <SavedThemeList onApplied={() => { onBackgroundChanged?.(); }} />
            </View>
          </View>
        </NeumorphicCard>
      </ScrollView>
    );
  };

  const renderProfileIcons = () => {
    const sortedCategories = Object.keys(profileIcons).sort();

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {sortedCategories.map(category => {
          const categoryData = profileIcons[category];
          const totalUnlocked = categoryData.unlocked.length;
          const totalLocked = categoryData.locked.length;
          const isExpanded = expandedIconCategories.has(category);

          return (
            <View key={category} style={styles.categorySection}>
              <TouchableOpacity onPress={() => toggleIconCategory(category)}>
                <NeumorphicCard variant="raised" padding={spacing.md} style={styles.categoryHeader}>
                  <View style={styles.categoryRow}>
                    <Text style={styles.categoryEmoji}>
                      {category === 'Alphabet' ? '🔤' : category === 'Logo' ? '🎨' : category === 'Aliens' ? '👽' : '⭐'}
                    </Text>
                    <Text style={styles.categoryTitle}>{category}</Text>
                    <View style={styles.categoryCount}>
                      <Text style={styles.categoryCountText}>
                        {totalUnlocked}/{totalUnlocked + totalLocked}
                      </Text>
                    </View>
                    <Text style={styles.categoryToggle}>{isExpanded ? '▼' : '▶'}</Text>
                  </View>
                </NeumorphicCard>
              </TouchableOpacity>

              {isExpanded && (
                <FlatList
                  data={[...categoryData.unlocked, ...categoryData.locked]}
                  renderItem={renderProfileIconItem}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.itemsList}
                />
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderDailyChallenge = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <NeumorphicCard variant="raised" padding={spacing.lg}>
        <Text style={styles.cardTitle}>Daily Color Challenge</Text>
        <Text style={styles.cardSubtitle}>
          One guess per day! Your color gets unlocked, plus bonus for exact match!
        </Text>

        {dailyChallenge && !dailyChallenge.isCompleted ? (
          <>
            <View style={styles.colorPreview}>
              <View style={[styles.colorSwatch, { backgroundColor: dailyChallenge.hexCode }]} />
              <Text style={styles.colorLabel}>Match this color!</Text>
            </View>

            <NeumorphicInput
              label="Enter Hex Code (without #)"
              placeholder="FF6B6B"
              value={hexCodeInput}
              onChangeText={(text) => setHexCodeInput(text.replace('#', ''))}
              maxLength={6}
            />

            <NeumorphicButton
              title={loading ? 'Checking...' : 'Submit Guess'}
              onPress={handleDailyChallengeSubmit}
              variant="success"
              size="large"
              fullWidth
              disabled={!hexCodeInput.trim() || loading}
              style={styles.submitButton}
            />
          </>
        ) : dailyChallenge?.isCompleted ? (
          <View style={styles.completedChallenge}>
            <Text style={styles.completedText}>Today's challenge completed!</Text>
            <Text style={styles.completedSubtext}>
              Come back in 24 hours for a new color challenge!
            </Text>
          </View>
        ) : (
          <Text style={styles.noChallengeText}>
            No daily challenge available. Check back later!
          </Text>
        )}
      </NeumorphicCard>
    </ScrollView>
  );

  const renderContent = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <NeumorphicButton icon="✕" title="" size="small" variant="error" onPress={onClose} />
        <Text style={styles.headerTitle}>Shop</Text>
        <NeumorphicCard variant="inset" padding={spacing.sm} style={styles.coinsCard}>
          <Text style={styles.coinsText}>{player.coins} 🪙</Text>
        </NeumorphicCard>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['backgrounds', 'icons', 'daily'] as TabType[]).map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabButton}>
            <NeumorphicCard
              variant={activeTab === tab ? 'inset' : 'raised'}
              padding={spacing.sm}
              style={styles.tab}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'backgrounds' ? '🎨 Backgrounds' : tab === 'icons' ? '👤 Icons' : '📅 Daily'}
              </Text>
            </NeumorphicCard>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'backgrounds' && renderBackgrounds()}
      {activeTab === 'icons' && renderProfileIcons()}
      {activeTab === 'daily' && renderDailyChallenge()}

      {/* Preview Modals */}
      <Modal visible={showPreview} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <NeumorphicCard variant="floating" padding={spacing.xl} style={styles.modalCard}>
            {previewBackground && (
              <>
                {previewBackground.type === 'solid' ? (
                  <View style={[styles.previewLarge, { backgroundColor: previewBackground.colors[0] }]}>
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
                <Text style={styles.previewName}>{previewBackground.name}</Text>
                <NeumorphicButton
                  title="Close"
                  onPress={() => setShowPreview(false)}
                  variant="primary"
                  size="medium"
                />
              </>
            )}
          </NeumorphicCard>
        </View>
      </Modal>

      {/* Save Theme Modal */}
      <Modal visible={showSaveModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <NeumorphicCard variant="floating" padding={spacing.lg} style={styles.modalCard}>
            <Text style={styles.previewName}>Save Theme</Text>
            <NeumorphicInput label="Theme Name" placeholder="My Theme" value={newPresetName} onChangeText={setNewPresetName} />
            <View style={{ height: spacing.md }} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <NeumorphicButton
                title="Cancel"
                onPress={() => { setShowSaveModal(false); setNewPresetName(''); }}
                variant="error"
                size="small"
              />
              <NeumorphicButton
                title={saveLoading ? 'Saving...' : 'Save'}
                onPress={async () => {
                  if (!newPresetName.trim()) { Alert.alert('Name required', 'Please provide a name for your theme.'); return; }
                  setSaveLoading(true);
                  try {
                    await themeCtx.saveThemePreset(newPresetName.trim());
                    Alert.alert('Saved', 'Theme saved successfully');
                    setShowSaveModal(false);
                    setNewPresetName('');
                  } catch (e) {
                    Alert.alert('Error', 'Failed to save theme');
                  } finally {
                    setSaveLoading(false);
                  }
                }}
                variant="primary"
                size="small"
              />
            </View>
          </NeumorphicCard>
        </View>
      </Modal>

      <Modal visible={showIconPreview} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <NeumorphicCard variant="floating" padding={spacing.xl} style={styles.modalCard}>
            {previewIcon && (
              <>
                <View style={[styles.previewLarge, { backgroundColor: neumorphicColors.background.light }]}>
                  {getIconImageSource(previewIcon.imagePath) ? (
                    <Image source={getIconImageSource(previewIcon.imagePath)} style={{ width: 80, height: 80 }} />
                  ) : (
                    <Text style={styles.previewEmoji}>{previewIcon.imagePath}</Text>
                  )}
                </View>
                <Text style={styles.previewName}>{previewIcon.name}</Text>
                <NeumorphicButton
                  title="Close"
                  onPress={() => setShowIconPreview(false)}
                  variant="primary"
                  size="medium"
                />
              </>
            )}
          </NeumorphicCard>
        </View>
      </Modal>
    </>
  );

  // Render with appropriate background wrapper
  if (showPreview && previewBackground && wrapperType === 'gradient' && Array.isArray(wrapperColors)) {
    return (
      <LinearGradient
        colors={wrapperColors as [string, string, ...string[]]}
        style={styles.container}
      >
        {renderContent()}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: (Array.isArray(wrapperColors) ? wrapperColors[0] : wrapperColors) || neumorphicColors.background.main }]}>
      {renderContent()}
    </View>
  );
};

