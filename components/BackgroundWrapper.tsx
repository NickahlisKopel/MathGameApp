import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SpaceBackground from './SpaceBackground';
import ForestBackground from './ForestBackground';

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

export const BackgroundWrapper: React.FC<BackgroundWrapperProps> = ({ 
  colors, 
  type, 
  animationType, 
  style, 
  children, 
  onCorrectAnswer, 
  onIncorrectAnswer, 
  feedbackReset 
}) => {
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
