import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { localMultiplayer } from '../services/localMultiplayer';

interface LobbyScreenProps {
  lobbyId: string;
  onLeave: () => void;
}

interface Player {
  username: string;
  uid?: string;
  avatar?: string;
}

interface Lobby {
  players: Player[];
  status: string;
}

export default function LobbyScreen({ lobbyId, onLeave }: LobbyScreenProps) {
  const [lobby, setLobby] = useState<Lobby>({ 
    players: [{ username: 'You' }], 
    status: 'waiting' 
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Connect to local multiplayer room and get player data
    console.log('Joined lobby:', lobbyId);
    
    // Set up event handlers for local multiplayer
    localMultiplayer.onPlayerJoined = (player) => {
      setLobby((prev: Lobby) => ({
        ...prev,
        players: [...prev.players, { username: player.name }]
      }));
    };

    localMultiplayer.onPlayerLeft = (player) => {
      setLobby((prev: Lobby) => ({
        ...prev,
        players: prev.players.filter((p: Player) => p.username !== player.name)
      }));
    };

    // Initialize with current players
    const currentPlayers = localMultiplayer.getPlayerCount();
    setLobby({
      players: [
        { username: 'You' },
        ...Array.from({ length: currentPlayers - 1 }, (_, i) => ({ username: `AI Bot ${i + 1}` }))
      ],
      status: currentPlayers >= 2 ? 'ready' : 'waiting'
    });
  }, [lobbyId]);

  if (loading || !lobby) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading lobby...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>1v1 Lobby</Text>
      <View style={styles.playersContainer}>
        {lobby.players.map((p: Player, idx: number) => (
          <View key={p.uid || idx} style={styles.playerCard}>
            {p.avatar ? (
              <Image source={{ uri: p.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}><Text>{p.username.charAt(0).toUpperCase()}</Text></View>
            )}
            <Text style={styles.playerName}>{p.username}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.status}>Status: {lobby.status}</Text>
      <Button title="Leave Lobby" onPress={onLeave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24 },
  playersContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  playerCard: { alignItems: 'center', marginHorizontal: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, marginBottom: 8 },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  playerName: { fontSize: 18, fontWeight: 'bold' },
  status: { fontSize: 16, marginBottom: 16 },
});
