import { GameResult } from '../types/Player';

export interface RewardCalculation {
  coins: number;
  experience: number;
  bonuses: {
    accuracy: number;
    speed: number;
    difficulty: number;
    streak: number;
    perfect: number;
  };
  breakdown: string[];
}

export class GameRewards {
  // Base rewards per correct answer
  private static readonly BASE_COINS_PER_ANSWER = 5;
  private static readonly BASE_EXP_PER_ANSWER = 10;

  // Difficulty multipliers
  private static readonly DIFFICULTY_MULTIPLIERS = {
    easy: 1.0,
    medium: 1.5,
    hard: 2.0,
  };

  // Accuracy bonus thresholds
  private static readonly ACCURACY_BONUSES = [
    { threshold: 100, multiplier: 2.0, name: 'Perfect Score!' },
    { threshold: 90, multiplier: 1.5, name: 'Excellent!' },
    { threshold: 80, multiplier: 1.3, name: 'Great Job!' },
    { threshold: 70, multiplier: 1.1, name: 'Good Work!' },
  ];

  // Speed bonus thresholds (average seconds per answer)
  private static readonly SPEED_BONUSES = [
    { threshold: 2, multiplier: 1.8, name: 'Lightning Fast!' },
    { threshold: 3, multiplier: 1.5, name: 'Very Quick!' },
    { threshold: 4, multiplier: 1.3, name: 'Quick Thinking!' },
    { threshold: 5, multiplier: 1.1, name: 'Good Speed!' },
  ];

  /**
   * Calculate total rewards for a game
   */
  static calculateRewards(
    score: number,
    totalQuestions: number,
    accuracy: number,
    averageTime: number,
    difficulty: 'easy' | 'medium' | 'hard',
    streak: number = 0
  ): RewardCalculation {
    const breakdown: string[] = [];
    let totalCoins = 0;
    let totalExperience = 0;
    let bonuses = {
      accuracy: 0,
      speed: 0,
      difficulty: 0,
      streak: 0,
      perfect: 0,
    };

    // Base rewards
    const baseCoins = score * this.BASE_COINS_PER_ANSWER;
    const baseExp = score * this.BASE_EXP_PER_ANSWER;
    totalCoins += baseCoins;
    totalExperience += baseExp;
    breakdown.push(`Base: ${score} correct × ${this.BASE_COINS_PER_ANSWER} = ${baseCoins} coins`);

    // Difficulty bonus
    const difficultyMultiplier = this.DIFFICULTY_MULTIPLIERS[difficulty];
    if (difficultyMultiplier > 1) {
      const difficultyBonus = Math.round(baseCoins * (difficultyMultiplier - 1));
      bonuses.difficulty = difficultyBonus;
      totalCoins += difficultyBonus;
      totalExperience += Math.round(baseExp * (difficultyMultiplier - 1));
      breakdown.push(`${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} difficulty: +${difficultyBonus} coins`);
    }

    // Accuracy bonus
    const accuracyBonus = this.getAccuracyBonus(accuracy, baseCoins);
    if (accuracyBonus.bonus > 0) {
      bonuses.accuracy = accuracyBonus.bonus;
      totalCoins += accuracyBonus.bonus;
      totalExperience += Math.round(accuracyBonus.bonus * 2);
      breakdown.push(`${accuracyBonus.name}: +${accuracyBonus.bonus} coins`);
    }

    // Speed bonus
    const speedBonus = this.getSpeedBonus(averageTime, baseCoins);
    if (speedBonus.bonus > 0) {
      bonuses.speed = speedBonus.bonus;
      totalCoins += speedBonus.bonus;
      totalExperience += Math.round(speedBonus.bonus * 1.5);
      breakdown.push(`${speedBonus.name}: +${speedBonus.bonus} coins`);
    }

    // Perfect game bonus
    if (accuracy === 100 && score === totalQuestions) {
      const perfectBonus = Math.round(baseCoins * 0.5);
      bonuses.perfect = perfectBonus;
      totalCoins += perfectBonus;
      totalExperience += perfectBonus * 2;
      breakdown.push(`Perfect Game: +${perfectBonus} coins`);
    }

    // Streak bonus (if implemented)
    if (streak > 1) {
      const streakMultiplier = Math.min(1 + (streak - 1) * 0.1, 2.0); // Max 2x from streak
      const streakBonus = Math.round(baseCoins * (streakMultiplier - 1));
      bonuses.streak = streakBonus;
      totalCoins += streakBonus;
      totalExperience += streakBonus;
      breakdown.push(`${streak} game streak: +${streakBonus} coins`);
    }

    // Participation bonus (minimum reward)
    const minimumReward = 10;
    if (totalCoins < minimumReward) {
      const participationBonus = minimumReward - totalCoins;
      totalCoins = minimumReward;
      breakdown.push(`Participation bonus: +${participationBonus} coins`);
    }

    return {
      coins: Math.round(totalCoins),
      experience: Math.round(totalExperience),
      bonuses,
      breakdown,
    };
  }

  /**
   * Get accuracy bonus
   */
  private static getAccuracyBonus(accuracy: number, baseCoins: number): { bonus: number; name: string } {
    for (const tier of this.ACCURACY_BONUSES) {
      if (accuracy >= tier.threshold) {
        return {
          bonus: Math.round(baseCoins * (tier.multiplier - 1)),
          name: tier.name,
        };
      }
    }
    return { bonus: 0, name: '' };
  }

  /**
   * Get speed bonus
   */
  private static getSpeedBonus(averageTime: number, baseCoins: number): { bonus: number; name: string } {
    for (const tier of this.SPEED_BONUSES) {
      if (averageTime <= tier.threshold) {
        return {
          bonus: Math.round(baseCoins * (tier.multiplier - 1)),
          name: tier.name,
        };
      }
    }
    return { bonus: 0, name: '' };
  }

  /**
   * Create a game result with calculated rewards
   */
  static createGameResult(
    score: number,
    totalQuestions: number,
    gameTimeSeconds: number,
    difficulty: 'easy' | 'medium' | 'hard',
    streak: number = 0
  ): GameResult {
    const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const averageTime = totalQuestions > 0 ? gameTimeSeconds / totalQuestions : 0;

    const rewards = this.calculateRewards(
      score,
      totalQuestions,
      accuracy,
      averageTime,
      difficulty,
      streak
    );

    return {
      score,
      totalQuestions,
      accuracy,
      averageTime,
      difficulty,
      coinsEarned: rewards.coins,
      experienceGained: rewards.experience,
      playedAt: new Date(),
    };
  }

  /**
   * Get readable reward summary
   */
  static getRewardSummary(rewards: RewardCalculation): string {
    let summary = `🪙 ${rewards.coins} coins, 🌟 ${rewards.experience} XP earned!\n\n`;
    
    if (rewards.breakdown.length > 0) {
      summary += 'Breakdown:\n';
      rewards.breakdown.forEach(line => {
        summary += `• ${line}\n`;
      });
    }

    return summary.trim();
  }

  /**
   * Calculate level from experience
   */
  static calculateLevel(experience: number): number {
    return Math.floor(Math.sqrt(experience / 100)) + 1;
  }

  /**
   * Calculate experience needed for next level
   */
  static getExperienceForLevel(level: number): number {
    return Math.pow(level - 1, 2) * 100;
  }

  /**
   * Calculate coins earned from leveling up
   */
  static getLevelUpReward(newLevel: number): number {
    return newLevel * 50;
  }
}
