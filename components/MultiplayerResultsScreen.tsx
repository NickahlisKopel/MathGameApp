import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlayerProfile } from '../types/Player';
import { useBackground } from '../hooks/useBackground';
import { useTheme } from '../contexts/ThemeContext';
import { BackgroundWrapper } from './BackgroundWrapper';

interface GamePlayer {
  id: string;
  name: string;
  score: number;
  answered: boolean;
  timeSpent: number;
}

interface MultiplayerResultsScreenProps {
  results: {
    score: number;
    totalQuestions: number;
    accuracy: number;
    coinsEarned: number;
    experienceGained: number;
    players: GamePlayer[];
    playerProfile: PlayerProfile;
    isMultiplayer: boolean;
  };
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export const MultiplayerResultsScreen: React.FC<MultiplayerResultsScreenProps> = ({
  results,
  onPlayAgain,
  onBackToMenu,
}) => {
  let insets;
  try {
    insets = useSafeAreaInsets();
  } catch (e) {
    // Fallback for when SafeAreaProvider is not available
    insets = { top: 0, bottom: 20, left: 0, right: 0 };
  }
  // Background and theme hooks
  const { backgroundColors, backgroundType, animationType, isLoading: backgroundLoading } = useBackground();
  const { theme } = useTheme();

  // Handle new simple multiplayer format
  let sortedPlayers: any[] = [];
  let myRank = 1;
  let winner: any = null;

  const resultsAny = results as any;

  if (resultsAny.mode === 'bot') {
    // Bot mode results
    sortedPlayers = [
      { id: 'player', name: 'You', score: resultsAny.playerScore, correct: resultsAny.playerCorrect },
      { id: 'bot', name: '🤖 AI Bot', score: resultsAny.botScore, correct: resultsAny.botCorrect }
    ].sort((a, b) => b.score - a.score);
    
    myRank = sortedPlayers.findIndex(p => p.id === 'player') + 1;
    winner = sortedPlayers[0];
  } else if (resultsAny.mode === 'local1v1') {
    // Local 1v1 results
    sortedPlayers = [
      { id: 'player1', name: resultsAny.player1Name, score: resultsAny.player1Score, correct: resultsAny.player1Correct },
      { id: 'player2', name: resultsAny.player2Name, score: resultsAny.player2Score, correct: resultsAny.player2Correct }
    ].sort((a, b) => b.score - a.score);
    
    myRank = 1; // For local games, both players can see results
    winner = sortedPlayers[0];
  } else if (resultsAny.mode === 'online-pvp') {
    // Online PvP results - players array already sorted by score
    sortedPlayers = [...resultsAny.players].sort((a, b) => b.score - a.score);
    // Find "You" player (the one with isWinner property or name matching)
    myRank = sortedPlayers.findIndex(p => p.isWinner !== undefined && p.name !== 'Opponent') + 1;
    if (myRank === 0) {
      // Fallback: find by checking which player has name that's not "Opponent"
      myRank = sortedPlayers.findIndex(p => p.name && !p.name.includes('Opponent') && p.name !== '🤖 AI Bot') + 1;
    }
    // Check for tie
    if (resultsAny.winner === 'Tie') {
      winner = null; // Don't show winner section for ties
    } else {
      winner = sortedPlayers[0];
    }
  } else if (results.players) {
    // Legacy format support
    sortedPlayers = results.players.sort((a, b) => b.score - a.score);
    myRank = sortedPlayers.findIndex(p => p.id === results.playerProfile?.id) + 1;
    winner = sortedPlayers[0];
  }

  return (
    <BackgroundWrapper colors={backgroundColors} type={backgroundType} animationType={animationType} style={styles.container}>
      <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>🏆 Multiplayer Results</Text>
        
        {/* Winner Announcement */}
        {winner && (
          <View style={styles.winnerSection}>
            <Text style={styles.winnerTitle}>🎉 Winner!</Text>
            <Text style={styles.winnerName}>{winner.name}</Text>
            <Text style={styles.winnerScore}>{winner.score} points</Text>
          </View>
        )}
        
        {/* Tie Announcement */}
        {resultsAny.mode === 'online-pvp' && resultsAny.winner === 'Tie' && (
          <View style={styles.tieSection}>
            <Text style={styles.tieTitle}>🤝 It's a Tie!</Text>
            <Text style={styles.tieMessage}>Great match! You both scored equally.</Text>
          </View>
        )}

        {/* Leaderboard */}
        <View style={styles.leaderboard}>
          <Text style={styles.sectionTitle}>Final Leaderboard</Text>
          {sortedPlayers.map((player, index) => {
            let isMyPlayer = false;
            if (resultsAny.mode === 'bot') {
              isMyPlayer = player.id === 'player';
            } else if (resultsAny.mode === 'local1v1') {
              isMyPlayer = false; // Local 1v1 doesn't highlight any player
            } else if (resultsAny.mode === 'online-pvp') {
              // Use myId to identify the current player
              isMyPlayer = resultsAny.myId && player.id === resultsAny.myId;
            } else {
              isMyPlayer = results.playerProfile && player.id === results.playerProfile.id;
            }
            
            return (
              <View key={player.id || `player-${index}`} style={[
                styles.playerRank,
                isMyPlayer && styles.myPlayerRank
              ]}>
                <View style={styles.rankInfo}>
                  <Text style={styles.rankNumber}>#{index + 1}</Text>
                  <Text style={styles.playerName}>{player.name}</Text>
                </View>
                <Text style={styles.playerScore}>{player.score}</Text>
              </View>
            );
          })}
        </View>

        {/* Personal Stats */}
        <View style={styles.personalStats}>
          <Text style={styles.sectionTitle}>Your Performance</Text>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Your Rank:</Text>
            <Text style={styles.statValue}>#{myRank} of {sortedPlayers.length}</Text>
          </View>
          
          {resultsAny.mode === 'bot' && (
            <>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Your Score:</Text>
                <Text style={styles.statValue}>{resultsAny.playerScore} points</Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Correct Answers:</Text>
                <Text style={styles.statValue}>{resultsAny.playerCorrect}</Text>
              </View>
            </>
          )}
          
          {resultsAny.mode === 'local1v1' && (
            <>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Player 1 Score:</Text>
                <Text style={styles.statValue}>{resultsAny.player1Score} points</Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Player 2 Score:</Text>
                <Text style={styles.statValue}>{resultsAny.player2Score} points</Text>
              </View>
            </>
          )}
          
          {results.score !== undefined && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Score:</Text>
              <Text style={styles.statValue}>{results.score}/{results.totalQuestions}</Text>
            </View>
          )}
          
          {results.accuracy !== undefined && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Accuracy:</Text>
              <Text style={styles.statValue}>{results.accuracy}%</Text>
            </View>
          )}
          
          {results.coinsEarned !== undefined && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Coins Earned:</Text>
              <Text style={[styles.statValue, styles.coinsText]}>+{results.coinsEarned} 🪙</Text>
            </View>
          )}
          
          {results.experienceGained !== undefined && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Experience:</Text>
              <Text style={[styles.statValue, styles.expText]}>+{results.experienceGained} XP</Text>
            </View>
          )}
        </View>

        {/* Question Review - Only for online-pvp mode */}
        {resultsAny.mode === 'online-pvp' && resultsAny.questions && resultsAny.questions.length > 0 && (
          <View style={styles.questionsReview}>
            <Text style={styles.sectionTitle}>Question Review</Text>
            {resultsAny.questions.map((q: any, index: number) => {
              const myAnswer = q.answers[resultsAny.myId];
              const opponentAnswer = q.answers[resultsAny.opponentId];
              
              return (
                <View key={index} style={styles.questionCard}>
                  <Text style={styles.questionNumber}>Question {index + 1}</Text>
                  
                  <View style={styles.answersRow}>
                    {/* My Answer with Question */}
                    <View style={[
                      styles.answerBox,
                      myAnswer?.correct ? styles.correctAnswerBox : styles.incorrectAnswerBox
                    ]}>
                      <Text style={styles.answerLabel}>You</Text>
                      {myAnswer && (
                        <>
                          <Text style={styles.questionInBox}>{myAnswer.question}</Text>
                          <Text style={styles.correctAnswerInBox}>
                            Answer: {myAnswer.correctAnswer}
                          </Text>
                        </>
                      )}
                      <Text style={styles.answerValue}>
                        {myAnswer?.answer ?? '—'}
                      </Text>
                      <Text style={styles.answerStatus}>
                        {myAnswer?.correct ? '✓' : '✗'}
                      </Text>
                    </View>
                    
                    {/* Opponent Answer with Question */}
                    <View style={[
                      styles.answerBox,
                      opponentAnswer?.correct ? styles.correctAnswerBox : styles.incorrectAnswerBox
                    ]}>
                      <Text style={styles.answerLabel}>
                        {opponentAnswer?.playerName || 'Opponent'}
                      </Text>
                      {opponentAnswer && (
                        <>
                          <Text style={styles.questionInBox}>{opponentAnswer.question}</Text>
                          <Text style={styles.correctAnswerInBox}>
                            Answer: {opponentAnswer.correctAnswer}
                          </Text>
                        </>
                      )}
                      <Text style={styles.answerValue}>
                        {opponentAnswer?.answer ?? '—'}
                      </Text>
                      <Text style={styles.answerStatus}>
                        {opponentAnswer?.correct ? '✓' : '✗'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.playAgainButton} onPress={onPlayAgain}>
            <Text style={styles.playAgainButtonText}>🎮 Play Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuButton} onPress={onBackToMenu}>
            <Text style={styles.menuButtonText}>🏠 Main Menu</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
    </BackgroundWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Make transparent to show background
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  winnerSection: {
    backgroundColor: '#ffd700',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    alignItems: 'center',
    width: '100%',
  },
  winnerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  winnerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  winnerScore: {
    fontSize: 18,
    color: '#666',
  },
  tieSection: {
    backgroundColor: '#fff9e6',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    width: '90%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  tieTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ff9800',
    marginBottom: 8,
  },
  tieMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  leaderboard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  playerRank: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginVertical: 2,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  myPlayerRank: {
    backgroundColor: '#e8f5e8',
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  rankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 15,
    color: '#666',
    minWidth: 30,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  playerScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  personalStats: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  coinsText: {
    color: '#ff9800',
  },
  expText: {
    color: '#9c27b0',
  },
  questionsReview: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  questionCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  correctAnswerText: {
    fontSize: 14,
    color: '#4caf50',
    marginBottom: 10,
  },
  answersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  answerBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
  },
  correctAnswerBox: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50',
  },
  incorrectAnswerBox: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
  },
  answerLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  questionInBox: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  correctAnswerInBox: {
    fontSize: 11,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  answerValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  answerStatus: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  playAgainButton: {
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  playAgainButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuButton: {
    backgroundColor: '#2196f3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  menuButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MultiplayerResultsScreen;