import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';

interface IslandMenuItem {
  id: string;
  icon: string;
  label: string;
  onPress: () => void;
}

interface IslandMenuProps {
  items: IslandMenuItem[];
  variant?: 'bottom' | 'top' | 'floating';
  style?: any;
}

/**
 * IslandMenu - A navigation menu component with island design
 * Features floating menu bar with smooth animations
 */
export const IslandMenu: React.FC<IslandMenuProps> = ({
  items,
  variant = 'bottom',
  style,
}) => {
  const positionStyles = {
    bottom: {
      position: 'absolute' as const,
      bottom: 20,
      left: 20,
      right: 20,
    },
    top: {
      position: 'absolute' as const,
      top: 20,
      left: 20,
      right: 20,
    },
    floating: {
      // Can be positioned by parent
    },
  };

  return (
    <View style={[styles.menuContainer, positionStyles[variant], style]}>
      <View style={styles.menuBar}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            onPress={item.onPress}
            style={[
              styles.menuItem,
              index === 0 && styles.firstItem,
              index === items.length - 1 && styles.lastItem,
            ]}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  menuContainer: {
    zIndex: 1000,
  },
  menuBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 8,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  firstItem: {
    marginLeft: 4,
  },
  lastItem: {
    marginRight: 4,
  },
  menuIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  menuLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});
