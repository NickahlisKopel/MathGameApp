import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { localMultiplayer } from '../services/localMultiplayer';

export const LocalMultiplayerTestScreen = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [status, setStatus] = useState('Disconnected');

  useEffect(() => {
    // Set up event handlers for local multiplayer
    localMultiplayer.onPlayerJoined = (player) => {
      setPlayerCount(localMultiplayer.getPlayerCount());
      setStatus(`Player joined: ${player.name}`);
    };

    localMultiplayer.onPlayerLeft = (player) => {
      setPlayerCount(localMultiplayer.getPlayerCount());
      setStatus(`Player left: ${player.name}`);
    };

    localMultiplayer.onRoomCreated = (roomId) => {
      setCurrentRoom(roomId);
      setStatus(`Room created: ${roomId}`);
    };

    localMultiplayer.onGameEvent = (eventCode, data, playerId) => {
      setStatus(`Event ${eventCode} from ${playerId}: ${JSON.stringify(data)}`);
    };

    return () => {
      localMultiplayer.disconnect();
    };
  }, []);

  const handleConnect = async () => {
    try {
      setStatus('Connecting...');
      const success = await localMultiplayer.connect('TestPlayer');
      if (success) {
        setIsConnected(true);
        setStatus('Connected to local multiplayer');
      } else {
        setStatus('Connection failed');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setStatus('Connection error');
    }
  };

  const handleDisconnect = () => {
    localMultiplayer.disconnect();
    setIsConnected(false);
    setCurrentRoom(null);
    setPlayerCount(0);
    setStatus('Disconnected');
  };

  const handleJoinRoom = async () => {
    try {
      setStatus('Joining room...');
      const success = await localMultiplayer.joinOrCreateRoom('TestRoom', 4);
      if (success) {
        setCurrentRoom(localMultiplayer.getCurrentRoom());
        setPlayerCount(localMultiplayer.getPlayerCount());
        setStatus('Joined room successfully');
      } else {
        setStatus('Failed to join room');
      }
    } catch (error) {
      console.error('Room join error:', error);
      setStatus('Room join error');
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await localMultiplayer.leaveRoom();
      setCurrentRoom(null);
      setPlayerCount(0);
      setStatus('Left room');
    } catch (error) {
      console.error('Leave room error:', error);
    }
  };

  const handleSendTestEvent = () => {
    localMultiplayer.sendGameEvent(99, { 
      message: 'Hello from Local Multiplayer!', 
      timestamp: Date.now() 
    });
    setStatus('Sent test event');
  };

  const handleSendMathQuestion = () => {
    localMultiplayer.sendMathQuestion(
      'What is 5 + 3?',
      ['6', '7', '8', '9'],
      2 // Correct answer index
    );
    setStatus('Sent math question');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Local Multiplayer Test Screen</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status: </Text>
        <Text style={[styles.statusValue, { color: isConnected ? 'green' : 'red' }]}>
          {status}
        </Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Connected: {isConnected ? 'Yes' : 'No'}</Text>
        <Text style={styles.infoText}>Room: {currentRoom || 'None'}</Text>
        <Text style={styles.infoText}>Players: {playerCount}</Text>
      </View>

      <View style={styles.buttonContainer}>
        {!isConnected ? (
          <TouchableOpacity style={styles.button} onPress={handleConnect}>
            <Text style={styles.buttonText}>Connect to Local Multiplayer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.button, styles.disconnectButton]} onPress={handleDisconnect}>
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        )}

        {isConnected && !currentRoom && (
          <TouchableOpacity style={styles.button} onPress={handleJoinRoom}>
            <Text style={styles.buttonText}>Join/Create Room</Text>
          </TouchableOpacity>
        )}

        {currentRoom && (
          <>
            <TouchableOpacity style={[styles.button, styles.leaveButton]} onPress={handleLeaveRoom}>
              <Text style={styles.buttonText}>Leave Room</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleSendTestEvent}>
              <Text style={styles.buttonText}>Send Test Event</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleSendMathQuestion}>
              <Text style={styles.buttonText}>Send Math Question</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>
          � Local Multiplayer Mode
        </Text>
        <Text style={styles.noteText}>
          🤖 AI bots simulate other players for testing
        </Text>
        <Text style={styles.noteText}>
          🎮 No internet connection required
        </Text>
        <Text style={styles.noteText}>
          ⚡ Perfect for development and offline testing
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disconnectButton: {
    backgroundColor: '#f44336',
  },
  leaveButton: {
    backgroundColor: '#ff9800',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noteContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  noteText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 5,
  },
});