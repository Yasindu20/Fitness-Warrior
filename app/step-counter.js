import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, Vibration, Alert } from 'react-native';
import * as tf from '@tensorflow/tfjs';
import modelService from '../services/modelService';
import sensorService from '../services/sensorService';
import { saveStepCount } from '../services/healthDataService';
import Visualizer from './Visualizer';
import { formatDate } from '../utils/dateUtils';
import { auth } from './firebaseConfig';

const StepCounter = () => {
  const [isModelReady, setIsModelReady] = useState(false);
  const [isCountingSteps, setIsCountingSteps] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [sensorData, setSensorData] = useState([]);
  const [modelStatus, setModelStatus] = useState('Loading model...');
  const [isSaving, setIsSaving] = useState(false);
  const [savedStepsForSession, setSavedStepsForSession] = useState(false);

  // Refs to maintain state between renders
  const stepCountRef = useRef(0);
  const initialStepCountRef = useRef(0); // To track steps in this session
  const isInitializedRef = useRef(false);
  const lastSaveTimeRef = useRef(0); // To avoid too frequent saves

  // Initialize model and sensors on component mount
  useEffect(() => {
    const initTensorFlow = async () => {
      try {
        if (isInitializedRef.current) return;

        setModelStatus('Initializing TensorFlow.js...');
        await tf.ready();

        setModelStatus('Loading step detection model...');
        const modelLoaded = await modelService.loadModel();

        if (modelLoaded) {
          setModelStatus('Model ready');
          setIsModelReady(true);
          isInitializedRef.current = true;
        } else {
          setModelStatus('Failed to load model');
        }
      } catch (error) {
        console.error('Error initializing:', error);
        setModelStatus(`Error: ${error.message}`);
      }
    };

    initTensorFlow();

    // Clean up on unmount
    return () => {
      sensorService.stop();
      modelService.dispose();
      
      // FIXED: Prevent double saving when component unmounts
      if (isCountingSteps && stepCountRef.current > initialStepCountRef.current && !savedStepsForSession) {
        console.log('Component unmounting - saving final steps');
        saveCurrentSteps();
      } else {
        console.log('Component unmounting - no need to save steps again');
      }
    };
  }, []);

  // Set up sensor callback when isCountingSteps changes
  useEffect(() => {
    if (isCountingSteps) {
      // Start with the current step count
      initialStepCountRef.current = stepCountRef.current;
      // Reset saved flag when starting a new counting session
      setSavedStepsForSession(false);

      // Define the callback for processed sensor data
      sensorService.setWindowCompleteCallback(async (windowData) => {
        // Update visualizer with the latest data
        setSensorData(windowData.slice(-10)); // Just show last 10 points

        // MODIFIED: Add a delay between step detection to reduce false positives
        const now = Date.now();
        const timeSinceLastStep = now - lastSaveTimeRef.current;
        const minStepInterval = 300; // Minimum milliseconds between steps (adjust based on testing)
        
        // Predict step with the current window of data
        if (timeSinceLastStep >= minStepInterval) {
          const stepDetected = await modelService.predictStep(windowData);

          if (stepDetected) {
            // Vibrate briefly to provide haptic feedback for step detection
            Vibration.vibrate(100);

            // Increment step count
            stepCountRef.current += 1;
            setStepCount(stepCountRef.current);
            console.log(`Step detected! Total count: ${stepCountRef.current}`);
            lastSaveTimeRef.current = now;

            // Save step data periodically (every 10 steps or every 2 minutes)
            // MODIFIED: Reduced frequency to avoid too many Firestore operations
            const sessionSteps = stepCountRef.current - initialStepCountRef.current;
            if (sessionSteps % 10 === 0 || now - lastSaveTimeRef.current > 120000) {
              // Instead of immediately saving, mark steps as pending save
              // This avoids saving small increments frequently
              console.log(`${sessionSteps} steps ready for saving`);
            }
          }
        }
      });

      // Start collecting sensor data
      sensorService.start();
      console.log('Step counting started');
    } else {
      // Stop collecting sensor data
      sensorService.stop();
      console.log('Step counting stopped');

      // FIXED: Only save steps when explicitly stopping, not on state change
      if (stepCountRef.current > initialStepCountRef.current && !savedStepsForSession) {
        saveCurrentSteps();
      }
    }
  }, [isCountingSteps]);

  const toggleCounting = () => {
    if (isCountingSteps) {
      // Stop counting first, then save steps
      setIsCountingSteps(false);
      // Saving will be handled in the effect above
    } else {
      // Reset session counter and start counting
      initialStepCountRef.current = stepCountRef.current;
      setIsCountingSteps(true);
    }
  };
  
  // MODIFIED: saveCurrentSteps now sets a flag to prevent duplicate saves
  const saveCurrentSteps = async () => {
    // Don't save if not logged in
    if (!auth.currentUser) {
      console.log('User not logged in, steps not saved');
      return;
    }
    
    // Prevent duplicate saves
    if (savedStepsForSession) {
      console.log('Steps already saved for this session');
      return;
    }
    
    try {
      setIsSaving(true);
      const sessionSteps = stepCountRef.current - initialStepCountRef.current;
      
      if (sessionSteps > 0) {
        console.log(`Saving ${sessionSteps} steps to Firestore`);
        await saveStepCount(sessionSteps);
        console.log('Steps saved successfully');
        initialStepCountRef.current = stepCountRef.current; // Reset session counter after saving
        setSavedStepsForSession(true); // Mark that we've saved for this session
      } else {
        console.log('No new steps to save');
      }
    } catch (error) {
      console.error('Failed to save steps:', error);
      // In case of error, we'll try again later
      setSavedStepsForSession(false);
    } finally {
      setIsSaving(false);
    }
  };

  const resetStepCount = () => {
    stepCountRef.current = 0;
    initialStepCountRef.current = 0;
    setStepCount(0);
    setSavedStepsForSession(false);
  };

  if (!isModelReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>{modelStatus}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step Counter</Text>

      <View style={styles.countContainer}>
        <Text style={styles.countLabel}>Steps Taken:</Text>
        <Text style={styles.countValue}>{stepCount}</Text>
        {isSaving && <Text style={styles.savingText}>Saving...</Text>}
      </View>

      <Visualizer data={sensorData} />

      <View style={styles.buttonContainer}>
        <Button
          title={isCountingSteps ? "Stop Counting" : "Start Counting"}
          onPress={toggleCounting}
          color={isCountingSteps ? "#ff6347" : "#4caf50"}
        />
        <Button
          title="Reset Counter"
          onPress={resetStepCount}
          color="#2196f3"
          disabled={isCountingSteps}
        />
      </View>

      <Text style={styles.footer}>
        {isCountingSteps
          ? "Walk naturally with your phone in your pocket or hand"
          : "Press Start to begin counting steps"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  countContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  countLabel: {
    fontSize: 18,
    color: '#666',
  },
  countValue: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  savingText: {
    fontSize: 14,
    color: '#4caf50',
    marginTop: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 20,
  },
  footer: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default StepCounter;