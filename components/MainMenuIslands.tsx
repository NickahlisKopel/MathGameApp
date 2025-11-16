import React, { useRef, useState } from 'react';
import { View, Image, StyleSheet, Pressable, Animated } from 'react-native';

interface MainMenuIslandsProps {
  onClassicMode: () => void;
  onTimesTableMode: () => void;
  onLocalPvPMode: () => void;
  onOnlinePvPMode: () => void;
  onShop: () => void;
  onFriends: () => void;
  onProfile: () => void;
  onSettings: () => void;
}

const PopImageButton: React.FC<{ source: any; size?: number; onPress: () => void; testID?: string }>
  = ({ source, size = 96, onPress, testID }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 6,
      tension: 200,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 200,
    }).start();
  };

  const handlePress = () => {
    // Quick pop then invoke the action
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.06, useNativeDriver: true, friction: 6, tension: 200 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 200 }),
    ]).start(onPress);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      testID={testID}
      android_ripple={{ color: 'rgba(0,0,0,0.05)', borderless: true }}
      style={({ pressed }) => [styles.buttonWrapper, pressed && styles.pressed]}
    >
      <Animated.View style={{ transform: [{ scale }], borderRadius: size / 2 }}>
        <Image source={source} style={{ width: size, height: size, resizeMode: 'contain' }} />
      </Animated.View>
    </Pressable>
  );
};

export const MainMenuIslands: React.FC<MainMenuIslandsProps> = ({ 
  onClassicMode, 
  onTimesTableMode, 
  onLocalPvPMode, 
  onOnlinePvPMode, 
  onShop, 
  onFriends, 
  onProfile, 
  onSettings 
}) => {
  const [playMenuExpanded, setPlayMenuExpanded] = useState(false);
  const scaffoldAnim = useRef(new Animated.Value(0)).current;
  const scaffoldOpacity = useRef(new Animated.Value(0)).current;

  const togglePlayMenu = () => {
    const toValue = playMenuExpanded ? 0 : 1;
    setPlayMenuExpanded(!playMenuExpanded);
    
    Animated.parallel([
      Animated.spring(scaffoldAnim, {
        toValue,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }),
      Animated.timing(scaffoldOpacity, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePlayModeSelect = (callback: () => void) => {
    // Retract menu then execute
    togglePlayMenu();
    setTimeout(callback, 300);
  };

  // Interpolate positions for scaffold buttons
  const classicTranslateY = scaffoldAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -110],
  });

  const timesTableTranslateY = scaffoldAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -220],
  });

  const localPvPTranslateX = scaffoldAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  });

  const localPvPTranslateY = scaffoldAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -165],
  });

  const onlinePvPTranslateX = scaffoldAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  const onlinePvPTranslateY = scaffoldAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -165],
  });

  return (
    <View style={styles.container}>
      {/* Logo at the top */}
      {/* <View style={{ alignItems: 'center', marginTop: -125 }}>
        <Image
          source={require('../assets/MathGameAppLogoRedesign.png')}
          style={styles.logo}
          resizeMode="cover"
        />
      </View> */}

      {/* Top row: Profile (center) and Settings (right) */}
      <View style={[styles.topRow, { marginTop: -20 }]}> 
        <View style={styles.topLeftSpacer} />
        <View style={{ marginTop: -80, marginLeft: -180, marginRight: 50 }}>
          <PopImageButton source={require('../assets/PlayerInfoButtonImage.png')} onPress={onProfile} testID="menu-profile" />
        </View>
        <View style={{ marginTop: -80, marginRight: -90 }}>
          <PopImageButton source={require('../assets/SettingsButtonImage.png')} onPress={onSettings} testID="menu-settings" />
        </View>
      </View>

      {/* Middle: Play button with scaffold menu */}
      <View style={[styles.playMenuContainer, { marginTop: 75, alignItems: 'center', justifyContent: 'center' }]}> 
        {/* Scaffold buttons - rendered behind the main play button */}
        <Animated.View 
          style={[ 
            styles.scaffoldButton,
            {
              opacity: scaffoldOpacity,
              transform: [{ translateY: classicTranslateY }],
            }
          ]}
          pointerEvents={playMenuExpanded ? 'auto' : 'none'}
        >
          <PopImageButton 
            source={require('../assets/Classic.png')} 
            size={80}
            onPress={() => handlePlayModeSelect(onClassicMode)} 
            testID="menu-classic" 
          />
        </Animated.View>

        <Animated.View 
          style={[ 
            styles.scaffoldButton,
            {
              opacity: scaffoldOpacity,
              transform: [{ translateY: timesTableTranslateY }],
            }
          ]}
          pointerEvents={playMenuExpanded ? 'auto' : 'none'}
        >
          <PopImageButton 
            source={require('../assets/Times Table.png')} 
            size={80}
            onPress={() => handlePlayModeSelect(onTimesTableMode)} 
            testID="menu-timestable" 
          />
        </Animated.View>

        <Animated.View 
          style={[ 
            styles.scaffoldButton,
            {
              opacity: scaffoldOpacity,
              transform: [
                { translateX: localPvPTranslateX },
                { translateY: localPvPTranslateY }
              ],
            }
          ]}
          pointerEvents={playMenuExpanded ? 'auto' : 'none'}
        >
          <PopImageButton 
            source={require('../assets/local pvp.png')} 
            size={80}
            onPress={() => handlePlayModeSelect(onLocalPvPMode)} 
            testID="menu-localpvp" 
          />
        </Animated.View>

        <Animated.View 
          style={[ 
            styles.scaffoldButton,
            {
              opacity: scaffoldOpacity,
              transform: [
                { translateX: onlinePvPTranslateX },
                { translateY: onlinePvPTranslateY }
              ],
            }
          ]}
          pointerEvents={playMenuExpanded ? 'auto' : 'none'}
        >
          <PopImageButton 
            source={require('../assets/Online.png')} 
            size={80}
            onPress={() => handlePlayModeSelect(onOnlinePvPMode)} 
            testID="menu-onlinepvp" 
          />
        </Animated.View>

        {/* Play button centered */}
        <PopImageButton source={require('../assets/PlayButtonImage.png')} onPress={togglePlayMenu} testID="menu-play" />
      </View>

      {/* Bottom row: Shop (left) and Friends (right) */}
      <View style={[styles.bottomRow, { marginTop: 10 }]}> 
        <PopImageButton source={require('../assets/ShopButtonImage.png')} onPress={onShop} testID="menu-shop" />
        <View style={styles.bottomCenterSpacer} />
        <PopImageButton source={require('../assets/FriendsButtonImage.png')} onPress={onFriends} testID="menu-friends" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
    logo: {
      width: 225,
      height: 175,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 10,
    },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '60%',
    maxWidth: 500,
  },
  topLeftSpacer: {
    width: 96,
  },
  playMenuContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
  scaffoldButton: {
    position: 'absolute',
    zIndex: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '60%',
    maxWidth: 500,
  },
  bottomCenterSpacer: {
    width: 96,
  },
  buttonWrapper: {
    padding: 8,
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.9,
  },
});

export default MainMenuIslands;
