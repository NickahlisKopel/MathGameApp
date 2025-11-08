import React, { useState, useEffect } from 'react';
import { View, Text, Button, ActivityIndicator, StyleSheet } from 'react-native';
import { localMultiplayer } from '../services/localMultiplayer';

interface Props {
  player: { uid: string; username: string; avatar: string };
  onMatched: (lobbyId: string) => void;
}

const MatchmakingButton: React.FC<Props> = ({ player, onMatched }) => {
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listenerUnsub, setListenerUnsub] = useState<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (listenerUnsub) listenerUnsub();
    };
  }, [listenerUnsub]);

  const handleJoinMatchmaking = async () => {
    setSearching(true);
    setError(null);
    try {
      // Connect to local multiplayer
      const connected = await localMultiplayer.connect(player.username);
      if (!connected) {
        throw new Error('Failed to connect to local multiplayer');
      }

      // Create a new game room with AI opponent
      const roomName = `MathGame_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const joined = await localMultiplayer.joinOrCreateRoom(roomName, 2); // 1v1 with AI
      
      if (!joined) {
        throw new Error('Failed to create game room');
      }

      // Simulate finding a match with AI opponent after a short delay
      setTimeout(() => {
        setSearching(false);
        onMatched(roomName);
      }, 1500); // 1.5 second delay to simulate matchmaking

    } catch (e: any) {
      setError(e.message || 'Failed to start matchmaking');
      setSearching(false);
    }
  };

  const handleCancel = async () => {
    setSearching(false);
    if (listenerUnsub) listenerUnsub();
    
    // Disconnect from local multiplayer or leave current room
    if (localMultiplayer.getCurrentRoom()) {
      await localMultiplayer.leaveRoom();
    }
  };

  return (
    <View style={styles.container}>
      {!searching ? (
        <Button title="Find Match" onPress={handleJoinMatchmaking} />
      ) : (
        <View style={styles.searchingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.searchingText}>Searching for opponent...</Text>
          <Button title="Cancel" onPress={handleCancel} />
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 16 },
  searchingContainer: { alignItems: 'center' },
  searchingText: { marginTop: 8, marginBottom: 8, fontSize: 16 },
  error: { color: 'red', marginTop: 8 },
});

export default MatchmakingButton;
