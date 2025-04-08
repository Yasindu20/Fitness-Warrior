//CoachAvatar.tsx
import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';

interface CoachAvatarProps {
  size?: number;
  colors?: readonly [string, string, ...string[]];
  animated?: boolean;
  speaking?: boolean;
}

export default function CoachAvatar({ 
  size = 40, 
  colors = ['#6200ee', '#3700B3'] as const,
  animated = false,
  speaking = false
}: CoachAvatarProps) {
  const pulseAnimation = React.useRef(new Animated.Value(1)).current;
  const animationRef = React.useRef<LottieView>(null);
  
  React.useEffect(() => {
    if (speaking) {
      // Create a pulsing effect when speaking
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Reset animation when not speaking
      pulseAnimation.setValue(1);
    }
    
    // Play Lottie animation if animated prop is true
    if (animated && animationRef.current) {
      animationRef.current.play();
    }
  }, [speaking, animated, pulseAnimation]);
  
  return (
    <Animated.View 
      style={[
        styles.avatarContainer, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          transform: [{ scale: pulseAnimation }] 
        }
      ]}
    >
      <LinearGradient
        colors={colors}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: size / 2,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {animated ? (
          <LottieView
            ref={animationRef}
            source={require('../assets/animations/coach-animation.json')}
            style={{ width: size * 0.8, height: size * 0.8 }}
            autoPlay={false}
            loop={true}
          />
        ) : (
          <Ionicons name="fitness-outline" size={size * 0.5} color="#fff" />
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});