import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';
import Svg, { 
  Defs, 
  LinearGradient, 
  Stop, 
  Rect, 
  Circle, 
  Path, 
  G,
  Ellipse
} from 'react-native-svg';

// Create animated components
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

const { width, height } = Dimensions.get('window');

interface Bird {
  id: number;
  x: number;
  y: number;
  size: number;
  wingPhase: number;
  animationDelay: number;
}

interface Tree {
  id: number;
  x: number;
  y: number;
  height: number;
  width: number;
  color: string;
}

interface ForestBackgroundProps {
  children: React.ReactNode;
  treeCount?: number;
  birdCount?: number;
  animated?: boolean;
  onCorrectAnswer?: boolean; // Trigger for correct answer feedback
  onIncorrectAnswer?: boolean; // Trigger for incorrect answer feedback
  feedbackReset?: () => void; // Callback to reset feedback state
}

export const ForestBackground: React.FC<ForestBackgroundProps> = ({
  children,
  treeCount = 8,
  birdCount = 3,
  animated = true,
  onCorrectAnswer = false,
  onIncorrectAnswer = false,
  feedbackReset,
}) => {
  // Temporary feature-flag: set to false to disable forest visuals/animations
  const ENABLE_FOREST = false;
  const birdAnimations = useRef<Animated.Value[]>([]).current;
  const birdXAnimations = useRef<Animated.Value[]>([]).current;
  const birdYAnimations = useRef<Animated.Value[]>([]).current;
  const birdWingAnimations = useRef<Animated.Value[]>([]).current;
  const leafAnimations = useRef<Animated.Value[]>([]).current;
  const windEffect = useRef(new Animated.Value(0)).current;

  // Generate random trees
  const generateTrees = (): Tree[] => {
    return Array.from({ length: treeCount }, (_, i) => ({
      id: i,
      x: (width / treeCount) * i + Math.random() * 30,
      y: height * 0.4 + Math.random() * 100,
      height: 150 + Math.random() * 100,
      width: 40 + Math.random() * 20,
      color: i % 3 === 0 ? '#2E7D32' : i % 3 === 1 ? '#388E3C' : '#4CAF50',
    }));
  };

  // Generate random birds
  const generateBirds = (): Bird[] => {
    return Array.from({ length: birdCount }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: height * 0.2 + Math.random() * height * 0.3,
      size: 8 + Math.random() * 4,
      wingPhase: Math.random() * Math.PI * 2,
      animationDelay: Math.random() * 2000,
    }));
  };

  const trees = useRef(generateTrees()).current;
  const birds = useRef(generateBirds()).current;

  // Initialize animations (disabled when ENABLE_FOREST is false)
  useEffect(() => {
    if (!animated || !ENABLE_FOREST) return;

    // ...existing animation initialization (disabled)
  }, [animated]);

  // Correct answer effect - disabled when forest is disabled
  useEffect(() => {
    if (!ENABLE_FOREST) return;
    if (onCorrectAnswer) {
      // ...celebration effect (disabled)
    }
  }, [onCorrectAnswer]);

  // Incorrect answer effect - disabled when forest is disabled
  useEffect(() => {
    if (!ENABLE_FOREST) return;
    if (onIncorrectAnswer) {
      // ...incorrect effect (disabled)
    }
  }, [onIncorrectAnswer]);

  // Tree trunk path
  const createTreeTrunk = (tree: Tree) => `
    M${tree.x} ${tree.y + tree.height}
    L${tree.x + tree.width} ${tree.y + tree.height}
    L${tree.x + tree.width * 0.7} ${tree.y + tree.height * 0.3}
    L${tree.x + tree.width * 0.3} ${tree.y + tree.height * 0.3}
    Z
  `;

  // Tree canopy path
  const createTreeCanopy = (tree: Tree) => `
    M${tree.x + tree.width * 0.2} ${tree.y + tree.height * 0.2}
    Q${tree.x + tree.width * 0.5} ${tree.y - 20} ${tree.x + tree.width * 0.8} ${tree.y + tree.height * 0.2}
    Q${tree.x + tree.width * 0.5} ${tree.y + tree.height * 0.1} ${tree.x + tree.width * 0.2} ${tree.y + tree.height * 0.2}
    Z
  `;

  // Bird path with wing animation
  const createBirdPath = (bird: Bird, index: number) => {
    const wingOffset = birdWingAnimations[index] ? 
      birdWingAnimations[index].interpolate({
        inputRange: [0, 1],
        outputRange: [0, 5],
      }) : 0;

    return `
      M${bird.x} ${bird.y}
      L${bird.x + bird.size} ${bird.y - bird.size * 0.5}
      L${bird.x + bird.size * 0.5} ${bird.y}
      L${bird.x} ${bird.y + bird.size * 0.3}
      Z
    `;
  };

  // If forest visuals are disabled, just return children unchanged (no SVG or animations)
  if (!ENABLE_FOREST) {
    return <>{children}</>;
  }

  return (
    <Animated.View style={{ flex: 1 }}>
      {/* Forest rendering is enabled by feature flag */}
      <Svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* ...SVG content (kept as before) ... */}
      </Svg>

      {children}
    </Animated.View>
  );
};

export default ForestBackground;
