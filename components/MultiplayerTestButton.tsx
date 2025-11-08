import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { localMultiplayer } from '../services/localMultiplayer';
import { localAuth } from '../services/localAuth';

export default function MultiplayerTestButton() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);

  const append = (line: string) => setLogs(prev => [line, ...prev].slice(0, 200));

  const handleClose = () => {
    // Clean up local multiplayer connection when closing
    if (localMultiplayer.getCurrentRoom()) {
      localMultiplayer.leaveRoom();
      append('Left room on close');
    }
    setVisible(false);
  };

  const runTest = async () => {
    setVisible(true);
    setRunning(true);
    append('Starting Local multiplayer test...');
    try {
      // Ensure user is signed in locally
      let user = localAuth.getCurrentUser();
      if (!user) {
        user = await localAuth.signInAnonymously();
      }
      append('Signed in: ' + user.uid);

      // Connect to local multiplayer
      append('Connecting to local multiplayer...');
      const connected = await localMultiplayer.connect(user.displayName || 'TestPlayer');
      if (!connected) {
        throw new Error('Failed to connect to local multiplayer');
      }
      append('Connected to local multiplayer successfully!');

      // Join a test room
      append('Joining test room...');
      const joined = await localMultiplayer.joinOrCreateRoom('LocalTestRoom', 4);
      if (!joined) {
        throw new Error('Failed to join room');
      }
      append('Joined room: LocalTestRoom');
      append('Current players: ' + localMultiplayer.getPlayerCount());

      // Set up event handlers
      localMultiplayer.onGameEvent = (eventCode, data, playerId) => {
        append(`Game event ${eventCode} from ${playerId}: ${JSON.stringify(data)}`);
      };

      localMultiplayer.onPlayerJoined = (player) => {
        append(`Player joined: ${player.name}`);
      };

      localMultiplayer.onPlayerLeft = (player) => {
        append(`Player left: ${player.name}`);
      };

      // Send test events
      append('Sending test events...');
      localMultiplayer.sendGameEvent(99, { 
        message: 'Hello from local multiplayer test!', 
        timestamp: Date.now(),
        testData: { score: 100, level: 5 }
      });
      append('Sent test event (code 99)');

      // Send a mock math question
      localMultiplayer.sendMathQuestion(
        'What is 5 + 3?',
        ['6', '7', '8', '9'],
        2 // Correct answer index (8)
      );
      append('Sent test math question');

      // Send a mock answer
      localMultiplayer.sendPlayerAnswer('question_1', 2, 1500);
      append('Sent test answer');

      append('Test completed! Local AI bots will simulate responses.');
      append('Players in room: ' + localMultiplayer.getPlayerCount());
      append('Room: ' + localMultiplayer.getCurrentRoom());

    } catch (e: any) {
      append('Error: ' + (e.message || String(e)));
    } finally {
      setRunning(false);
    }
  };

  return (
    <View>
      <TouchableOpacity style={styles.button} onPress={runTest}>
        <Text style={styles.buttonText}>Multiplayer Test</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Local Multiplayer Test</Text>
            <ScrollView style={styles.logArea}>
              {logs.map((l, i) => (
                <Text key={i} style={styles.logLine}>{l}</Text>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose} disabled={running}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 640,
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  logArea: {
    backgroundColor: '#f6f6f6',
    padding: 12,
    borderRadius: 8,
    height: 300,
  },
  logLine: {
    fontSize: 12,
    color: '#333',
    marginBottom: 6,
  },
  modalButtons: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600'
  }
});
