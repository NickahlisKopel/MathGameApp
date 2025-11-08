// Minimal buffer polyfill for react-native-svg
import { Buffer } from 'buffer';
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import DrawingNotepad from './DrawingNotepad';
import UsernameSetupScreen from './components/UsernameSetupScreen';
import PlayerProfileScreen from './components/PlayerProfileScreen';
import ShopScreen from './components/ShopScreen';
import SignInScreen from './components/SignInScreen';
import MatchmakingButton from './components/MatchmakingButton';
import FriendsScreen from './components/FriendsScreen';
import LobbyScreen from './components/LobbyScreen';
import { PlayerProfile } from './types/Player';
import { PlayerStorageService } from './services/PlayerStorageService';
import { FriendsService } from './services/FriendsService';
import { GameRewards } from './utils/GameRewards';
import { useBackground } from './hooks/useBackground';
import SpaceBackground from './components/SpaceBackground';
import ForestBackground from './components/ForestBackground';
import SimpleMultiplayerGameScreen from './components/SimpleMultiplayerGameScreen';
import MultiplayerResultsScreen from './components/MultiplayerResultsScreen';
import { OnlineMultiplayerScreen } from './components/OnlineMultiplayerScreen';
import { ThemeProvider, useTheme, getContrastColor } from './contexts/ThemeContext';
import { localAuth, LocalUser } from './services/localAuth';
import { authService, AuthUser } from './services/AuthService';
import AuthenticationScreen from './components/AuthenticationScreen';

// Types
interface Equation {
  question: string;
  answer: number;
}

interface BackgroundWrapperProps {
  colors: string[];
  type: string;
  animationType?: string;
  style: any;
  children: React.ReactNode;
  onCorrectAnswer?: boolean;
  onIncorrectAnswer?: boolean;
  feedbackReset?: () => void;
}

// Helper component for backgrounds
const BackgroundWrapper: React.FC<BackgroundWrapperProps> = ({ colors, type, animationType, style, children, onCorrectAnswer, onIncorrectAnswer, feedbackReset }) => {
  if (type === 'animated' && animationType === 'space') {
    return (
      <SpaceBackground 
        starCount={50}
        spaceshipVisible={true}
        animated={true}
        onCorrectAnswer={onCorrectAnswer}
        onIncorrectAnswer={onIncorrectAnswer}
        feedbackReset={feedbackReset}
      >
        <View style={style}>{children}</View>
      </SpaceBackground>
    );
  } else if (type === 'animated' && animationType === 'forest') {
    return (
      <ForestBackground 
        treeCount={8}
        birdCount={3}
        animated={true}
        onCorrectAnswer={onCorrectAnswer}
        onIncorrectAnswer={onIncorrectAnswer}
        feedbackReset={feedbackReset}
      >
        <View style={style}>{children}</View>
      </ForestBackground>
    );
  } else if (type === 'solid') {
    return <View style={[style, { backgroundColor: colors[0] }]}>{children}</View>;
  } else {
    // Ensure at least two colors for LinearGradient
    return <LinearGradient colors={colors as [string, string, ...string[]]} style={style}>{children}</LinearGradient>;
  }
};

const { width } = Dimensions.get('window');

function AppContent() {
  // State and hooks
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streakValue, setStreakValue] = useState(0);
  const { backgroundColors, backgroundType, animationType, refreshBackground } = useBackground();
  const { theme, isDarkMode } = useTheme();
  const [gameState, setGameState] = useState<string>('loading');
  const [gamePlayer, setGamePlayer] = useState<{ id: number; name: string; score: number; currentAnswer: string; isCorrect: boolean | null; timeSpent: number }>({
    id: 1,
    name: 'Player',
    score: 0,
    currentAnswer: '',
    isCorrect: null,
    timeSpent: 0,
  });
  const [showProfile, setShowProfile] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'overview' | 'stats' | 'achievements' | 'settings' | 'history'>('overview');
  const [showShop, setShowShop] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [incomingChallenge, setIncomingChallenge] = useState<{challengeId: string; from: {id: string; name: string}; difficulty: string} | null>(null);
  const [gameStartTime, setGameStartTime] = useState<Date>(new Date());
  const [currentEquation, setCurrentEquation] = useState<Equation>({ question: '', answer: 0 });
  const [gameTime, setGameTime] = useState(60);
  const [timeLeft, setTimeLeft] = useState(gameTime);
  const [equationCount, setEquationCount] = useState(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [gameMode, setGameMode] = useState<'classic' | 'times_tables' | 'multiplayer'>('classic');
  const [fadeAnim] = useState(new Animated.Value(1));
  const [showNotepad, setShowNotepad] = useState(false);
  const [multiplayerResults, setMultiplayerResults] = useState<any>(null);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [currentTable, setCurrentTable] = useState(1);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [completedTables, setCompletedTables] = useState<number[]>([]);
  const [timesTablesProgress, setTimesTablesProgress] = useState<{[key: number]: number}>({});
  const [spaceCorrectFeedback, setSpaceCorrectFeedback] = useState(false);
  const [spaceIncorrectFeedback, setSpaceIncorrectFeedback] = useState(false);
  
  // Text feedback states
  const [showTextFeedback, setShowTextFeedback] = useState(false);
  const [textFeedbackCorrect, setTextFeedbackCorrect] = useState(false);
  const [textFeedbackMessage, setTextFeedbackMessage] = useState('');

  // Keypad handlers
  const handleNumberPress = (num: string) => {
    setGamePlayer(prev => ({ ...prev, currentAnswer: prev.currentAnswer + num }));
  };
  const handleDelete = () => {
    setGamePlayer(prev => ({ ...prev, currentAnswer: prev.currentAnswer.slice(0, -1) }));
  };
  const dismissKeyboard = () => Keyboard.dismiss();

  // New unified auth initialization (supports offline guest mode)
  useEffect(() => {
    (async () => {
      const restored = await authService.initialize();
      setAuthenticatedUser(restored);
      setAuthInitialized(true);
      if (!restored) {
        setShowAuthScreen(true);
      } else {
        // Ensure player profile exists linked to auth user displayName
        let profile = await PlayerStorageService.loadPlayerProfile();
        if (!profile) {
          const displayName = restored.displayName || 'Player';
          profile = await PlayerStorageService.createNewPlayer(displayName, undefined);
        }
        // Initialize friends system if not already initialized
        await FriendsService.initializeFriends(profile.id);
        
        // Sync player to server for cross-device friends
        try {
          const { ServerFriendsService } = await import('./services/ServerFriendsService');
          // First sync local data to server
          await ServerFriendsService.syncPlayer();
          
          // Then pull latest friends data from server
          const serverPlayer = await ServerFriendsService.getPlayerFromServer(profile.id);
          if (serverPlayer && serverPlayer.friends) {
            profile.friends = serverPlayer.friends;
            profile.friendRequests = serverPlayer.friendRequests || [];
            await PlayerStorageService.savePlayerProfile(profile);
          }
        } catch (error) {
          console.log('Could not sync to server:', error);
        }
        
        setPlayerProfile(profile);
        // Set to setup screen after profile is loaded
        setGameState('setup');
      }
    })();
  }, []);

  // Calculate current level based on experience (same formula as PlayerProfileScreen)
  const getCurrentLevel = (experience: number) => {
    return Math.floor(Math.sqrt(experience / 100)) + 1;
  };

  // Refresh profile when returning to setup screen
  useEffect(() => {
    if (gameState === 'setup' && playerProfile) {
      refreshPlayerProfile();
    }
  }, [gameState]);

  // Update streak when player profile is loaded
  useEffect(() => {
    if (playerProfile && authenticatedUser) {
      (async () => {
        const streakResult = await PlayerStorageService.updateDailyStreak();
        if (streakResult && streakResult.checkedInToday) {
          setStreakValue(playerProfile.currentStreak);
          setTimeout(() => setShowStreakModal(true), 500);
        }
      })();
    }
  }, [playerProfile?.id]);

  // Set up friend challenge listeners
  useEffect(() => {
    if (authenticatedUser && !authenticatedUser.isOffline) {
      (async () => {
        const { socketMultiplayerService } = await import('./services/socketMultiplayerService');
        
        socketMultiplayerService.onFriendChallengeReceived = (data) => {
          setIncomingChallenge(data);
        };

        socketMultiplayerService.onFriendChallengeDeclined = (data) => {
          Alert.alert('Challenge Declined', `${data.from.name} declined your challenge.`);
        };

        socketMultiplayerService.onChallengeLobbyCreated = (data) => {
          Alert.alert(
            'Lobby Created', 
            `Waiting for ${data.friendName} to join...\nExpires in ${data.expiresIn} seconds`,
            [{ text: 'OK' }]
          );
        };

        socketMultiplayerService.onChallengeTimeout = (data) => {
          Alert.alert('Challenge Timeout', data.message);
        };

        socketMultiplayerService.onChallengeExpired = (data) => {
          // Challenge expired, dismiss any pending challenge UI
          setIncomingChallenge(null);
        };

        // Handle match found from friend challenge
        socketMultiplayerService.onMatchFound = (data) => {
          console.log('[App] Match found from friend challenge:', data);
          // Game will be started by OnlineMultiplayerScreen
        };

        socketMultiplayerService.onGameStart = (data) => {
          console.log('[App] Game starting from friend challenge:', data);
          // Game is starting, OnlineMultiplayerScreen will handle it
        };

        // Store previous error handler if it exists
        const prevErrorHandler = socketMultiplayerService.onError;
        
        socketMultiplayerService.onError = (error) => {
          // Only show alert for friend-related errors
          if (error.includes('not online') || error.includes('Challenge')) {
            Alert.alert('Challenge Error', error);
          }
          // Call previous handler if it exists
          prevErrorHandler?.(error);
        };
      })();
    }
  }, [authenticatedUser]);

  const refreshPlayerProfile = async () => {
    try {
      const profile = await PlayerStorageService.loadPlayerProfile();
      if (profile) {
        // Ensure stored level matches calculated level
        const calculatedLevel = getCurrentLevel(profile.experience);
        if (profile.level !== calculatedLevel) {
          profile.level = calculatedLevel;
          await PlayerStorageService.savePlayerProfile(profile);
        }
        setPlayerProfile(profile);
        setGamePlayer(prev => ({ ...prev, name: profile.username }));
      }
    } catch (error) {
      console.error('Error refreshing player profile:', error);
    }
  };

  // Removed handleUsernameCreated - now handled by AuthenticationScreen

  const handlePlayerUpdated = (updatedPlayer: PlayerProfile) => {
    setPlayerProfile(updatedPlayer);
    setGamePlayer(prev => ({ ...prev, name: updatedPlayer.username }));
    // Refresh background in case it was changed in settings
    setTimeout(() => {
      refreshBackground();
    }, 100);
  };

  // Friend Challenge Handlers
  const handleChallengeFriend = async (friendId: string, difficulty: 'easy' | 'medium' | 'hard') => {
    setShowFriends(false);
    
    const { socketMultiplayerService } = await import('./services/socketMultiplayerService');
    
    // Make sure we're connected
    if (!socketMultiplayerService.getIsConnected() && authenticatedUser && playerProfile) {
      const connected = await socketMultiplayerService.connect('https://mathgameapp.onrender.com', authenticatedUser, playerProfile.id);
      if (!connected) {
        Alert.alert('Error', 'Could not connect to multiplayer server');
        return;
      }
    }
    
    socketMultiplayerService.sendFriendChallenge(friendId, difficulty);
    
    // Navigate to multiplayer screen to wait for friend
    setDifficulty(difficulty);
    setGameState('online-pvp');
  };

  const handleAcceptChallenge = () => {
    if (!incomingChallenge) return;
    
    (async () => {
      console.log('[App] Accepting challenge:', incomingChallenge);
      const { socketMultiplayerService } = await import('./services/socketMultiplayerService');
      socketMultiplayerService.acceptFriendChallenge(incomingChallenge.challengeId, incomingChallenge.from.id);
      setIncomingChallenge(null);
      console.log('[App] Setting game state to online-pvp with difficulty:', incomingChallenge.difficulty);
      setDifficulty(incomingChallenge.difficulty as 'easy' | 'medium' | 'hard');
      setGameState('online-pvp'); // Navigate to multiplayer screen
    })();
  };

  const handleDeclineChallenge = () => {
    if (!incomingChallenge) return;
    
    (async () => {
      const { socketMultiplayerService } = await import('./services/socketMultiplayerService');
      socketMultiplayerService.declineFriendChallenge(incomingChallenge.challengeId, incomingChallenge.from.id);
      setIncomingChallenge(null);
    })();
  };

  const handleProfileReset = async () => {
    // Reset all app state to initial values
    setPlayerProfile(null);
    setGamePlayer({
      id: 1,
      name: 'Player',
      score: 0,
      currentAnswer: '',
      isCorrect: null,
      timeSpent: 0,
    });
    setShowProfile(false);
    setShowShop(false);
    
    // Clear player profile from storage to prevent reusing on next login
    await AsyncStorage.removeItem('player_profile');
    
    // Sign out and show auth screen
    await authService.signOut();
    setAuthenticatedUser(null);
    setShowAuthScreen(true);
    
    // Refresh background to default
    setTimeout(() => {
      refreshBackground();
    }, 200);
  };

  // Generate times tables equations
  const generateTimesTableEquation = useCallback((): Equation => {
    const table = currentTable;
    const multiplier = currentMultiplier;
    const answer = table * multiplier;
    
    return {
      question: `${table} × ${multiplier} = ?`,
      answer,
    };
  }, [currentTable, currentMultiplier]);

  // Generate random math equations based on difficulty
  const generateEquation = useCallback((): Equation => {
    let num1: number, num2: number, operation: string, answer: number;

    switch (difficulty) {
      case 'easy':
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        if (Math.random() > 0.5) {
          operation = '+';
          answer = num1 + num2;
        } else {
          operation = '-';
          if (num1 < num2) [num1, num2] = [num2, num1]; // Ensure positive result
          answer = num1 - num2;
        }
        break;
      case 'medium':
        num1 = Math.floor(Math.random() * 50) + 1;
        num2 = Math.floor(Math.random() * 50) + 1;
        const ops = ['+', '-', '×'];
        operation = ops[Math.floor(Math.random() * ops.length)];
        if (operation === '+') answer = num1 + num2;
        else if (operation === '-') {
          if (num1 < num2) [num1, num2] = [num2, num1];
          answer = num1 - num2;
        } else {
          num1 = Math.floor(Math.random() * 12) + 1;
          num2 = Math.floor(Math.random() * 12) + 1;
          answer = num1 * num2;
        }
        break;
      case 'hard':
        num1 = Math.floor(Math.random() * 100) + 1;
        num2 = Math.floor(Math.random() * 100) + 1;
        const hardOps = ['+', '-', '×', '÷'];
        operation = hardOps[Math.floor(Math.random() * hardOps.length)];
        if (operation === '+') answer = num1 + num2;
        else if (operation === '-') {
          if (num1 < num2) [num1, num2] = [num2, num1];
          answer = num1 - num2;
        } else if (operation === '×') {
          num1 = Math.floor(Math.random() * 25) + 1;
          num2 = Math.floor(Math.random() * 25) + 1;
          answer = num1 * num2;
        } else {
          // Division - ensure clean division
          answer = Math.floor(Math.random() * 20) + 1;
          num2 = Math.floor(Math.random() * 12) + 1;
          num1 = answer * num2;
        }
        break;
    }

    return {
      question: `${num1} ${operation} ${num2} = ?`,
      answer,
    };
  }, [difficulty]);

  // Start new game
  const startGame = () => {
    setGameState('playing');
    setTimeLeft(gameTime);
    setEquationCount(0);
    setGameStartTime(new Date());
    setGamePlayer(prev => ({ ...prev, score: 0, currentAnswer: '', isCorrect: null, timeSpent: 0 }));
    
    // Handle times tables progress
    if (gameMode === 'times_tables') {
      // Load saved progress or start fresh
      const savedProgress = playerProfile?.timesTablesProgress;
      if (savedProgress) {
        setCurrentTable(savedProgress.currentTable);
        setCurrentMultiplier(savedProgress.currentMultiplier);
        setCompletedTables(savedProgress.completedTables);
        setTimesTablesProgress(savedProgress.progress);
        
        // Generate equation with saved progress
        setCurrentEquation({
          question: `${savedProgress.currentTable} × ${savedProgress.currentMultiplier} = ?`,
          answer: savedProgress.currentTable * savedProgress.currentMultiplier,
        });
      } else {
        setCurrentEquation(generateTimesTableEquation());
      }
    } else {
      setCurrentEquation(generateEquation());
    }
  };

  // Handle answer submission
  const submitAnswer = (answer: string) => {
    if (!answer.trim()) return;
    
    const numAnswer = parseInt(answer);
    const isCorrect = numAnswer === currentEquation.answer;
    
    setGamePlayer(prev => ({
      ...prev,
      currentAnswer: answer,
      isCorrect,
      score: isCorrect ? prev.score + 1 : prev.score,
    }));

    // Show text feedback
    setTextFeedbackCorrect(isCorrect);
    setTextFeedbackMessage(isCorrect ? 'Correct!' : `Wrong! Answer was ${currentEquation.answer}`);
    setShowTextFeedback(true);

    // Trigger space background feedback if space theme is active
    if (backgroundType === 'animated' && animationType === 'space') {
      if (isCorrect) {
        setSpaceCorrectFeedback(true);
      } else {
        setSpaceIncorrectFeedback(true);
      }
    }

    // Dismiss keyboard after submission
    Keyboard.dismiss();

    // Show feedback animation
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.3, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Hide text feedback after delay
    setTimeout(() => {
      setShowTextFeedback(false);
    }, 1500);

    // Generate new equation after short delay
    setTimeout(() => {
      if (gameMode === 'times_tables') {
        // Handle times tables progression
        if (isCorrect) {
          // Calculate next values
          let nextTable = currentTable;
          let nextMultiplier = currentMultiplier;
          
          // Move to next multiplier
          if (currentMultiplier < 15) {
            nextMultiplier = currentMultiplier + 1;
            setCurrentMultiplier(nextMultiplier);
          } else {
            // Completed this table, move to next table
            setCompletedTables(prev => [...prev, currentTable]);
            setTimesTablesProgress(prev => ({ ...prev, [currentTable]: 15 }));
            
            if (currentTable < 15) {
              nextTable = currentTable + 1;
              nextMultiplier = 1;
              setCurrentTable(nextTable);
              setCurrentMultiplier(nextMultiplier);
            } else {
              // All tables completed!
              finishGame();
              return;
            }
          }
          
          // Generate equation with the new values
          setCurrentEquation({
            question: `${nextTable} × ${nextMultiplier} = ?`,
            answer: nextTable * nextMultiplier,
          });
          
          // Save progress to player profile
          const updatedCompletedTables = currentMultiplier === 15 ? [...completedTables, currentTable] : completedTables;
          const updatedProgress = currentMultiplier === 15 ? { ...timesTablesProgress, [currentTable]: 15 } : timesTablesProgress;
          saveTimesTablesProgress(nextTable, nextMultiplier, updatedCompletedTables, updatedProgress);
        } else {
          // Wrong answer, stay on same equation
          setCurrentEquation(generateTimesTableEquation());
        }
      } else {
        setCurrentEquation(generateEquation());
      }
      
      // Only increment equation count for classic mode, or when we actually progress in times tables
      if (gameMode === 'classic' || (gameMode === 'times_tables' && isCorrect)) {
        setEquationCount(prev => prev + 1);
      }
      setGamePlayer(prev => ({ ...prev, currentAnswer: '', isCorrect: null }));
    }, 1500);
  };

  // Game timer (only for classic mode)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (gameState === 'playing' && timeLeft > 0 && gameMode === 'classic') {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'playing' && gameMode === 'classic') {
      finishGame();
    }
    return () => {
      if (interval !== undefined) {
        clearInterval(interval);
      }
    };
  }, [gameState, timeLeft, gameMode]);

  const finishGame = async () => {
    setGameState('finished');
    
    if (!playerProfile) return;
    
    try {
      const gameTimeSpent = gameTime - timeLeft;
      const gameResult = GameRewards.createGameResult(
        gamePlayer.score,
        equationCount,
        gameTimeSpent,
        difficulty
      );
      
      await PlayerStorageService.saveGameResult(gameResult);
      
      // Show achievement notifications if any
      // This could be enhanced with a modal or toast notification
      
      // Reload player profile to get updated stats
      const updatedProfile = await PlayerStorageService.loadPlayerProfile();
      if (updatedProfile) {
        const previousStreak = playerProfile?.currentStreak || 0;
        setPlayerProfile(updatedProfile);
        
        // Check for streak update after completing a game
        const streakResult = await PlayerStorageService.updateDailyStreak();
        if (streakResult && streakResult.checkedInToday) {
          // Only show modal if streak actually increased or if it's their first streak
          if (updatedProfile.currentStreak > previousStreak || updatedProfile.currentStreak === 1) {
            setStreakValue(updatedProfile.currentStreak);
            setTimeout(() => setShowStreakModal(true), 1500); // Show after results screen
          }
        }
      }
    } catch (error) {
      console.error('Error saving game result:', error);
    }
  };

  // Handle quitting game early (without saving stats)
  const handleQuitGame = () => {
    Alert.alert(
      'Quit Game?',
      'Are you sure you want to quit? Your progress will not be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: () => {
            // Reset game state without saving
            setGameState('setup');
            setGamePlayer({
              id: 1,
              name: 'Player',
              score: 0,
              currentAnswer: '',
              isCorrect: null,
              timeSpent: 0,
            });
            setTimeLeft(gameTime);
            setEquationCount(0);
            // Generate new equation for next game
            setCurrentEquation(generateEquation());
          },
        },
      ]
    );
  };

  // Add missing helpers at top-level
  const resetSpaceFeedback = () => {
    setSpaceCorrectFeedback(false);
    setSpaceIncorrectFeedback(false);
  };

  const saveTimesTablesProgress = (table: number, multiplier: number, completed: number[], progress: {[key: number]: number}) => {
    // Implement saving logic or leave as stub
  };

  const renderKeypad = () => {
    const keyRows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['Clear', '0', 'Enter']
    ];
    
    return (
      <View style={styles.keypad}>
        {keyRows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.key,
                  key === 'Clear' && styles.clearKey,
                  key === 'Enter' && styles.enterKey,
                ]}
                onPress={() => {
                  if (key === 'Clear') {
                    handleDelete();
                  } else if (key === 'Enter') {
                    submitAnswer(gamePlayer.currentAnswer);
                  } else {
                    handleNumberPress(key);
                  }
                }}
              >
                <Text style={[
                  styles.keyText,
                  key === 'Clear' && styles.clearKeyText,
                  key === 'Enter' && styles.enterKeyText,
                ]}>
                  {key === 'Clear' ? '⌫' : key === 'Enter' ? '✓' : key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  // New auth screen handling moved earlier (authInitialized & showAuthScreen)

  // Old lobby system disabled - now using integrated multiplayer mode
  // if (lobbyId) {
  //   return <LobbyScreen lobbyId={lobbyId} onLeave={() => setLobbyId(null)} />;
  // }

  // Old matchmaking system disabled - now using integrated multiplayer mode selection
  // if (gameState === 'setup' && playerProfile) {
  //   return (
  //     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
  //       <Text style={{ fontSize: 24, marginBottom: 24 }}>Welcome, {playerProfile.username}!</Text>
  //       <MatchmakingButton
  //         player={{
  //           uid: authUser?.uid,
  //           username: playerProfile.username,
  //           avatar: playerProfile.customization.avatar,
  //         }}
  //         onMatched={setLobbyId}
  //       />
  //       {/* ...other main menu/setup UI... */}
  //     </View>
  //   );
  // }

  // Render setup screen
  const renderSetup = () => (
    <BackgroundWrapper colors={backgroundColors} type={backgroundType} animationType={animationType} style={styles.container}>
      <SafeAreaView style={styles.safeAreaContainer} edges={['top', 'left', 'right']}>
        <ScrollView 
          contentContainerStyle={styles.setupContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={[styles.title, { color: getContrastColor(backgroundType, theme) }]}>Math Game</Text>
            <Text style={[styles.subtitle, { color: getContrastColor(backgroundType, theme) }]}>Challenge Your Mind</Text>
          </View>

          {/* Player Profile Card */}
          {playerProfile && (
            <TouchableOpacity 
              style={[styles.profileCard, { backgroundColor: theme.colors.card }]}
              onPress={() => {
                setProfileInitialTab('overview');
                setShowProfile(true);
              }}
            >
              <View style={styles.profileCardContent}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>👤</Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { color: theme.colors.textSecondary }]}>{playerProfile.username}</Text>
                  <Text style={[styles.profileStats, { color: theme.colors.textTertiary }]}>
                    Level {getCurrentLevel(playerProfile.experience)} • {playerProfile.coins} 🪙 • {playerProfile.currentStreak || 0}🔥
                  </Text>
                  <Text style={[styles.profileSubtext, { color: theme.colors.textTertiary }]}>
                    {playerProfile.gamesPlayed} games • {Math.round((playerProfile.totalCorrectAnswers / Math.max(playerProfile.totalQuestions, 1)) * 100)}% accuracy
                  </Text>
                </View>
                <View style={styles.profileArrow}>
                  <Text style={styles.profileArrowText}>▶</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Quick Actions Row */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: theme.colors.card }]}
              onPress={() => setShowShop(true)}
            >
              <Text style={styles.quickActionIcon}>🛍️</Text>
              <Text style={[styles.quickActionText, { color: theme.colors.textSecondary }]}>Shop</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: theme.colors.card }]}
              onPress={() => {
                setProfileInitialTab('settings');
                setShowProfile(true);
              }}
            >
              <Text style={styles.quickActionIcon}>⚙️</Text>
              <Text style={[styles.quickActionText, { color: theme.colors.textSecondary }]}>Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: theme.colors.card }]}
              onPress={() => setShowFriends(true)}
            >
              <Text style={styles.quickActionIcon}>�</Text>
              <Text style={[styles.quickActionText, { color: theme.colors.textSecondary }]}>Friends</Text>
            </TouchableOpacity>
          </View>

          {/* Game Modes Section */}
          <View style={styles.gameModesSection}>
            <Text style={[styles.sectionTitle, { color: getContrastColor(backgroundType, theme) }]}>🎮 Game Modes</Text>
            
            {/* Game Mode Selection */}
            <View style={styles.gameModeSelection}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  { backgroundColor: theme.colors.card, borderColor: '#ffffff' },
                  gameMode === 'classic' && [styles.selectedModeButton, { borderColor: '#4CAF50', borderWidth: 3 }]
                ]}
                onPress={() => setGameMode('classic')}
              >
                <Text style={styles.modeIcon}>⚡</Text>
                <Text style={[styles.modeTitle, { color: '#ffffff' }]} numberOfLines={1}>Classic</Text>
                <Text style={[styles.modeDescription, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                  Mixed arithmetic
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  { backgroundColor: theme.colors.card, borderColor: '#ffffff' },
                  gameMode === 'times_tables' && [styles.selectedModeButton, { borderColor: '#4CAF50', borderWidth: 3 }]
                ]}
                onPress={() => setGameMode('times_tables')}
              >
                <Text style={styles.modeIcon}>🔢</Text>
                <Text style={[styles.modeTitle, { color: '#ffffff' }]} numberOfLines={1}>Times Tables</Text>
                <Text style={[styles.modeDescription, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                  1×1 to 15×15
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  { backgroundColor: theme.colors.card, borderColor: '#ffffff' },
                  gameMode === 'multiplayer' && [styles.selectedModeButton, { borderColor: '#4CAF50', borderWidth: 3 }]
                ]}
                onPress={() => setGameMode('multiplayer')}
              >
                <Text style={styles.modeIcon}>👥</Text>
                <Text style={[styles.modeTitle, { color: '#ffffff' }]} numberOfLines={1}>Multiplayer</Text>
                <Text style={[styles.modeDescription, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                  Battle vs AI
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Classic Mode Card */}
            {gameMode === 'classic' && (
            <View style={[styles.gameModeCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.gameModeHeader}>
                <Text style={styles.gameModeIcon}>⚡</Text>
                <View style={styles.gameModeInfo}>
                  <Text style={[styles.gameModeTitle, { color: '#ffffff' }]}>Classic Mode</Text>
                  <Text style={[styles.gameModeDescription, { color: theme.colors.textTertiary }]}>
                    Fast-paced arithmetic challenges
                  </Text>
                </View>
              </View>
              
              <View style={styles.difficultySection}>
                <Text style={[styles.difficultyLabel, { color: '#ffffff' }]}>Difficulty:</Text>
                <View style={styles.difficultyButtons}>
                  {(['easy', 'medium', 'hard'] as const).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.difficultyChip,
                        { 
                          backgroundColor: theme.colors.card,
                          borderColor: '#ffffff',
                          borderWidth: 2,
                        },
                        difficulty === level && [
                          styles.selectedDifficultyChip,
                          { borderColor: '#ffffff', borderWidth: 3 }
                        ]
                      ]}
                      onPress={() => setDifficulty(level)}
                    >
                      <Text style={[
                        styles.difficultyChipText,
                        { color: theme.colors.textSecondary },
                        difficulty === level && styles.selectedDifficultyChipText
                      ]}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <TouchableOpacity style={styles.playButton} onPress={startGame}>
                <Text style={styles.playButtonText}>🎯 Play Now</Text>
              </TouchableOpacity>
            </View>
            )}
            
            {/* Times Tables Mode Card */}
            {gameMode === 'times_tables' && (
            <View style={[styles.gameModeCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.gameModeHeader}>
                <Text style={styles.gameModeIcon}>🔢</Text>
                <View style={styles.gameModeInfo}>
                  <Text style={[styles.gameModeTitle, { color: '#ffffff' }]}>Times Tables Mode</Text>
                  <Text style={[styles.gameModeDescription, { color: theme.colors.textTertiary }]}>
                    Master multiplication from 1×1 to 15×15
                  </Text>
                </View>
              </View>
              
              <View style={styles.timesTableInfo}>
                <Text style={[styles.timesTableDescription, { color: '#ffffff' }]}>
                  • Complete each times table from 1 to 15{'\n'}
                  • Get checkpoints for each completed table{'\n'}
                  • Progress is automatically saved{'\n'}
                  • Perfect for learning and practice{'\n'}
                  • No time pressure - focus on accuracy
                </Text>
              </View>
              
              <TouchableOpacity style={styles.playButton} onPress={startGame}>
                <Text style={styles.playButtonText}>🔢 Start Times Tables</Text>
              </TouchableOpacity>
            </View>
            )}

            {/* Multiplayer Mode Card */}
            {gameMode === 'multiplayer' && (
            <View style={[styles.gameModeCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.gameModeHeader}>
                <Text style={styles.gameModeIcon}>👥</Text>
                <View style={styles.gameModeInfo}>
                  <Text style={[styles.gameModeTitle, { color: '#ffffff' }]}>Multiplayer Modes</Text>
                  <Text style={[styles.gameModeDescription, { color: theme.colors.textTertiary }]}>
                    Choose your battle style
                  </Text>
                </View>
              </View>
              
              <View style={styles.difficultySection}>
                <Text style={[styles.difficultyLabel, { color: '#ffffff' }]}>Difficulty:</Text>
                <View style={styles.difficultyButtons}>
                  {(['easy', 'medium', 'hard'] as const).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.difficultyChip,
                        { 
                          backgroundColor: theme.colors.card,
                          borderColor: '#ffffff',
                          borderWidth: 2,
                        },
                        difficulty === level && [
                          styles.selectedDifficultyChip,
                          { borderColor: '#ffffff', borderWidth: 3 }
                        ]
                      ]}
                      onPress={() => setDifficulty(level)}
                    >
                      <Text style={[styles.difficultyText, { color: '#ffffff' }]}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Bot Battle Mode */}
              <TouchableOpacity 
                style={[styles.multiplayerModeButton, { backgroundColor: '#4CAF50', marginBottom: 12 }]} 
                onPress={() => setGameState('bot-battle')}
              >
                <View style={styles.multiplayerModeContent}>
                  <Text style={styles.multiplayerModeIcon}>🤖</Text>
                  <View style={styles.multiplayerModeInfo}>
                    <Text style={styles.multiplayerModeTitle}>Bot Battle</Text>
                    <Text style={styles.multiplayerModeDesc}>Compete against AI • Race to highest score</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Local 1v1 Mode */}
              <TouchableOpacity 
                style={[styles.multiplayerModeButton, { backgroundColor: '#FF9800', marginBottom: 12 }]} 
                onPress={() => setGameState('local-1v1')}
              >
                <View style={styles.multiplayerModeContent}>
                  <Text style={styles.multiplayerModeIcon}>🎮</Text>
                  <View style={styles.multiplayerModeInfo}>
                    <Text style={styles.multiplayerModeTitle}>Local 1v1</Text>  
                    <Text style={styles.multiplayerModeDesc}>Take turns on same device • Best of 10 questions</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Online PvP Mode - Only for authenticated users */}
              {authenticatedUser && !authenticatedUser.isOffline ? (
                <TouchableOpacity 
                  style={[styles.multiplayerModeButton, { backgroundColor: '#2196F3' }]} 
                  onPress={() => setGameState('online-pvp')}
                >
                  <View style={styles.multiplayerModeContent}>
                    <Text style={styles.multiplayerModeIcon}>🌐</Text>
                    <View style={styles.multiplayerModeInfo}>
                      <Text style={styles.multiplayerModeTitle}>Online PvP</Text>  
                      <Text style={styles.multiplayerModeDesc}>Real-time matchmaking • Play against players worldwide</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <View 
                  style={[styles.multiplayerModeButton, { backgroundColor: '#666666', opacity: 0.6 }]}
                >
                  <View style={styles.multiplayerModeContent}>
                    <Text style={styles.multiplayerModeIcon}>🔒</Text>
                    <View style={styles.multiplayerModeInfo}>
                      <Text style={styles.multiplayerModeTitle}>Online PvP (Sign in required)</Text>  
                      <Text style={styles.multiplayerModeDesc}>Sign in to play online • Available with any auth method</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
            )}

            {/* Coming Soon Modes */}
            <View style={[styles.comingSoonCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.comingSoonHeader}>
                <Text style={styles.comingSoonIcon}>🔒</Text>
                <View style={styles.comingSoonInfo}>
                  <Text style={[styles.comingSoonTitle, { color: '#ffffff' }]}>More Modes Coming Soon!</Text>
                  <Text style={[styles.comingSoonDescription, { color: theme.colors.textTertiary }]}>
                    • Daily Challenges{'\n'}
                    • Endless Mode{'\n'}
                    • Custom Challenges{'\n'}
                    • Tournaments
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );

  // Render game screen
  const renderGame = () => (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <BackgroundWrapper 
        colors={backgroundColors} 
        type={backgroundType} 
        animationType={animationType} 
        style={styles.container}
        onCorrectAnswer={spaceCorrectFeedback}
        onIncorrectAnswer={spaceIncorrectFeedback}
        feedbackReset={resetSpaceFeedback}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <SafeAreaView style={styles.gameContainer} edges={['top', 'left', 'right']}>
            <View style={styles.gameContent}>
              <View style={styles.header}>
              <TouchableOpacity 
                style={styles.quitButton}
                onPress={handleQuitGame}
              >
                <Text style={styles.quitButtonText}>✕</Text>
              </TouchableOpacity>
              
              <View style={styles.centerInfo}>
                <Text style={[styles.score, { color: getContrastColor(backgroundType, theme) }]}>Score: {gamePlayer.score}</Text>
                {gameMode === 'times_tables' && (
                  <Text style={[styles.timesTableProgress, { color: getContrastColor(backgroundType, theme) }]}>
                    {currentTable}× Table: {currentMultiplier}/15
                  </Text>
                )}
              </View>
              
              <View style={styles.equationCounterContainer}>
                <Text style={[styles.equationCounter, { color: getContrastColor(backgroundType, theme) }]}>#{equationCount + 1}</Text>
              </View>
            </View>
            
            {/* Floating Timer */}
            {gameMode === 'classic' && (
              <Text style={styles.timer}>⏱️ {timeLeft}s</Text>
            )}
            
            {/* Compact Notepad Button */}
            <TouchableOpacity 
              style={[
                styles.notepadButton,
                { backgroundColor: isDarkMode ? '#000000' : 'rgba(255, 255, 255, 0.9)' }
              ]} 
              onPress={() => setShowNotepad(true)}
            >
              <Text style={styles.notepadButtonText}>📝</Text>
            </TouchableOpacity>

            <Animated.View style={[
              styles.equationContainer, 
              { 
                opacity: fadeAnim,
                backgroundColor: isDarkMode ? '#000000' : 'rgba(255, 255, 255, 0.95)'
              }
            ]}>
              <Text style={[
                styles.equation,
                { color: isDarkMode ? '#ffffff' : '#333' }
              ]}>{currentEquation.question}</Text>
            </Animated.View>

            <View style={styles.singlePlayerContainer}>
              {/* Pill-shaped Input Field with Color Feedback */}
              <View style={[
                styles.answerInput,
                { 
                  backgroundColor: isDarkMode ? '#000000' : theme.colors.inputBackground,
                  borderColor: isDarkMode ? '#ffffff' : theme.colors.inputBorder 
                },
                gamePlayer.isCorrect === true && styles.correctInput,
                gamePlayer.isCorrect === false && styles.incorrectInput,
              ]}>
                <Text style={[
                  styles.answerText,
                  { color: isDarkMode ? '#ffffff' : theme.colors.inputText },
                  !gamePlayer.currentAnswer && [styles.placeholderText, { color: isDarkMode ? '#b0b0b0' : theme.colors.placeholderText }],
                  gamePlayer.isCorrect === true && styles.correctText,
                  gamePlayer.isCorrect === false && styles.incorrectText,
                ]}>
                  {gamePlayer.currentAnswer || 'Enter your answer'}
                </Text>
              </View>

              {/* Text Feedback Display */}
              {showTextFeedback && (
                <View style={styles.textFeedbackContainer}>
                  <Text style={[styles.textFeedbackText, textFeedbackCorrect ? styles.correctFeedback : styles.incorrectFeedback]}>
                    {textFeedbackMessage}
                  </Text>
                </View>
              )}

              {/* Custom Numeric Keypad */}
              <View style={[styles.keypadContainer, { backgroundColor: theme.colors.surface }]}>
                {renderKeypad()}
              </View>

              {/* Debug display removed for cleaner UI */}

              {gamePlayer.isCorrect !== null && (
                <Animated.View style={styles.feedbackContainer}>
                  <Text style={[
                    styles.feedback,
                    gamePlayer.isCorrect ? styles.correctFeedback : styles.incorrectFeedback
                  ]}>
                    {gamePlayer.isCorrect ? '🎉 Correct!' : `❌ Wrong! Answer: ${currentEquation.answer}`}
                  </Text>
                </Animated.View>
              )}

              {/* Removed dismiss keyboard button - using custom keypad now */}
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </BackgroundWrapper>
    </TouchableWithoutFeedback>
  );

  // Render results screen
  const renderResults = () => {
    const accuracy = equationCount > 0 ? Math.round((gamePlayer.score / equationCount) * 100) : 0;
    const avgTimePerEquation = equationCount > 0 ? Math.round((gameTime - timeLeft) / equationCount) : 0;

    return (
      <BackgroundWrapper colors={backgroundColors} type={backgroundType} animationType={animationType} style={styles.container}>
        <SafeAreaView style={styles.safeAreaContainer} edges={['top', 'left', 'right']}>
          <ScrollView 
            contentContainerStyle={styles.resultsContainer}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
          <Text style={[styles.title, { color: getContrastColor(backgroundType, theme) }]}>
            {gameMode === 'times_tables' ? '🔢 Times Tables Complete!' : '🎯 Game Complete!'}
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
              <Text style={styles.statNumber}>{gamePlayer.score}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Correct Answers</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
              <Text style={styles.statNumber}>{accuracy}%</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Accuracy</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
              <Text style={styles.statNumber}>{avgTimePerEquation}s</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Avg Time</Text>
            </View>
          </View>

          <View style={[styles.scoreboardContainer, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.scoreboardTitle, { color: '#ffffff' }]}>
              {gameMode === 'times_tables' ? 'Times Tables Summary' : 'Game Summary'}
            </Text>
            {gameMode === 'times_tables' ? (
              <>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Tables Completed:</Text>
                  <Text style={[styles.summaryValue, { color: '#ffffff' }]}>{completedTables.length}/15</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Current Table:</Text>
                  <Text style={[styles.summaryValue, { color: '#ffffff' }]}>{currentTable}×</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Progress:</Text>
                  <Text style={[styles.summaryValue, { color: '#ffffff' }]}>{currentMultiplier}/15</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Total Equations:</Text>
                  <Text style={[styles.summaryValue, { color: '#ffffff' }]}>{equationCount}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Difficulty:</Text>
                  <Text style={[styles.summaryValue, { color: '#ffffff' }]}>{difficulty.toUpperCase()}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Time Played:</Text>
                  <Text style={[styles.summaryValue, { color: '#ffffff' }]}>{gameTime - timeLeft}s</Text>
                </View>
              </>
            )}
          </View>

          <TouchableOpacity style={styles.playAgainButton} onPress={() => setGameState('setup')}>
            <Text style={styles.playAgainButtonText}>🔄 Play Again</Text>
          </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </BackgroundWrapper>
    );
  };

  // Determine status bar style based on theme and background
  const getStatusBarStyle = () => {
    if (backgroundType === 'animated' || backgroundType === 'gradient') {
      return 'light';
    }
    return isDarkMode ? 'light' : 'dark';
  };

  // Show auth screen if not authenticated
  if (!authInitialized) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
          <Text style={{ color: '#fff', fontSize: 18 }}>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (showAuthScreen || !authenticatedUser) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthenticationScreen
          onAuthComplete={async () => {
            const user = authService.getCurrentUser();
            setAuthenticatedUser(user);
            setShowAuthScreen(false);
            
            // Create or load player profile linked to auth user
            let profile = await PlayerStorageService.loadPlayerProfile();
            if (!profile && user) {
              profile = await PlayerStorageService.createNewPlayer(user.displayName, undefined);
            }
            
            // Ensure stored level matches calculated level
            if (profile) {
              const calculatedLevel = getCurrentLevel(profile.experience);
              if (profile.level !== calculatedLevel) {
                profile.level = calculatedLevel;
                await PlayerStorageService.savePlayerProfile(profile);
              }
              setPlayerProfile(profile);
              setGamePlayer(prev => ({ ...prev, name: profile.username }));
            }
            
            // Always set to setup after auth completes
            setGameState('setup');
          }}
          allowOfflineMode={true}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={getStatusBarStyle()} />
      {/* Multiplayer test button (dev only) - Hidden */}
      {/* <View style={{ position: 'absolute', top: 44, right: 16, zIndex: 1000 }}>
        <MultiplayerTestButton />
      </View> */}
      {/* Streak Modal */}
      {showStreakModal && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 32,
            alignItems: 'center',
            maxWidth: 320,
            width: '80%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
          }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔥</Text>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#4CAF50', marginBottom: 8 }}>Daily Streak!</Text>
            <Text style={{ fontSize: 18, color: '#333', marginBottom: 12 }}>You're on a {streakValue} day streak!</Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#4CAF50',
                borderRadius: 8,
                paddingHorizontal: 24,
                paddingVertical: 10,
                marginTop: 10,
              }}
              onPress={() => setShowStreakModal(false)}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Awesome!</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {gameState === 'loading' && (
        <BackgroundWrapper colors={backgroundColors} type={backgroundType} animationType={animationType} style={styles.container}>
          <SafeAreaView style={styles.safeAreaContainer} edges={['top', 'left', 'right']}>
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: getContrastColor(backgroundType, theme) }]}>Loading...</Text>
            </View>
          </SafeAreaView>
        </BackgroundWrapper>
      )}
      {/* Old username setup removed - now handled by AuthenticationScreen */}
      {gameState === 'setup' && renderSetup()}
      {gameState === 'playing' && renderGame()}
      {gameState === 'finished' && renderResults()}
      {gameState === 'bot-battle' && playerProfile && (
        <SimpleMultiplayerGameScreen
          playerProfile={playerProfile}
          difficulty={difficulty}
          gameMode="bot"
          onGameEnd={(results: any) => {
            setMultiplayerResults(results);
            setGameState('multiplayer_results');
          }}
          onBackToMenu={() => setGameState('setup')}
        />
      )}
      {gameState === 'local-1v1' && playerProfile && (
        <SimpleMultiplayerGameScreen
          playerProfile={playerProfile}
          difficulty={difficulty}
          gameMode="local1v1"
          onGameEnd={(results: any) => {
            setMultiplayerResults(results);
            setGameState('multiplayer_results');
          }}
          onBackToMenu={() => setGameState('setup')}
        />
      )}
      {gameState === 'online-pvp' && playerProfile && (
        <OnlineMultiplayerScreen
          playerProfile={playerProfile}
          difficulty={difficulty}
          onGameEnd={async (results: any) => {
            // Calculate experience based on score and difficulty
            const correctAnswers = results.score / 10; // Each correct answer is 10 points
            const baseExp = correctAnswers * 10;
            const difficultyMultiplier = results.difficulty === 'hard' ? 2.0 : results.difficulty === 'medium' ? 1.5 : 1.0;
            
            // Winner gets 50% more XP, tie gets full XP (same as winner), loser gets normal XP
            const isTie = results.winner === 'Tie';
            const winBonus = results.winner === 'You' ? 1.5 : (isTie ? 1.5 : 1.0);
            const experienceGained = Math.floor(baseExp * difficultyMultiplier * winBonus);
            
            // Calculate accuracy correctly: correct answers / total questions
            const accuracy = results.totalQuestions > 0 ? (correctAnswers / results.totalQuestions) * 100 : 0;
            
            // Create a GameResult object for history
            const gameResult = {
              score: correctAnswers, // Store number of correct answers, not points
              totalQuestions: results.totalQuestions || 10,
              accuracy,
              averageTime: 0, // Not tracked in multiplayer
              difficulty: results.difficulty || difficulty,
              coinsEarned: results.coinsEarned || 0,
              experienceGained,
              playedAt: new Date(),
            };
            
            // Save game to history (this also adds coins and XP)
            await PlayerStorageService.saveGameResult(gameResult);
            
            // Check for first tie achievement
            if (isTie) {
              const profile = await PlayerStorageService.loadPlayerProfile();
              if (profile && !profile.unlockedAchievements.includes('first_tie')) {
                // Unlock the first tie achievement
                profile.unlockedAchievements.push('first_tie');
                await PlayerStorageService.savePlayerProfile(profile);
                
                // Award achievement rewards
                await PlayerStorageService.addCoins(100);
                await PlayerStorageService.addExperience(50);
                
                // Show achievement notification
                setTimeout(() => {
                  Alert.alert(
                    '🏆 Achievement Unlocked!',
                    '🤝 Evenly Matched\n\nGet your first tie in online multiplayer\n\nRewards:\n+100 coins\n+50 XP\n+Balanced Badge',
                    [{ text: 'Awesome!', style: 'default' }]
                  );
                }, 500);
              }
            }
            
            // Reload player profile to show updated stats and coins
            const updatedProfile = await PlayerStorageService.loadPlayerProfile();
            if (updatedProfile) {
              setPlayerProfile(updatedProfile);
            }
            
            // Add XP and accuracy to results for display
            const updatedResults = { 
              ...results, 
              experienceGained,
              accuracy, // Add corrected accuracy
              score: correctAnswers, // Update score to show correct answers instead of points
            };
            setMultiplayerResults(updatedResults);
            setGameState('multiplayer_results');
          }}
          onBackToMenu={() => setGameState('setup')}
        />
      )}
      {gameState === 'multiplayer_results' && multiplayerResults && (
        <MultiplayerResultsScreen
          results={multiplayerResults}
          onPlayAgain={() => {
            setMultiplayerResults(null);
            // Return to the previous mode
            if (multiplayerResults.mode === 'bot') {
              setGameState('bot-battle');
            } else if (multiplayerResults.mode === 'local1v1') {
              setGameState('local-1v1');
            } else {
              setGameState('setup');
            }
          }}
          onBackToMenu={() => {
            setMultiplayerResults(null);
            setGameState('setup');
          }}
        />
      )}
      
      {/* Drawing Notepad Overlay */}
      <DrawingNotepad 
        visible={showNotepad} 
        onClose={() => setShowNotepad(false)} 
      />
      
      {/* Player Profile Modal */}
      {playerProfile && (
        <PlayerProfileScreen
          visible={showProfile}
          player={playerProfile}
          onPlayerUpdated={handlePlayerUpdated}
          onProfileReset={handleProfileReset}
          onClose={() => setShowProfile(false)}
          onLogout={async (reset) => {
            // Clear player profile from storage
            await AsyncStorage.removeItem('player_profile');
            
            // Sign out via AuthService
            await authService.signOut();
            setAuthenticatedUser(null);
            setPlayerProfile(null);
            setShowAuthScreen(true);
            
            if (reset) {
              handleProfileReset();
            }
          }}
          backgroundColors={backgroundColors}
          backgroundType={backgroundType}
          animationType={animationType}
          initialTab={profileInitialTab}
          onOpenFriends={() => {
            setShowProfile(false);
            setShowFriends(true);
          }}
        />
      )}

      {/* Friends Screen */}
      {showFriends && playerProfile && (
        <FriendsScreen
          playerProfile={playerProfile}
          onBack={() => {
            setShowFriends(false);
            // Don't open profile, just go back to main menu
          }}
          onRefresh={async () => {
            const profile = await PlayerStorageService.loadPlayerProfile();
            if (profile) {
              setPlayerProfile(profile);
            }
          }}
          backgroundColors={backgroundColors}
          backgroundType={backgroundType}
          onChallengeFriend={handleChallengeFriend}
        />
      )}

      {/* Incoming Challenge Popup */}
      {incomingChallenge && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 25,
            width: '85%',
            maxWidth: 400,
          }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 }}>
              ⚔️ Challenge Received!
            </Text>
            <Text style={{ fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 8 }}>
              {incomingChallenge.from.name} challenges you!
            </Text>
            <Text style={{ fontSize: 16, color: '#999', textAlign: 'center', marginBottom: 25 }}>
              Difficulty: <Text style={{ fontWeight: 'bold', color: '#FF9800' }}>
                {incomingChallenge.difficulty.toUpperCase()}
              </Text>
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#4CAF50', padding: 18, borderRadius: 12, marginBottom: 12 }}
              onPress={handleAcceptChallenge}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
                ✓ Accept Challenge
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: '#f44336', padding: 18, borderRadius: 12 }}
              onPress={handleDeclineChallenge}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
                ✗ Decline
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Shop Modal */}
      {playerProfile && (
        <ShopScreen
          visible={showShop}
          player={playerProfile}
          onPlayerUpdated={handlePlayerUpdated}
          onClose={() => {
            setShowShop(false);
            setTimeout(() => {
              refreshBackground(); // Refresh background when shop closes
            }, 100);
          }}
          activeBackgroundColors={backgroundColors}
          activeBackgroundType={backgroundType}
          activeAnimationType={animationType}
          onBackgroundChanged={() => {
            setTimeout(() => {
              refreshBackground(); // Refresh immediately when background changes
            }, 50);
          }}
        />
      )}
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeAreaContainer: {
    flex: 1,
  },
  gameContent: {
    flex: 1,
    padding: 20,
    paddingTop: 5,
  },
  setupContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 30,
    textAlign: 'center',
  },
  difficultyContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  difficultyLabel: {
    fontSize: 18,
    color: 'white',
    marginBottom: 15,
    fontWeight: '600',
  },
  difficultyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginVertical: 5,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 120,
  },
  selectedDifficulty: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'white',
  },
  difficultyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedDifficultyText: {
    color: '#667eea',
  },
  startButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  startButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gameContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 10,
  },
  quitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  quitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centerInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  equationCounterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },
  timer: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(255, 71, 87, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    position: 'absolute',
    top: 55,
    alignSelf: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  equationCounter: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
  },
  equationContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 15,
    marginBottom: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignSelf: 'center',
  },
  equation: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  singlePlayerContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 5,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  answerInput: {
    borderWidth: 3,
    borderColor: '#333',
    borderRadius: 30, // Pill shape
    paddingHorizontal: 25,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 30,
    minWidth: 200,
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 5,
  },
  answerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    opacity: 1,
  },
  placeholderText: {
    color: '#666666',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  correctText: {
    color: '#ffffff', // White text on green background
    fontWeight: 'bold',
  },
  incorrectText: {
    color: '#ffffff', // White text on red background
    fontWeight: 'bold',
  },
  correctInput: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50', // Solid green background
    borderWidth: 3,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  incorrectInput: {
    borderColor: '#f44336',
    backgroundColor: '#f44336', // Solid red background
    borderWidth: 3,
    shadowColor: '#f44336',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  feedbackContainer: {
    marginTop: 10,
    marginBottom: 20,
    color: 'black',
  },
  feedback: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  correctFeedback: {
    color: '#4CAF50',
  },
  incorrectFeedback: {
    color: '#f44336',
  },
  dismissKeyboardButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  dismissKeyboardText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  notepadButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-end',
    marginRight: 20,
    marginBottom: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minWidth: 35,
    minHeight: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notepadButtonText: {
    fontSize: 18,
    textAlign: 'center',
  },
  resultsContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 20,
  },
  winnerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    minWidth: 80,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  scoreboardContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    minWidth: width * 0.8,
  },
  scoreboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  playAgainButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  playAgainButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  playerInfo: {
    marginTop: 20,
    alignItems: 'center',
  },
  playerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    flex: 1,
  },
  profileButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  shopButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  shopButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  debugButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Removed debug styles for cleaner UI
  keypadContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 10,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 0,
  },

  keypadButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  keypadButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  keypadButtonSpecial: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ff9500',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#ff8c00',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  keypadButtonSpecialText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  keypadButtonSubmit: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#45a049',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  keypadButtonSubmitText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  // New Main Page Styles
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileAvatarText: {
    fontSize: 24,
    color: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileStats: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  profileSubtext: {
    fontSize: 14,
    color: '#999',
  },
  profileArrow: {
    marginLeft: 10,
  },
  profileArrowText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    
  },
  quickActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  gameModesSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  gameModeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gameModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  gameModeIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  gameModeInfo: {
    flex: 1,
  },
  gameModeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  gameModeDescription: {
    fontSize: 14,
    color: '#666',
  },
  difficultySection: {
    marginBottom: 20,
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  difficultyChip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 60,
  },
  selectedDifficultyChip: {
    backgroundColor: '#4CAF50',
  },
  difficultyChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  selectedDifficultyChipText: {
    color: 'white',
  },
  playButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  playButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  comingSoonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  comingSoonHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  comingSoonIcon: {
    fontSize: 32,
    marginRight: 15,
    opacity: 0.6,
  },
  comingSoonInfo: {
    flex: 1,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  comingSoonDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  // Times Tables Mode Styles
  gameModeSelection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    marginHorizontal: 5,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedModeButton: {
    borderColor: '#4CAF50',
    borderWidth: 3,
  },
  modeIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'center',
  },
  modeDescription: {
    fontSize: 12,
    textAlign: 'center',
    flexWrap: 'nowrap',
  },
  timesTableInfo: {
    marginBottom: 20,
  },
  timesTableDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  timesTableProgress: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  someStyleNeedingWidth: {
    minWidth: width * 0.8,
  },
  // Keypad styles - compact numpad layout
  keypad: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'transparent', // Let background show through
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  key: {
    width: 70,
    height: 55,
    backgroundColor: '#000000', // Black background
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1.5,
    borderColor: '#ffffff', // White outline
  },
  keyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff', // White text
  },
  clearKey: {
    backgroundColor: '#000000', // Keep black background
    borderColor: '#ff5722', // Red outline for clear
    borderWidth: 2,
  },
  clearKeyText: {
    color: '#ff5722', // Red text for clear
    fontSize: 18,
  },
  enterKey: {
    backgroundColor: '#000000', // Keep black background
    borderColor: '#4caf50', // Green outline for enter
    borderWidth: 2,
  },
  enterKeyText: {
    color: '#4caf50', // Green text for enter
    fontSize: 18,
  },

  // Multiplayer mode selection styles
  multiplayerModeButton: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  multiplayerModeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  multiplayerModeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  multiplayerModeInfo: {
    flex: 1,
  },
  multiplayerModeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  multiplayerModeDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Text feedback styles
  textFeedbackContainer: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  textFeedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
