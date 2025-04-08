//ExerciseAnimations.tsx
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface ExerciseProps {
    name: string;
    type?: 'squat' | 'pushup' | 'plank' | 'lunge' | 'jumping_jack' | 'burpee' | 'mountain_climber' | 'general';
    intensity?: 'low' | 'medium' | 'high';
    duration?: number; // in seconds
    reps?: number;
    onComplete?: () => void;
    autoPlay?: boolean;
  }

// Map of exercise types to animation files
const EXERCISE_ANIMATIONS = {
    squat: require('../assets/animations/squat-animation.json'),
    pushup: require('../assets/animations/pushup-animation.json'),
    plank: require('../assets/animations/plank-animation.json'),
    lunge: require('../assets/animations/lunge-animation.json'),
    jumping_jack: require('../assets/animations/jumping-jack-animation.json'),
    burpee: require('../assets/animations/burpee-animation.json'),
    mountain_climber: require('../assets/animations/mountain-climber-animation.json'),
    general: require('../assets/animations/exercise-animation.json'),
};

// Map intensity to colors
const INTENSITY_COLORS = {
    low: ['#4CAF50', '#8BC34A'] as const,
    medium: ['#2196F3', '#03A9F4'] as const,
    high: ['#F44336', '#FF9800'] as const,
};

const mapExerciseToType = (name: string): 'squat' | 'pushup' | 'plank' | 'lunge' | 'jumping_jack' | 'burpee' | 'mountain_climber' | 'general' => {
    const nameLower = name.toLowerCase();

    if (nameLower.includes('squat')) return 'squat';
    if (nameLower.includes('push') || nameLower.includes('press') || nameLower.includes('bench')) return 'pushup';
    if (nameLower.includes('plank')) return 'plank';
    if (nameLower.includes('lunge')) return 'lunge';
    if (nameLower.includes('jump') || nameLower.includes('jack')) return 'jumping_jack';
    if (nameLower.includes('burpee')) return 'burpee';
    if (nameLower.includes('mountain') || nameLower.includes('climb')) return 'mountain_climber';

    return 'general';
};

export default function ExerciseAnimation({
    name,
    type,  // Make this optional
    intensity = 'medium',
    duration,
    reps,
    onComplete,
    autoPlay = true,
  }: ExerciseProps) {
    const animation = useRef<LottieView>(null);
    
    // Determine type from name if not provided
    const exerciseType = type || mapExerciseToType(name);
    
    // Get the correct animation file
    const getAnimationSource = () => {
      return EXERCISE_ANIMATIONS[exerciseType] || EXERCISE_ANIMATIONS.general;
    };

    // Get colors based on intensity
    const getIntensityColors = () => {
        return INTENSITY_COLORS[intensity] || INTENSITY_COLORS.medium;
    };

    useEffect(() => {
        if (autoPlay && animation.current) {
            animation.current.play();
        }

        // If duration is specified, call onComplete after that time
        if (duration && onComplete) {
            const timer = setTimeout(() => {
                onComplete();
            }, duration * 1000);

            return () => clearTimeout(timer);
        }
    }, [autoPlay, duration, onComplete]);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={getIntensityColors()}
                style={styles.animationContainer}
            >
                <LottieView
                    ref={animation}
                    source={getAnimationSource()}
                    style={styles.animation}
                    loop={true}
                    autoPlay={autoPlay}
                />
            </LinearGradient>

            <View style={styles.detailsContainer}>
                <Text style={styles.exerciseName}>{name}</Text>
                <View style={styles.metricContainer}>
                    {reps && (
                        <View style={styles.metric}>
                            <Text style={styles.metricValue}>{reps}</Text>
                            <Text style={styles.metricLabel}>Reps</Text>
                        </View>
                    )}

                    {duration && (
                        <View style={styles.metric}>
                            <Text style={styles.metricValue}>{duration}</Text>
                            <Text style={styles.metricLabel}>Seconds</Text>
                        </View>
                    )}

                    <View style={[styles.intensityIndicator, styles[`intensity_${intensity}`]]} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: width - 80,
        height: 200,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        marginVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        overflow: 'hidden',
    },
    animationContainer: {
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
    },
    animation: {
        width: 120,
        height: 120,
    },
    detailsContainer: {
        padding: 12,
        backgroundColor: '#ffffff',
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    metricContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    metric: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginRight: 16,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6200ee',
    },
    metricLabel: {
        fontSize: 12,
        color: '#666',
        marginLeft: 4,
    },
    intensityIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginLeft: 'auto',
    },
    intensity_low: {
        backgroundColor: '#4CAF50',
    },
    intensity_medium: {
        backgroundColor: '#2196F3',
    },
    intensity_high: {
        backgroundColor: '#F44336',
    },
});