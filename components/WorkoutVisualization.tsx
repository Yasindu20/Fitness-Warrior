//WorkoutVisualization.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ExerciseAnimation from './ExerciseAnimation';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface Exercise {
  name: string;
  reps?: string;
  duration?: string;
  intensity?: string;
  description?: string;
  gifUrl?: string;
}

interface WorkoutVisualizationProps {
  title: string;
  exercises: Exercise[];
  onComplete?: () => void;
  onStart?: () => void;
  interactive?: boolean;
}

// Map exercise names to animation types
const mapExerciseToType = (name: string): 'squat' | 'pushup' | 'plank' | 'lunge' | 'jumping_jack' | 'burpee' | 'mountain_climber' | 'general' => {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('squat')) return 'squat';
  if (nameLower.includes('push') || nameLower.includes('press')) return 'pushup';
  if (nameLower.includes('plank')) return 'plank';
  if (nameLower.includes('lunge')) return 'lunge';
  if (nameLower.includes('jump')) return 'jumping_jack';
  if (nameLower.includes('burpee')) return 'burpee';
  if (nameLower.includes('mountain') || nameLower.includes('climb')) return 'mountain_climber';
  
  return 'general';
};

// Map intensity string to type
const mapIntensityToType = (intensity?: string): 'low' | 'medium' | 'high' => {
  if (!intensity) return 'medium';
  
  const intensityLower = intensity.toLowerCase();
  if (intensityLower.includes('low')) return 'low';
  if (intensityLower.includes('high')) return 'high';
  
  return 'medium';
};

// Get duration in seconds from string
const getDurationInSeconds = (duration?: string): number | undefined => {
  if (!duration) return undefined;
  
  const match = duration.match(/(\d+)\s*(?:seconds?|secs?|s)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  return undefined;
};

// Get reps count from string
const getRepsCount = (reps?: string): number | undefined => {
  if (!reps) return undefined;
  
  const match = reps.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  return undefined;
};

export default function WorkoutVisualization({
  title,
  exercises,
  onComplete,
  onStart,
  interactive = true,
}: WorkoutVisualizationProps) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(-1);
  const [showStartButton, setShowStartButton] = useState(true);
  const [showExercises, setShowExercises] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  
  useEffect(() => {
    if (showExercises) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [showExercises, fadeAnim]);
  
  const handleStart = () => {
    setShowStartButton(false);
    setShowExercises(true);
    setCurrentExerciseIndex(0);
    
    if (onStart) {
      onStart();
    }
    
    // Haptic feedback for start
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  
  const handleNext = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      // Haptic feedback for next
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Workout complete
      if (onComplete) {
        onComplete();
      }
      // Haptic feedback for completion
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };
  
  const handlePrevious = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      // Haptic feedback for previous
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  
  const renderStartButton = () => {
    if (!showStartButton || !interactive) return null;
    
    return (
      <TouchableOpacity style={styles.startButton} onPress={handleStart}>
        <Ionicons name="play" size={24} color="#fff" />
        <Text style={styles.startButtonText}>Start Workout</Text>
      </TouchableOpacity>
    );
  };
  
  const renderControls = () => {
    if (!showExercises || !interactive) return null;
    
    return (
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlButton, currentExerciseIndex === 0 && styles.disabledButton]}
          onPress={handlePrevious}
          disabled={currentExerciseIndex === 0}
        >
          <Ionicons name="arrow-back" size={24} color={currentExerciseIndex === 0 ? "#999" : "#6200ee"} />
        </TouchableOpacity>
        
        <View style={styles.progressText}>
          <Text style={styles.progressTextContent}>
            {currentExerciseIndex + 1} / {exercises.length}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.controlButton, currentExerciseIndex === exercises.length - 1 && styles.completeButton]}
          onPress={handleNext}
        >
          {currentExerciseIndex < exercises.length - 1 ? (
            <Ionicons name="arrow-forward" size={24} color="#6200ee" />
          ) : (
            <Ionicons name="checkmark" size={24} color="#4CAF50" />
          )}
        </TouchableOpacity>
      </View>
    );
  };
  
  const renderCurrentExercise = () => {
    if (currentExerciseIndex === -1 || !showExercises) return null;
    
    const exercise = exercises[currentExerciseIndex];
    
    return (
      <Animated.View style={[styles.exerciseDisplay, { opacity: fadeAnim }]}>
        <ExerciseAnimation
          name={exercise.name}
          type={mapExerciseToType(exercise.name)}
          intensity={mapIntensityToType(exercise.intensity)}
          duration={getDurationInSeconds(exercise.duration)}
          reps={getRepsCount(exercise.reps)}
          autoPlay={true}
        />
        
        {exercise.description && (
          <Text style={styles.exerciseDescription}>{exercise.description}</Text>
        )}
      </Animated.View>
    );
  };
  
  const renderExerciseList = () => {
    if (interactive) return null;
    
    return (
      <ScrollView style={styles.exerciseList}>
        {exercises.map((exercise, index) => (
          <View key={index} style={styles.exerciseItem}>
            <View style={styles.exerciseNumber}>
              <Text style={styles.exerciseNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseDetails}>
                {exercise.reps ? `${exercise.reps} reps` : ''}
                {exercise.reps && exercise.duration ? ' • ' : ''}
                {exercise.duration ? exercise.duration : ''}
              </Text>
              {exercise.description && (
                <Text style={styles.exerciseDescriptionSmall}>{exercise.description}</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      {renderStartButton()}
      {renderCurrentExercise()}
      {renderControls()}
      {renderExerciseList()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#6200ee',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    marginVertical: 16,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  exerciseDisplay: {
    alignItems: 'center',
    width: '100%',
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
  },
  completeButton: {
    backgroundColor: '#e8f5e9',
  },
  progressText: {
    paddingHorizontal: 16,
  },
  progressTextContent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  exerciseList: {
    width: '100%',
    maxHeight: 300,
    marginTop: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  exerciseNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumberText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  exerciseDescriptionSmall: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
});