import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { NeumorphicButton } from './NeumorphicButton';
import { NeumorphicCard } from './NeumorphicCard';
import { useNeumorphicColors, spacing, typography } from '../../styles/neumorphicTheme';

interface NeumorphicMainMenuProps {
  onClassicMode: () => void;
  onTimesTableMode: () => void;
  onBubblePopMode: () => void;
  onBubblePlusMode: () => void;
  onLocalPvPMode: () => void;
  onOnlinePvPMode: () => void;
  onShop: () => void;
  onFriends: () => void;
  onProfile: () => void;
  onSettings: () => void;
  playerName?: string;
}

export const NeumorphicMainMenu: React.FC<NeumorphicMainMenuProps> = ({
  onClassicMode,
  onTimesTableMode,
  onBubblePopMode,
  onBubblePlusMode,
  onLocalPvPMode,
  onOnlinePvPMode,
  onShop,
  onFriends,
  onProfile,
  onSettings,
  playerName,
}) => {
  const neumorphicColors = useNeumorphicColors();
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', description: '', icon: '' });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    header: {
      marginBottom: spacing.xl,
    },
    welcomeText: {
      ...typography.h2,
      color: neumorphicColors.text.primary,
      marginBottom: spacing.xs,
    },
    subtitleText: {
      ...typography.body,
      color: neumorphicColors.text.secondary,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      ...typography.h3,
      color: neumorphicColors.text.primary,
      marginBottom: spacing.md,
      marginLeft: spacing.sm,
    },
    gridContainer: {
      paddingRight: spacing.lg,
      gap: spacing.md,
    },
    gridItem: {
      width: 140,
    },
    modeCard: {
      width: 140,
      minHeight: 150,
    },
    selectedCard: {
      borderWidth: 2,
      borderColor: neumorphicColors.primary.main,
    } as const,
    modeContent: {
      alignItems: 'center',
      justifyContent: 'space-between',
      flex: 1,
    },
    modeIcon: {
      fontSize: 48,
      marginBottom: spacing.sm,
    },
    modeTitle: {
      ...typography.h3,
      color: neumorphicColors.text.primary,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    modeDescription: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    playButton: {
      width: '100%',
    },
    multiplayerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    multiplayerCard: {
      flex: 1,
      marginHorizontal: spacing.xs,
      alignItems: 'center',
    },
    multiplayerIcon: {
      fontSize: 40,
      marginBottom: spacing.sm,
    },
    multiplayerTitle: {
      ...typography.h3,
      color: neumorphicColors.text.primary,
      marginBottom: spacing.xs,
    },
    multiplayerDescription: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    startButton: {
      width: '100%',
    },
    quickActions: {
      gap: spacing.md,
    },
    quickActionButton: {
      width: '100%',
    },
    settingsSection: {
      marginTop: spacing.lg,
    },
    infoButton: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      zIndex: 10,
    },
    infoIconText: {
      fontSize: 20,
      color: neumorphicColors.primary.main,
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
    modalIcon: {
      fontSize: 64,
      marginBottom: spacing.md,
    },
    modalTitle: {
      ...typography.h2,
      color: neumorphicColors.text.primary,
      fontWeight: 'bold',
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    modalDescription: {
      ...typography.body,
      color: neumorphicColors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    modalButton: {
      marginTop: spacing.md,
    },
  });

  const gameModes = [
    {
      id: 'classic',
      title: 'Classic',
      icon: '🎯',
      description: 'Solve math problems',
      color: neumorphicColors.modes.classic,
      onPress: onClassicMode,
    },
    {
      id: 'times-tables',
      title: 'Times Tables',
      icon: '🔢',
      description: 'Master multiplication',
      color: neumorphicColors.modes.timesTable,
      onPress: onTimesTableMode,
    },
    {
      id: 'bubble-pop',
      title: 'Bubble Pop',
      icon: '🫧',
      description: 'Pop the right bubble',
      color: neumorphicColors.modes.bubblePop,
      onPress: onBubblePopMode,
    },
    {
      id: 'bubble-plus',
      title: 'Bubble Plus',
      icon: '⚡',
      description: 'Speed mode',
      color: neumorphicColors.modes.bubblePop,
      onPress: onBubblePlusMode,
    },
  ];

  const multiplayerModes = [
    {
      id: 'local-pvp',
      title: 'Local',
      icon: '👥',
      description: 'Play with friends nearby',
      onPress: onLocalPvPMode,
    },
    {
      id: 'online-pvp',
      title: 'Online',
      icon: '🌐',
      description: 'Play with anyone',
      onPress: onOnlinePvPMode,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <NeumorphicCard variant="floating" padding={spacing.lg}>
            <Text style={styles.welcomeText}>
              Welcome back{playerName ? `, ${playerName}` : ''}! 👋
            </Text>
            <Text style={styles.subtitleText}>Choose your game mode</Text>
          </NeumorphicCard>
        </View>

        {/* Game Modes Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Modes</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gridContainer}
          >
            {gameModes.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedMode(mode.id);
                  setTimeout(mode.onPress, 150);
                }}
                style={styles.gridItem}
              >
                <NeumorphicCard
                  variant="raised"
                  padding={spacing.md}
                  style={[
                    styles.modeCard,
                    selectedMode === mode.id && styles.selectedCard,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.infoButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      setInfoContent({
                        title: mode.title,
                        description: mode.description,
                        icon: mode.icon,
                      });
                      setShowInfoModal(true);
                    }}
                  >
                    <Text style={styles.infoIconText}>ⓘ</Text>
                  </TouchableOpacity>

                  <View style={styles.modeContent}>
                    <Text style={styles.modeIcon}>{mode.icon}</Text>
                    <Text style={styles.modeTitle}>{mode.title}</Text>
                  </View>
                </NeumorphicCard>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Multiplayer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Multiplayer</Text>

          <View style={styles.multiplayerRow}>
            {multiplayerModes.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                activeOpacity={0.8}
                onPress={mode.onPress}
                style={{ flex: 1, marginHorizontal: spacing.xs }}
              >
                <NeumorphicCard
                  variant="raised"
                  padding={spacing.md}
                  style={styles.multiplayerCard}
                >
                  <TouchableOpacity
                    style={styles.infoButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      setInfoContent({
                        title: mode.title,
                        description: mode.description,
                        icon: mode.icon,
                      });
                      setShowInfoModal(true);
                    }}
                  >
                    <Text style={styles.infoIconText}>ⓘ</Text>
                  </TouchableOpacity>

                  <Text style={styles.multiplayerIcon}>{mode.icon}</Text>
                  <Text style={styles.multiplayerTitle}>{mode.title}</Text>
                </NeumorphicCard>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.quickActions}>
            <NeumorphicButton
              title="Friends"
              icon="👥"
              onPress={onFriends}
              variant="primary"
              size="medium"
              style={styles.quickActionButton}
            />

            <NeumorphicButton
              title="Shop"
              icon="🛍️"
              onPress={onShop}
              variant="success"
              size="medium"
              style={styles.quickActionButton}
            />

            <NeumorphicButton
              title="Profile"
              icon="👤"
              onPress={onProfile}
              variant="secondary"
              size="medium"
              style={styles.quickActionButton}
            />
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <NeumorphicButton
            title="Settings"
            icon="⚙️"
            onPress={onSettings}
            variant="primary"
            size="small"
            fullWidth
          />
        </View>
      </ScrollView>

      {/* Info Modal */}
      <Modal visible={showInfoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <NeumorphicCard variant="floating" padding={spacing.xl} style={styles.modalCard}>
            <Text style={styles.modalIcon}>{infoContent.icon}</Text>
            <Text style={styles.modalTitle}>{infoContent.title}</Text>
            <Text style={styles.modalDescription}>{infoContent.description}</Text>

            <NeumorphicButton
              title="Got it"
              onPress={() => setShowInfoModal(false)}
              variant="primary"
              size="medium"
              fullWidth
              style={styles.modalButton}
            />
          </NeumorphicCard>
        </View>
      </Modal>
    </View>
  );
};


