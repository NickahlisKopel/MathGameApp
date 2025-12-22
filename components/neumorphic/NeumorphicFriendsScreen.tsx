import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { NeumorphicButton } from './NeumorphicButton';
import { NeumorphicCard } from './NeumorphicCard';
import { NeumorphicInput } from './NeumorphicInput';
import { useNeumorphicColors, spacing, typography, neumorphicColors } from '../../styles/neumorphicTheme';
import { PlayerProfile, FriendRequest } from '../../types/Player';
import { ServerFriendsService } from '../../services/ServerFriendsService';

interface NeumorphicFriendsScreenProps {
  playerProfile: PlayerProfile;
  onBack: () => void;
  onRefresh?: () => void;
  onChallengeFriend?: (friendId: string, difficulty: 'easy' | 'medium' | 'hard') => void;
}

type TabType = 'friends' | 'requests';

export const NeumorphicFriendsScreen: React.FC<NeumorphicFriendsScreenProps> = ({
  playerProfile,
  onBack,
  onRefresh,
  onChallengeFriend,
}) => {
  const neumorphicColors = useNeumorphicColors();
  const [selectedTab, setSelectedTab] = useState<TabType>('friends');
  const [friendsData, setFriendsData] = useState<{ id: string; username: string; profileIcon?: string }[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<{ id: string; username: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineFriends, setOnlineFriends] = useState<string[]>([]);

  useEffect(() => {
    ServerFriendsService.syncPlayer();
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const friends = await ServerFriendsService.getFriends();
      const requests = await ServerFriendsService.getFriendRequests();

      const friendsWithNames = await Promise.all(
        friends.map(async (friendId) => {
          const friendData = await ServerFriendsService.getPlayerFromServer(friendId);
          return {
            id: friendId,
            username: friendData?.username || friendId,
            profileIcon: friendData?.customization?.profileIcon,
            exists: !!friendData,
          };
        })
      );

      setFriendsData(friendsWithNames.filter(friend => friend.exists));
      setFriendRequests(requests);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFriends();
    onRefresh?.();
    setRefreshing(false);
  };

  const handleSearchChange = async (text: string) => {
    setSearchQuery(text);

    if (text.trim().length >= 2) {
      try {
        const results = await ServerFriendsService.searchPlayers(text.trim());
        setSearchSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleAddFriend = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    const query = searchQuery.trim();
    setShowSuggestions(false);

    if (query === playerProfile.id || query === playerProfile.username) {
      Alert.alert('Error', 'You cannot add yourself as a friend!');
      return;
    }

    const searchResults = await ServerFriendsService.searchPlayers(query);

    if (searchResults.length === 0) {
      Alert.alert('Not Found', 'No player found with that username.');
      return;
    }

    const friendId = searchResults[0].id;
    const result = await ServerFriendsService.addFriend(friendId);

    if (result.success) {
      Alert.alert('Success', `Friend request sent to ${searchResults[0].username}!`);
      setSearchQuery('');
      await loadFriends();
    } else {
      Alert.alert('Error', result.error || 'Could not send friend request.');
    }
  };

  const handleAcceptRequest = async (requestId: string, username: string) => {
    const success = await ServerFriendsService.acceptFriendRequest(requestId);
    if (success) {
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
      await loadFriends();
      onRefresh?.();
      Alert.alert('Success', `You are now friends with ${username}!`);
    } else {
      Alert.alert('Error', 'Failed to accept friend request.');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const success = await ServerFriendsService.rejectFriendRequest(requestId);
    if (success) {
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
      await loadFriends();
      Alert.alert('Rejected', 'Friend request rejected');
    }
  };

  const handleRemoveFriend = async (friendId: string, username: string) => {
    Alert.alert(
      'Remove Friend',
      `Remove ${username} from your friends list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const success = await ServerFriendsService.removeFriend(friendId);
            if (success) {
              await loadFriends();
              Alert.alert('Removed', `${username} has been removed from your friends list.`);
            } else {
              Alert.alert('Error', 'Failed to remove friend.');
            }
          },
        },
      ]
    );
  };

  const renderFriendsList = () => (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Search Section */}
      <NeumorphicCard variant="raised" padding={spacing.md} style={styles.searchCard}>
        <NeumorphicInput
          icon="🔍"
          placeholder="Search for friends..."
          value={searchQuery}
          onChangeText={handleSearchChange}
        />

        {showSuggestions && searchSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {searchSuggestions.slice(0, 5).map((suggestion) => (
              <TouchableOpacity
                key={suggestion.id}
                onPress={() => {
                  setSearchQuery(suggestion.username);
                  setShowSuggestions(false);
                  handleAddFriend();
                }}
                style={styles.suggestionItem}
              >
                <Text style={styles.suggestionText}>{suggestion.username}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <NeumorphicButton
          title="Add Friend"
          icon="➕"
          onPress={handleAddFriend}
          variant="primary"
          size="medium"
          fullWidth
          style={styles.addButton}
        />
      </NeumorphicCard>

      {/* Friends List */}
      <Text style={styles.sectionTitle}>My Friends ({friendsData.length})</Text>

      {friendsData.length === 0 ? (
        <NeumorphicCard variant="inset" padding={spacing.lg}>
          <Text style={styles.emptyText}>No friends yet. Add some friends to get started!</Text>
        </NeumorphicCard>
      ) : (
        friendsData.map((friend) => (
          <NeumorphicCard key={friend.id} variant="raised" padding={spacing.md} style={styles.friendCard}>
            <View style={styles.friendInfo}>
              <View style={styles.friendAvatar}>
                <Text style={styles.friendAvatarText}>
                  {friend.profileIcon || friend.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.friendDetails}>
                <Text style={styles.friendName}>{friend.username}</Text>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusDot, onlineFriends.includes(friend.id) && styles.statusOnline]} />
                  <Text style={styles.statusText}>
                    {onlineFriends.includes(friend.id) ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.friendActions}>
              {onChallengeFriend && onlineFriends.includes(friend.id) && (
                <NeumorphicButton
                  title="Challenge"
                  icon="⚔️"
                  onPress={() => onChallengeFriend(friend.id, 'medium')}
                  variant="success"
                  size="small"
                  style={styles.actionButton}
                />
              )}
              <NeumorphicButton
                title="Remove"
                icon="✕"
                onPress={() => handleRemoveFriend(friend.id, friend.username)}
                variant="error"
                size="small"
                style={styles.actionButton}
              />
            </View>
          </NeumorphicCard>
        ))
      )}
    </ScrollView>
  );

  const renderRequestsList = () => (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>Friend Requests ({friendRequests.length})</Text>

      {friendRequests.length === 0 ? (
        <NeumorphicCard variant="inset" padding={spacing.lg}>
          <Text style={styles.emptyText}>No friend requests</Text>
        </NeumorphicCard>
      ) : (
        friendRequests.map((request) => (
          <NeumorphicCard key={request.id} variant="floating" padding={spacing.md} style={styles.requestCard}>
            <View style={styles.requestInfo}>
              <View style={styles.requestAvatar}>
                <Text style={styles.requestAvatarText}>
                  {request.fromUsername.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.requestDetails}>
                <Text style={styles.requestName}>{request.fromUsername}</Text>
                <Text style={styles.requestDate}>Friend Request</Text>
              </View>
            </View>

            <View style={styles.requestActions}>
              <NeumorphicButton
                title="Accept"
                icon="✓"
                onPress={() => handleAcceptRequest(request.id, request.fromUsername)}
                variant="success"
                size="small"
                style={styles.requestButton}
              />
              <NeumorphicButton
                title="Reject"
                icon="✕"
                onPress={() => handleRejectRequest(request.id)}
                variant="error"
                size="small"
                style={styles.requestButton}
              />
            </View>
          </NeumorphicCard>
        ))
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <NeumorphicButton icon="←" title="" size="small" variant="primary" onPress={onBack} />
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setSelectedTab('friends')} style={styles.tabButton}>
          <NeumorphicCard
            variant={selectedTab === 'friends' ? 'inset' : 'raised'}
            padding={spacing.sm}
            style={styles.tab}
          >
            <Text style={[styles.tabText, selectedTab === 'friends' && styles.tabTextActive]}>
              Friends
              {friendRequests.length > 0 && selectedTab !== 'friends' && (
                <Text style={styles.badge}> • </Text>
              )}
            </Text>
          </NeumorphicCard>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setSelectedTab('requests')} style={styles.tabButton}>
          <NeumorphicCard
            variant={selectedTab === 'requests' ? 'inset' : 'raised'}
            padding={spacing.sm}
            style={styles.tab}
          >
            <Text style={[styles.tabText, selectedTab === 'requests' && styles.tabTextActive]}>
              Requests
              {friendRequests.length > 0 && (
                <Text style={styles.badge}> ({friendRequests.length})</Text>
              )}
            </Text>
          </NeumorphicCard>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {selectedTab === 'friends' ? renderFriendsList() : renderRequestsList()}
    </View>
  );
};
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: neumorphicColors.background.main,
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
      ...typography.body,
      color: neumorphicColors.text.secondary,
    },
    tabTextActive: {
      color: neumorphicColors.primary.main,
      fontWeight: '600',
    },
    badge: {
      color: neumorphicColors.error.main,
      fontWeight: 'bold',
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    searchCard: {
      marginBottom: spacing.lg,
    },
    suggestionsContainer: {
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    suggestionItem: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: neumorphicColors.background.light,
      borderRadius: 8,
      marginBottom: spacing.xs,
    },
    suggestionText: {
      ...typography.body,
      color: neumorphicColors.text.primary,
    },
    addButton: {
      marginTop: spacing.md,
    },
    sectionTitle: {
      ...typography.h3,
      color: neumorphicColors.text.primary,
      fontWeight: '600',
      marginBottom: spacing.md,
    },
    emptyText: {
      ...typography.body,
      color: neumorphicColors.text.disabled,
      textAlign: 'center',
    },
    friendCard: {
      marginBottom: spacing.md,
    },
    friendInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    friendAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: neumorphicColors.primary.light,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    friendAvatarText: {
      ...typography.h3,
      color: neumorphicColors.primary.main,
      fontWeight: 'bold',
    },
    friendDetails: {
      flex: 1,
    },
    friendName: {
      ...typography.body,
      color: neumorphicColors.text.primary,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: neumorphicColors.text.disabled,
      marginRight: spacing.xs,
    },
    statusOnline: {
      backgroundColor: neumorphicColors.success.main,
    },
    statusText: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
    },
    friendActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    actionButton: {
      flex: 1,
    },
    requestCard: {
      marginBottom: spacing.md,
      borderWidth: 2,
      borderColor: neumorphicColors.primary.light,
    },
    requestInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    requestAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: neumorphicColors.secondary.light,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    requestAvatarText: {
      ...typography.h3,
      color: neumorphicColors.secondary.main,
      fontWeight: 'bold',
    },
    requestDetails: {
      flex: 1,
    },
    requestName: {
      ...typography.body,
      color: neumorphicColors.text.primary,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    requestDate: {
      ...typography.caption,
      color: neumorphicColors.text.secondary,
    },
    requestActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    requestButton: {
      flex: 1,
    },
  });
