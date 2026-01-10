import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';
import Svg, { 
  Defs, 
  LinearGradient, 
  Stop, 
  Rect, 
  Circle, 
  Path, 
  G 
} from 'react-native-svg';

// Create animated components
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width, height } = Dimensions.get('window');

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  animationDelay: number;
}

interface SpaceBackgroundProps {
  children: React.ReactNode;
  starCount?: number;
  spaceshipVisible?: boolean;
  animated?: boolean;
  onCorrectAnswer?: boolean; // Trigger for correct answer feedback
  onIncorrectAnswer?: boolean; // Trigger for incorrect answer feedback
  feedbackReset?: () => void; // Callback to reset feedback state
}

export const SpaceBackground: React.FC<SpaceBackgroundProps> = ({
  children,
  starCount = 50,
  spaceshipVisible = true,
  animated = true,
  onCorrectAnswer = false,
  onIncorrectAnswer = false,
  feedbackReset,
}) => {
  const spaceshipAnim = useRef(new Animated.Value(0)).current;
  const spaceshipX = useRef(new Animated.Value(width * 0.5)).current;
  const spaceshipY = useRef(new Animated.Value(height * 0.3)).current;
  const spaceshipRotation = useRef(new Animated.Value(0)).current;
  const thrusterIntensity = useRef(new Animated.Value(0.5)).current;
  const starAnimations = useRef<Animated.Value[]>([]).current;
  
  // Spaceship movement direction and speed
  const spaceshipVelocity = useRef({ x: 0.8, y: 0.3 }).current; // Slower, more weighted movement
  const baseSpeed = useRef({ x: 0.8, y: 0.3 }).current; // Store original speeds for restoration
  const spaceshipAngle = useRef(new Animated.Value(0)).current; // Track spaceship's facing direction in degrees
  const idleRotationSpeed = useRef(1.2); // Faster, more noticeable rotation while floating

  // Generate random stars
  const generateStars = (): Star[] => {
    return Array.from({ length: starCount }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 1, // Size between 1-4
      opacity: Math.random() * 0.8 + 0.2, // Opacity between 0.2-1
      animationDelay: Math.random() * 3000, // Delay up to 3 seconds
    }));
  };

  const stars = useRef(generateStars()).current;

  // Helper functions for angle-based movement
  const updateVelocityFromAngle = (angle: number, speed: number = 2) => {
    // Convert angle to radians and calculate velocity components
    const radians = (angle * Math.PI) / 180;
    spaceshipVelocity.x = Math.cos(radians) * speed;
    spaceshipVelocity.y = Math.sin(radians) * speed;
  };

  const getAngleFromVelocity = () => {
    // Calculate angle from current velocity
    return (Math.atan2(spaceshipVelocity.y, spaceshipVelocity.x) * 180) / Math.PI;
  };

  const rotateSpaceshipToAngle = (targetAngle: number, duration: number = 300) => {
    // Smooth rotation to target angle
    spaceshipAngle.setValue(targetAngle);
    Animated.timing(spaceshipRotation, {
      toValue: targetAngle,
      duration,
      useNativeDriver: false,
    }).start();
  };

  // Free-gliding spaceship movement with proper rotation
  useEffect(() => {
    if (!animated) return;

    // Initialize star animation values
    stars.forEach((_, index) => {
      if (!starAnimations[index]) {
        starAnimations[index] = new Animated.Value(0.2);
      }
    });

    // Start star twinkling animations
    const starAnimationSequences = stars.map((star, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(star.animationDelay),
          Animated.timing(starAnimations[index], {
            toValue: 1,
            duration: 1000 + Math.random() * 2000,
            useNativeDriver: false,
          }),
          Animated.timing(starAnimations[index], {
            toValue: 0.2,
            duration: 1000 + Math.random() * 2000,
            useNativeDriver: false,
          }),
        ])
      );
    });

    // Free-gliding spaceship movement with weighted physics and gentle rotation
    const moveSpaceship = () => {
      const currentX = (spaceshipX as any)._value;
      const currentY = (spaceshipY as any)._value;
      const currentThrusterPower = (thrusterIntensity as any)._value;
      const currentAngle = (spaceshipAngle as any)._value;
      
      // Apply thruster influence to velocity with more realistic scaling
      // When thrusters are more powerful, increase forward momentum
      const thrusterMultiplier = 1 + (currentThrusterPower - 0.5) * 1.5; // Reduced from 2x to 1.5x for smoother feel
      const effectiveVelocityX = spaceshipVelocity.x * thrusterMultiplier;
      const effectiveVelocityY = spaceshipVelocity.y * thrusterMultiplier;
      
      // Calculate new position with weighted movement (slower, more deliberate)
      let newX = currentX + effectiveVelocityX * 1.2; // Reduced multiplier for heavier feel
      let newY = currentY + effectiveVelocityY * 1.2;
      
      // Gentle idle rotation while floating through space
      const newRotation = currentAngle + idleRotationSpeed.current;
      spaceshipAngle.setValue(newRotation % 360); // Keep angle in 0-360 range
      
      // Apply gentle continuous rotation
      Animated.timing(spaceshipRotation, {
        toValue: newRotation,
        duration: 200, // Smooth rotation updates
        useNativeDriver: false,
      }).start();
      
      // Bounce off borders with smooth momentum transfer
      const padding = 60; // Slightly larger padding for smoother bounces
      let shouldAdjustVelocity = false;
      
      if (newX <= padding || newX >= width - padding) {
        // Gradual velocity reflection for weighted feel
        spaceshipVelocity.x *= -0.85; // Slight energy loss on bounce for realism
        newX = Math.max(padding, Math.min(width - padding, newX));
        shouldAdjustVelocity = true;
      }
      
      if (newY <= height * 0.1 || newY >= height * 0.7) {
        // Gradual velocity reflection for weighted feel
        spaceshipVelocity.y *= -0.85; // Slight energy loss on bounce for realism
        newY = Math.max(height * 0.1, Math.min(height * 0.7, newY));
        shouldAdjustVelocity = true;
      }
      
      // When bouncing, temporarily slow down rotation for impact effect
      if (shouldAdjustVelocity) {
        idleRotationSpeed.current = 0.4; // Slow rotation during bounce
        
        // Restore normal rotation speed after a moment
        setTimeout(() => {
          idleRotationSpeed.current = 1.2;
        }, 1000);
      }
      
      // Smooth, weighted movement to new position
      Animated.parallel([
        Animated.timing(spaceshipX, {
          toValue: newX,
          duration: 150, // Slightly slower for heavier feel
          useNativeDriver: false,
        }),
        Animated.timing(spaceshipY, {
          toValue: newY,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    };

    // Initialize spaceship rotation to match initial movement direction
    const initialAngle = getAngleFromVelocity();
    spaceshipAngle.setValue(initialAngle);
    spaceshipRotation.setValue(initialAngle);

    // Start continuous movement with heavier feel
    const movementInterval = setInterval(moveSpaceship, 120); // Slightly slower updates for weight
    
    // Start star animations
    starAnimationSequences.forEach(anim => anim.start());

    return () => {
      clearInterval(movementInterval);
      starAnimationSequences.forEach(anim => anim.stop());
    };
  }, [animated]);

  // Feedback effects for correct/incorrect answers
  useEffect(() => {
    if (onCorrectAnswer) {
      // Correct answer: Powerful thruster boost in nose direction
      
      // Get current facing direction and apply forward thrust
      const currentAngle = (spaceshipAngle as any)._value;
      const baseSpeed = 1.2; // Reduced for more weight
      
      // Apply powerful but weighted forward momentum
      updateVelocityFromAngle(currentAngle, baseSpeed * 2.0); // Reduced from 2.5x to 2.0x for heavier feel
      
      // Temporarily increase rotation speed for dramatic effect
      idleRotationSpeed.current = 2.0;
      
      Animated.sequence([
        // Gradual thruster buildup - like a heavy engine starting
        Animated.timing(thrusterIntensity, {
          toValue: 1.8, // Slightly reduced max thrust
          duration: 250, // Slower buildup for weight
          useNativeDriver: false,
        }),
        // Maintain high thrust for longer
        Animated.delay(500),
        // Very gradual reduction for momentum feel
        Animated.timing(thrusterIntensity, {
          toValue: 0.7, // Higher than normal for extended momentum
          duration: 800, // Much longer tail-off
          useNativeDriver: false,
        }),
        // Final return to normal - even more gradual
        Animated.timing(thrusterIntensity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: false,
        }),
      ]).start(() => {
        // Gradual velocity restoration with weight
        const restoreVelocity = () => {
          // Apply longer residual momentum
          updateVelocityFromAngle(currentAngle, baseSpeed * 1.4); // Stronger residual
          
          // Restore rotation speed
          idleRotationSpeed.current = 1.2;
          
          // Much longer momentum tail-off
          setTimeout(() => {
            updateVelocityFromAngle(currentAngle, baseSpeed * 1.1); // Intermediate speed
            
            setTimeout(() => {
              updateVelocityFromAngle(currentAngle, baseSpeed); // Final normal speed
            }, 1500);
          }, 1500);
        };
        
        restoreVelocity();
        feedbackReset?.();
      });
    }
  }, [onCorrectAnswer]);

  useEffect(() => {
    if (onIncorrectAnswer) {
      // Incorrect answer: Engine failure with momentum loss
      
      // Get current facing direction
      const currentAngle = (spaceshipAngle as any)._value;
      const baseSpeed = 1.2; // Match the corrected answer base speed
      
      // Reduce velocity gradually to simulate heavy spacecraft losing power
      updateVelocityFromAngle(currentAngle, baseSpeed * 0.4); // Less dramatic for weighted feel
      
      // Slow down rotation during engine failure
      idleRotationSpeed.current = 0.2;
      
      Animated.sequence([
        // Immediate engine failure - thrusters cut out
        Animated.timing(thrusterIntensity, {
          toValue: 0.05, // Nearly complete engine failure
          duration: 150,
          useNativeDriver: false,
        }),
        // Shake effect while engines are sputtering
        Animated.parallel([
          // Rotation shake
          Animated.sequence([
            Animated.timing(spaceshipRotation, {
              toValue: -15,
              duration: 80,
              useNativeDriver: false,
            }),
            Animated.timing(spaceshipRotation, {
              toValue: 15,
              duration: 80,
              useNativeDriver: false,
            }),
            Animated.timing(spaceshipRotation, {
              toValue: -10,
              duration: 80,
              useNativeDriver: false,
            }),
            Animated.timing(spaceshipRotation, {
              toValue: 5,
              duration: 80,
              useNativeDriver: false,
            }),
            Animated.timing(spaceshipRotation, {
              toValue: 0,
              duration: 100,
              useNativeDriver: false,
            }),
          ]),
          // Engine sputtering - irregular thruster activity
          Animated.sequence([
            Animated.timing(thrusterIntensity, {
              toValue: 0.2,
              duration: 100,
              useNativeDriver: false,
            }),
            Animated.timing(thrusterIntensity, {
              toValue: 0.05,
              duration: 100,
              useNativeDriver: false,
            }),
            Animated.timing(thrusterIntensity, {
              toValue: 0.15,
              duration: 100,
              useNativeDriver: false,
            }),
            Animated.timing(thrusterIntensity, {
              toValue: 0.08,
              duration: 100,
              useNativeDriver: false,
            }),
          ]),
        ]),
        // Very gradual engine recovery for heavy spacecraft feel
        Animated.timing(thrusterIntensity, {
          toValue: 0.25,
          duration: 600, // Longer recovery
          useNativeDriver: false,
        }),
        // Slow full recovery
        Animated.timing(thrusterIntensity, {
          toValue: 0.5,
          duration: 800, // Even longer
          useNativeDriver: false,
        }),
      ]).start(() => {
        // Gradually restore normal velocity and rotation
        const restoreVelocity = () => {
          // Very slow recovery for weighted feel
          updateVelocityFromAngle(currentAngle, baseSpeed * 0.6);
          
          // Gradual rotation speed recovery
          setTimeout(() => {
            idleRotationSpeed.current = 0.7;
            updateVelocityFromAngle(currentAngle, baseSpeed * 0.8);
            
            // Final restoration
            setTimeout(() => {
              idleRotationSpeed.current = 1.2;
              updateVelocityFromAngle(currentAngle, baseSpeed);
            }, 1200);
          }, 1200);
        };
        
        restoreVelocity();
        feedbackReset?.();
      });
    }
  }, [onIncorrectAnswer]);

  // Spaceship SVG paths - redesigned to point right (0 degrees) as baseline
  const spaceshipBodyPath = `
    M10 50 
    L20 40 
    L35 35 
    L50 40 
    L55 45 
    L55 55 
    L50 60 
    L35 65 
    L20 60 
    L10 50 Z
  `;

  const spaceshipWingPath = `
    M25 35 L30 25 L40 30 L35 40 Z
    M25 65 L30 75 L40 70 L35 60 Z
  `;

  // Dynamic thruster effects based on intensity (expanded range for new feedback system)
  const thrusterSize = thrusterIntensity.interpolate({
    inputRange: [0, 0.5, 1.5, 2.0],
    outputRange: [2, 4, 8, 12], // Larger range for dramatic effects
  });

  const thrusterOpacity = thrusterIntensity.interpolate({
    inputRange: [0, 0.5, 1.5, 2.0],
    outputRange: [0.1, 0.6, 1, 1], // More visible range
  });

  const thrusterGlowSize = thrusterIntensity.interpolate({
    inputRange: [0, 0.5, 1.5, 2.0],
    outputRange: [4, 8, 15, 20], // Dramatic glow for max thrust
  });

  const thrusterGlowOpacity = thrusterIntensity.interpolate({
    inputRange: [0, 0.5, 1.5, 2.0],
    outputRange: [0.05, 0.2, 0.4, 0.6], // Brighter glow at high thrust
  });

  return (
    <Animated.View style={{ flex: 1 }}>
      <Svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <Defs>
          <LinearGradient id="spaceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#0B1426" />
            <Stop offset="50%" stopColor="#1A237E" />
            <Stop offset="100%" stopColor="#000051" />
          </LinearGradient>
          <LinearGradient id="spaceshipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#E3F2FD" />
            <Stop offset="50%" stopColor="#BBDEFB" />
            <Stop offset="100%" stopColor="#90CAF9" />
          </LinearGradient>
        </Defs>

        {/* Space background */}
        <Rect width={width} height={height} fill="url(#spaceGradient)" />

        {/* Stars */}
        {stars.map((star, index) => (
          <Circle
            key={star.id}
            cx={star.x}
            cy={star.y}
            r={star.size}
            fill="white"
            opacity={animated && starAnimations[index] ? undefined : star.opacity}
          />
        ))}

        {/* Spaceship: moved out of the main SVG to avoid invalid children inside <Svg> */}

        {/* Additional cosmic elements */}
        <Circle cx={width * 0.9} cy={height * 0.15} r="8" fill="#FFC107" opacity="0.6" />
        <Circle cx={width * 0.1} cy={height * 0.8} r="6" fill="#9C27B0" opacity="0.5" />
        <Circle cx={width * 0.85} cy={height * 0.7} r="4" fill="#4CAF50" opacity="0.4" />
      </Svg>

      {spaceshipVisible && (
        <Animated.View style={{
          position: 'absolute',
          left: animated ? spaceshipX : width * 0.5 - 50,
          top: animated ? spaceshipY : height * 0.25,
          transform: [
            {
              rotate: spaceshipRotation.interpolate({
                inputRange: [-180, 180],
                outputRange: ['-180deg', '180deg'],
              }),
            },
          ],
        }}>
          <Svg width="100" height="65" viewBox="0 0 100 65">
            <Defs>
              <LinearGradient id="spaceshipBodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#E1F5FE" />
                <Stop offset="50%" stopColor="#B3E5FC" />
                <Stop offset="100%" stopColor="#81D4FA" />
              </LinearGradient>
              <LinearGradient id="spaceshipWingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#CFD8DC" />
                <Stop offset="100%" stopColor="#90A4AE" />
              </LinearGradient>
              <LinearGradient id="engineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FF7043" />
                <Stop offset="50%" stopColor="#FF5722" />
                <Stop offset="100%" stopColor="#E64A19" />
              </LinearGradient>
            </Defs>

            <Path d={spaceshipWingPath} fill="url(#spaceshipWingGradient)" stroke="#607D8B" strokeWidth="1" />
            <Path d={spaceshipBodyPath} fill="url(#spaceshipBodyGradient)" stroke="#0277BD" strokeWidth="2" />

            <Circle cx="50" cy="50" r="6" fill="#1565C0" opacity="0.8" />
            <Circle cx="50" cy="50" r="4" fill="#42A5F5" opacity="0.6" />

            <AnimatedCircle cx="10" cy="45" r={thrusterSize} fill="url(#engineGradient)" opacity={thrusterOpacity} />
            <AnimatedCircle cx="10" cy="55" r={thrusterSize} fill="url(#engineGradient)" opacity={thrusterOpacity} />
            <AnimatedCircle cx="10" cy="45" r={thrusterGlowSize} fill="#FF5722" opacity={thrusterGlowOpacity} />
            <AnimatedCircle cx="10" cy="55" r={thrusterGlowSize} fill="#FF5722" opacity={thrusterGlowOpacity} />

            <Circle cx="35" cy="45" r="2" fill="#0D47A1" />
            <Circle cx="35" cy="55" r="2" fill="#0D47A1" />
          </Svg>
        </Animated.View>
      )}

      {children}
    </Animated.View>
  );
};

export default SpaceBackground;
