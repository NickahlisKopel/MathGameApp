import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PlayerProfile, FriendRequest } from '../types/Player';
import { ServerFriendsService } from '../services/ServerFriendsService';
import { useBackground } from '../hooks/useBackground';
import { useTheme } from '../contexts/ThemeContext';
import { IslandButton } from './IslandButton';
import { IslandCard } from './IslandCard';
import { IslandMenu } from './IslandMenu';

interface FriendsScreenProps {
  playerProfile: PlayerProfile;
  onBack: () => void;
  onRefresh?: () => void;
  backgroundColors?: string[];
  backgroundType?: string;
  onChallengeFriend?: (friendId: string, difficulty: 'easy' | 'medium' | 'hard') => void;
}

const FriendsScreen: React.FC<FriendsScreenProps> = ({
  playerProfile,
  onBack,
  onRefresh,
  backgroundColors: propBackgroundColors,
  backgroundType: propBackgroundType,
  onChallengeFriend,
}) => {
  const { backgroundColors: hookColors, backgroundType: hookType } = useBackground();
  const { theme } = useTheme();
  
  // Use prop colors if provided, otherwise use hook
  const backgroundColors = propBackgroundColors && propBackgroundColors.length >= 2 
    ? propBackgroundColors 
    : (hookColors.length >= 2 ? hookColors : ['#4A90E2', '#63B3ED']);
  const backgroundType = propBackgroundType || hookType;
  const [selectedTab, setSelectedTab] = useState<'friends' | 'requests'>('friends');
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [friendsData, setFriendsData] = useState<{ id: string; username: string; avatar?: string }[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<{ id: string; username: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; name: string } | null>(null);
  const [onlineFriends, setOnlineFriends] = useState<string[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isLookingForGame, setIsLookingForGame] = useState(false);
  const [availableFriends, setAvailableFriends] = useState<{ id: string; name: string; difficulty: string }[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  useEffect(() => {
    // Sync player to server when opening friends screen
    ServerFriendsService.syncPlayer();
    loadFriends();
    checkFriendsStatus();
    setupLookingForGameListeners();
  }, []);

  const setupLookingForGameListeners = async () => {
    try {
      const { socketMultiplayerService } = await import('../services/socketMultiplayerService');
      
      socketMultiplayerService.onAvailableFriendsUpdate = (data: { friends: { id: string; name: string; difficulty: string }[] }) => {
        console.log('[FriendsScreen] Available friends:', data.friends);
        setAvailableFriends(data.friends);
      };
      
      socketMultiplayerService.onFriendStartedLooking = (data: { friend: { id: string; name: string; difficulty: string } }) => {
        console.log('[FriendsScreen] Friend started looking:', data.friend);
        setAvailableFriends(prev => [...prev, data.friend]);
      };
      
      socketMultiplayerService.onFriendStoppedLooking = (data: { friendId: string }) => {
        console.log('[FriendsScreen] Friend stopped looking:', data.friendId);
        setAvailableFriends(prev => prev.filter(f => f.id !== data.friendId));
      };

      // Realtime friend request notification
      socketMultiplayerService.onFriendRequestReceived = async (data: { request: { id: string; fromUserId: string; fromUsername: string } }) => {
        console.log('[FriendsScreen] Realtime friend request received:', data.request);
        Alert.alert('New Friend Request', `${data.request.fromUsername} sent you a friend request!`);
        // Reload friend requests
        const requests = await ServerFriendsService.getFriendRequests();
        setFriendRequests(requests);
      };
    } catch (error) {
      console.error('[FriendsScreen] Error setting up listeners:', error);
    }
  };

  const checkFriendsStatus = async () => {
    try {
      const { socketMultiplayerService } = await import('../services/socketMultiplayerService');
      const { authService } = await import('../services/AuthService');
      
      const user = authService.getCurrentUser();
      if (!user || user.isOffline) {
        console.log('[FriendsScreen] User is offline, skipping status check');
        return;
      }
      
      // Connect if not connected
      if (!socketMultiplayerService.getIsConnected()) {
        console.log('[FriendsScreen] Connecting to socket server...');
        const connected = await socketMultiplayerService.connect('https://mathgameapp.onrender.com', user, playerProfile.id);
        if (!connected) {
          console.error('[FriendsScreen] Failed to connect to socket server');
          return;
        }
        console.log('[FriendsScreen] Successfully connected to socket server');
      }
      
      // Set up status update callback (only once)
      socketMultiplayerService.onFriendsStatusUpdate = (online) => {
        console.log('[FriendsScreen] Received online friends:', online);
        setOnlineFriends(online);
      };
      
      // Request status with current friend IDs
      const requestStatus = async () => {
        if (!socketMultiplayerService.getIsConnected()) {
          console.log('[FriendsScreen] Socket not connected, skipping status request');
          return;
        }
        const friends = await ServerFriendsService.getFriends();
        console.log('[FriendsScreen] Requesting status for friends:', friends);
        if (friends.length > 0) {
          socketMultiplayerService.getFriendsStatus(friends);
        }
      };
      
      // Initial request
      await requestStatus();
      
      // Refresh status every 30 seconds
      const interval = setInterval(() => {
        requestStatus();
      }, 30000);
      
      return () => clearInterval(interval);
    } catch (error) {
      console.error('[FriendsScreen] Error checking friends status:', error);
    }
  };

  const loadFriends = async () => {
    if (isLoadingFriends) {
      console.log('[FriendsScreen] Already loading friends, skipping...');
      return;
    }
    
    setIsLoadingFriends(true);
    try {
      console.log('[FriendsScreen] Loading friends...');
      const friends = await ServerFriendsService.getFriends();
      const requests = await ServerFriendsService.getFriendRequests();
      setFriendIds(friends);
      
      console.log('[FriendsScreen] Fetching usernames for', friends.length, 'friends');
      // Fetch usernames and avatars for each friend
      const friendsWithNames = await Promise.all(
        friends.map(async (friendId) => {
          const friendData = await ServerFriendsService.getPlayerFromServer(friendId);
          console.log('[FriendsScreen] Friend data:', friendId, friendData?.username, friendData?.customization?.avatar);
          return {
            id: friendId,
            username: friendData?.username || friendId,
            avatar: friendData?.customization?.avatar,
          };
        })
      );
      console.log('[FriendsScreen] Friends loaded:', friendsWithNames);
      setFriendsData(friendsWithNames);
      setFriendRequests(requests);
    } catch (error) {
      console.error('[FriendsScreen] Error loading friends:', error);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFriends();
    await checkFriendsStatus();
    onRefresh?.();
    setRefreshing(false);
  };

  const handleSearchChange = async (text: string) => {
    setSearchQuery(text);
    
    if (text.trim().length >= 2) {
      // Search for users as they type
      try {
        const results = await ServerFriendsService.searchPlayers(text.trim());
        setSearchSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error('[FriendsScreen] Error searching:', error);
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: { id: string; username: string }) => {
    setSearchQuery(suggestion.username);
    setShowSuggestions(false);
    // Automatically try to add the friend
    handleAddFriendById(suggestion.id, suggestion.username);
  };

  const handleAddFriendById = async (friendId: string, username: string) => {
    const result = await ServerFriendsService.addFriend(friendId);
    if (result.success) {
      let message: string;
      switch (result.reason) {
        case 'created':
          message = `Friend request sent to ${username}!`;
          break;
        case 'pending_replaced':
          message = `Old pending request replaced. New request sent to ${username}.`;
          break;
        case 'reverse_auto_accepted':
          message = `Their old request was auto-accepted. You are now friends with ${username}!`;
          break;
        default:
          message = `Friend request processed (${result.reason || 'success'}).`;
      }
      Alert.alert('Success', message);
      setSearchQuery('');
      setSearchSuggestions([]);
      await loadFriends();
    } else {
      let errorMessage = result.error || 'Could not send friend request.';
      switch (result.reason) {
        case 'already_friends':
          errorMessage = 'You are already friends with this player.'; break;
        case 'pending_fresh':
          errorMessage = 'You already have a pending request. Wait for a response.'; break;
        case 'reverse_pending':
          errorMessage = 'They already sent you a request. Check Requests tab.'; break;
        case 'rate_limited':
          errorMessage = 'Too many attempts. Please wait before trying again.'; break;
        case 'self_request':
          errorMessage = 'You cannot send a friend request to yourself.'; break;
        case 'player_not_found':
          errorMessage = 'Player not found. Have they opened the app yet?'; break;
      }
      console.error('[FriendsScreen] Add friend failed:', errorMessage, 'reason=', result.reason);
      Alert.alert('Error', errorMessage);
    }
  };

  const handleAddFriend = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a username or friend ID');
      return;
    }

    const query = searchQuery.trim();
    setShowSuggestions(false);
    
    // Check if trying to add self
    if (query === playerProfile.id || query === playerProfile.username) {
      Alert.alert('Error', 'You cannot add yourself as a friend!');
      return;
    }

    // Try to search for player by username or ID
    const searchResults = await ServerFriendsService.searchPlayers(query);
    
    if (searchResults.length === 0) {
      Alert.alert('Not Found', 'No player found with that username or ID.\n\nMake sure they have opened the app at least once.');
      return;
    }
    
    // If multiple results, show list to choose from
    if (searchResults.length > 1) {
      const friendId = searchResults[0].id; // For now, use first result
      const result = await ServerFriendsService.addFriend(friendId);
      
      if (result.success) {
        Alert.alert('Success', `Friend request sent to ${searchResults[0].username}!`);
        setSearchQuery('');
        await loadFriends();
      } else {
        const errorMessage = result.error || 'Could not send friend request. You may already be friends or have a pending request.';
        console.error('[FriendsScreen] Add friend failed:', errorMessage);
        Alert.alert('Error', errorMessage);
      }
      return;
    }
    
    // Single result - send friend request
    const friendId = searchResults[0].id;
    const result = await ServerFriendsService.addFriend(friendId);
    
    if (result.success) {
      Alert.alert('Success', `Friend request sent to ${searchResults[0].username}!`);
      setSearchQuery('');
      await loadFriends();
    } else {
      const errorMessage = result.error || 'Could not send friend request. You may already be friends or have a pending request.';
      console.error('[FriendsScreen] Add friend failed:', errorMessage);
      Alert.alert('Error', errorMessage);
    }
  };

  const handleAcceptRequest = async (requestId: string, username: string) => {
    const success = await ServerFriendsService.acceptFriendRequest(requestId);
    if (success) {
      Alert.alert('Success', `You are now friends with ${username}!`);
      await loadFriends();
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const success = await ServerFriendsService.rejectFriendRequest(requestId);
    if (success) {
      Alert.alert('Rejected', 'Friend request rejected');
      await loadFriends();
    }
  };

  const handleStartLooking = async () => {
    try {
      const { socketMultiplayerService } = await import('../services/socketMultiplayerService');
      
      // Get all friend IDs
      const friends = await ServerFriendsService.getFriends();
      
      setIsLookingForGame(true);
      socketMultiplayerService.startLookingForGame(selectedDifficulty, friends);
    } catch (error) {
      console.error('[FriendsScreen] Error starting to look for game:', error);
      Alert.alert('Error', 'Could not start looking for game');
    }
  };

  const handleStopLooking = async () => {
    try {
      const { socketMultiplayerService } = await import('../services/socketMultiplayerService');
      
      setIsLookingForGame(false);
      setAvailableFriends([]);
      socketMultiplayerService.stopLookingForGame();
    } catch (error) {
      console.error('[FriendsScreen] Error stopping looking for game:', error);
    }
  };

  const handleRemoveFriend = (friendId: string) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const success = await ServerFriendsService.removeFriend(friendId);
            if (success) {
              Alert.alert('Removed', 'Friend has been removed');
              await loadFriends();
            } else {
              Alert.alert('Error', 'Could not remove friend');
            }
          },
        },
      ]
    );
  };

  const handleChallengeFriend = (friendId: string) => {
    const friend = friendsData.find(f => f.id === friendId);
    setSelectedFriend({ id: friendId, name: friend?.username || friendId });
    setShowChallengeModal(true);
  };

  const sendChallenge = (difficulty: 'easy' | 'medium' | 'hard') => {
    if (selectedFriend && onChallengeFriend) {
      onChallengeFriend(selectedFriend.id, difficulty);
      setShowChallengeModal(false);
      setSelectedFriend(null);
    }
  };

  const renderFriendsList = () => (
    <ScrollView
      style={styles.listContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      onScroll={() => setShowSuggestions(false)}
      scrollEventThrottle={400}
    >
      {friendsData.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyText}>No friends yet</Text>
          <Text style={styles.emptySubtext}>
            Add friends to play together!
          </Text>
        </View>
      ) : (
        friendsData.map((friend) => {
          const isOnline = onlineFriends.includes(friend.id);
          return (
            <IslandCard key={friend.id} variant="elevated" padding={0} style={styles.friendCard}>
              <View style={styles.friendCardInner}>
                <View style={styles.friendInfo}>
                  <View style={styles.friendIconContainer}>
                    <Text style={styles.friendIcon}>{(friend.avatar && friend.avatar !== 'default') ? friend.avatar : '👤'}</Text>
                    {isOnline && <View style={styles.onlineDot} />}
                  </View>
                  <View style={styles.friendDetails}>
                    <Text 
                      style={[styles.friendName, { color: theme.colors.text }]} 
                      numberOfLines={1} 
                      ellipsizeMode="tail"
                    >
                      {friend.username}
                    </Text>
                    <Text style={[styles.friendStatus, { color: theme.colors.textSecondary }]}>{isOnline ? '🟢 Online' : 'Offline'}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.friendActionsRow}>
                <TouchableOpacity
                  style={styles.challengeButton}
                  onPress={() => handleChallengeFriend(friend.id)}
                >
                  <Text style={styles.challengeButtonText}>⚔️ Challenge</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveFriend(friend.id)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </IslandCard>
          );
        })
      )}
    </ScrollView>
  );

  const renderRequestsList = () => (
    <ScrollView
      style={styles.listContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      onScroll={() => setShowSuggestions(false)}
      scrollEventThrottle={400}
    >
      {friendRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📬</Text>
          <Text style={styles.emptyText}>No pending requests</Text>
        </View>
      ) : (
        friendRequests.map((request) => (
          <IslandCard key={request.id} variant="elevated" padding={15} style={styles.requestCard}>
            <View style={styles.friendInfo}>
              <Text style={styles.friendIcon}>👤</Text>
              <View style={styles.friendDetails}>
                <Text style={styles.friendName}>{request.fromUsername}</Text>
                <Text style={styles.friendStatus}>
                  Sent {new Date(request.timestamp).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <View style={styles.requestActions}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptRequest(request.id, request.fromUsername)}
              >
                <Text style={styles.acceptButtonText}>✓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleRejectRequest(request.id)}
              >
                <Text style={styles.rejectButtonText}>✗</Text>
              </TouchableOpacity>
            </View>
          </IslandCard>
        ))
      )}
    </ScrollView>
  );

  return (
    <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
      <LinearGradient colors={backgroundColors as [string, string, ...string[]]} style={styles.container}>
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
          {/* Header - Island Style */}
          <View style={styles.header}>
            <IslandButton
              icon="←"
              size="small"
              variant="secondary"
              onPress={onBack}
            />
            <IslandCard variant="elevated" padding={12} style={styles.headerTitleCard}>
              <Text style={styles.headerTitle}>👥 Friends</Text>
            </IslandCard>
            <View style={styles.headerRight} />
          </View>

          {/* Add Friend Section - Island Style */}
          <View style={styles.searchContainer}>
            <IslandCard variant="elevated" style={styles.addFriendSection}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by username"
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCapitalize="none"
                onFocus={() => {
                  if (searchSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddFriend}>
                <Text style={styles.addButtonText}>➕ Add</Text>
              </TouchableOpacity>
            </IslandCard>
            
            {/* Autocomplete Suggestions */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <IslandCard variant="elevated" style={styles.suggestionsCard}>
                <ScrollView style={styles.suggestionsList} keyboardShouldPersistTaps="handled">
                  {searchSuggestions.slice(0, 5).map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.id}
                      style={styles.suggestionItem}
                      onPress={() => selectSuggestion(suggestion)}
                    >
                      <Text style={styles.suggestionIcon}>👤</Text>
                      <View style={styles.suggestionTextContainer}>
                        <Text style={[styles.suggestionUsername, { color: theme.colors.text }]}>
                          {suggestion.username}
                        </Text>
                        <Text style={[styles.suggestionId, { color: theme.colors.textSecondary }]}>
                          {suggestion.id}
                        </Text>
                      </View>
                      <Text style={styles.suggestionArrow}>→</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </IslandCard>
            )}
          </View>

        {/* Tabs - Island Style */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={styles.tabWrapper}
            onPress={() => {
              setSelectedTab('friends');
              setShowSuggestions(false);
            }}
            activeOpacity={0.8}
          >
            <IslandCard
              variant={selectedTab === 'friends' ? "elevated" : "subtle"}
              padding={12}
            >
              <Text style={selectedTab === 'friends' ? styles.activeTabText : styles.tabText}>
                Friends ({friendIds.length})
              </Text>
            </IslandCard>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabWrapper}
            onPress={() => {
              setSelectedTab('requests');
              setShowSuggestions(false);
            }}
            activeOpacity={0.8}
          >
            <IslandCard
              variant={selectedTab === 'requests' ? "elevated" : "subtle"}
              padding={12}
            >
              <Text style={selectedTab === 'requests' ? styles.activeTabText : styles.tabText}>
                Requests ({friendRequests.length})
              </Text>
            </IslandCard>
          </TouchableOpacity>
        </View>

        {/* Looking for Game Section - Temporarily Disabled */}
        {false && selectedTab === 'friends' && (
          <View style={styles.lookingSection}>
            {!isLookingForGame ? (
              <>
                <Text style={styles.lookingSectionTitle}>Find Friends to Play</Text>
                <View style={styles.difficultySelector}>
                  <TouchableOpacity
                    style={[styles.difficultyChip, selectedDifficulty === 'easy' && styles.difficultyChipActive]}
                    onPress={() => setSelectedDifficulty('easy')}
                  >
                    <Text style={[styles.difficultyChipText, selectedDifficulty === 'easy' && styles.difficultyChipTextActive]}>😊 Easy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.difficultyChip, selectedDifficulty === 'medium' && styles.difficultyChipActive]}
                    onPress={() => setSelectedDifficulty('medium')}
                  >
                    <Text style={[styles.difficultyChipText, selectedDifficulty === 'medium' && styles.difficultyChipTextActive]}>🤔 Medium</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.difficultyChip, selectedDifficulty === 'hard' && styles.difficultyChipActive]}
                    onPress={() => setSelectedDifficulty('hard')}
                  >
                    <Text style={[styles.difficultyChipText, selectedDifficulty === 'hard' && styles.difficultyChipTextActive]}>🔥 Hard</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.startLookingButton}
                  onPress={handleStartLooking}
                >
                  <Text style={styles.startLookingButtonText}>🔍 Start Looking for Game</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.lookingSectionTitle}>🔍 Looking for {selectedDifficulty} game...</Text>
                <Text style={styles.lookingSubtext}>Friends who are also looking will appear below</Text>
                <TouchableOpacity
                  style={styles.stopLookingButton}
                  onPress={handleStopLooking}
                >
                  <Text style={styles.stopLookingButtonText}>Stop Looking</Text>
                </TouchableOpacity>
                
                {availableFriends.length > 0 && (
                  <View style={styles.availableFriendsContainer}>
                    <Text style={styles.availableFriendsTitle}>Available Friends:</Text>
                    {availableFriends.map((friend) => (
                      <View key={friend.id} style={styles.availableFriendCard}>
                        <View style={styles.friendInfo}>
                          <Text style={styles.friendIcon}>👤</Text>
                          <View style={styles.friendDetails}>
                            <Text style={styles.friendName}>{friend.name}</Text>
                            <Text style={styles.friendStatus}>Looking for {friend.difficulty} game</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.challengeButton}
                          onPress={() => handleChallengeFriend(friend.id)}
                        >
                          <Text style={styles.challengeButtonText}>⚔️ Challenge</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Content */}
        {selectedTab === 'friends' ? renderFriendsList() : renderRequestsList()}

        {/* My Info - Island Style */}
        <IslandCard variant="floating" style={styles.myIdSection}>
          <Text style={styles.myIdLabel}>Your Username:</Text>
          <Text style={styles.myIdText}>{playerProfile.username}</Text>
          <Text style={styles.myIdSubtext}>Friends can search for you by username!</Text>
        </IslandCard>
      </SafeAreaView>
    </LinearGradient>

    {/* Challenge Modal */}
    {showChallengeModal && selectedFriend && (
      <View style={styles.challengeModalOverlay}>
        <View style={styles.challengeModalContent}>
          <Text style={styles.challengeModalTitle}>Challenge {selectedFriend.name}</Text>
          <Text style={styles.challengeModalSubtitle}>Select Difficulty:</Text>
          
          <TouchableOpacity
            style={[styles.difficultyButton, styles.easyButton]}
            onPress={() => sendChallenge('easy')}
          >
            <Text style={styles.difficultyButtonText}>😊 Easy</Text>
            <Text style={styles.difficultyDescription}>Numbers 1-10</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.difficultyButton, styles.mediumButton]}
            onPress={() => sendChallenge('medium')}
          >
            <Text style={styles.difficultyButtonText}>🤔 Medium</Text>
            <Text style={styles.difficultyDescription}>Numbers 1-20</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.difficultyButton, styles.hardButton]}
            onPress={() => sendChallenge('hard')}
          >
            <Text style={styles.difficultyButtonText}>🔥 Hard</Text>
            <Text style={styles.difficultyDescription}>Numbers 1-50</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setShowChallengeModal(false);
              setSelectedFriend(null);
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 60,
  },
  addFriendSection: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffffff',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 25,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginHorizontal: 15,
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  listContainer: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  friendCard: {
    marginBottom: 10,
    overflow: 'hidden',
  },
  friendCardInner: {
    padding: 15,
    paddingBottom: 0,
  },
  requestCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  friendIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  friendIcon: {
    fontSize: 30,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  friendDetails: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    flexWrap: 'wrap',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  friendStatus: {
    fontSize: 12,
  },
  friendActions: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  friendActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 15,
    paddingBottom: 15,
    justifyContent: 'space-around',
  },
  challengeButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 152, 0, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF9800',
    alignItems: 'center',
  },
  challengeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    flex: 1,
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  rejectButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  myIdSection: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 15,
    margin: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  myIdLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 5,
  },
  myIdText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  myIdSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
  },
  challengeModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  challengeModalContent: {
    backgroundColor: '#000000ff',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
  },
  challengeModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  challengeModalSubtitle: {
    fontSize: 16,
    color: '#ffffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  difficultyButton: {
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  easyButton: {
    backgroundColor: '#4CAF50',
  },
  mediumButton: {
    backgroundColor: '#FF9800',
  },
  hardButton: {
    backgroundColor: '#f44336',
  },
  difficultyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  difficultyDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  cancelButton: {
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000ff',
  },

  lookingSection: {
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 12,
  },
  lookingSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  lookingSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 10,
  },
  difficultyChip: {
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  difficultyChipActive: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderColor: '#fff',
  },
  difficultyChipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  difficultyChipTextActive: {
    color: '#fff',
  },
  startLookingButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  startLookingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stopLookingButton: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  stopLookingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  availableFriendsContainer: {
    marginTop: 15,
  },
  availableFriendsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  difficultySelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  availableFriendCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  headerTitleCard: {
    flex: 1,
    marginHorizontal: 10,
  },
  tabWrapper: {
    flex: 1,
    marginHorizontal: 2,
  },
  searchContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  suggestionsCard: {
    position: 'absolute',
    top: 70,
    left: 15,
    right: 15,
    maxHeight: 250,
    zIndex: 1001,
  },
  suggestionsList: {
    maxHeight: 250,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  suggestionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionUsername: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  suggestionId: {
    fontSize: 12,
  },
  suggestionArrow: {
    fontSize: 18,
    color: '#999',
  },
});

export default FriendsScreen;
