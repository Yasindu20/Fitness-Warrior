import React, { useState, useEffect } from "react";
import { SafeAreaView, StyleSheet, View, Text, ActivityIndicator } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import * as tf from '@tensorflow/tfjs';
import Login from "./login";
import Signup from "./signup";
import UserBioForm from "./UserBioForm";
import UserProfile from "./UserProfile";
import StepCounter from "./step-counter";
import Leaderboard from "./leaderboard";
import MainMenu from "./MainMenu";
import CalorieTracker from "./CalorieTracker";
import PersonalizedGoalsScreen from "../screens/PersonalizedGoalsScreen";
import GoalDetailScreen from "../screens/GoalDetailScreen";
import FitnessAnalyticsScreen from "../screens/FitnessAnalyticsScreen";

const Stack = createStackNavigator();

export default function AuthLayout() {
  const [isTfReady, setIsTfReady] = useState(false);

  // Initialize TensorFlow.js when app starts
  useEffect(() => {
    const initTensorFlow = async () => {
      try {
        await tf.ready();
        setIsTfReady(true);
        console.log('TensorFlow.js is ready!');
      } catch (error) {
        console.error('Failed to initialize TensorFlow.js', error);
      }
    };
    initTensorFlow();
  }, []);

  // Show loading indicator while TensorFlow initializes
  if (!isTfReady) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Initializing TensorFlow.js...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.appTitle}>Fitness Warrior</Text>
        <Stack.Navigator
          screenOptions={{
            headerShown: false, // Hides the header for a clean UI
          }}
        >
          <Stack.Screen name="login" component={Login} />
          <Stack.Screen name="signup" component={Signup} />
          <Stack.Screen name="user-bio-form" component={UserBioForm} />
          <Stack.Screen name="main-menu" component={MainMenu} />
          <Stack.Screen name="user-profile" component={UserProfile} />
          <Stack.Screen name="step-counter" component={StepCounter} />
          <Stack.Screen name="calorie-tracker" component={CalorieTracker} />
          <Stack.Screen name="leaderboard" component={Leaderboard} />
          
          {/* New personalized goals screens */}
          <Stack.Screen name="personalized-goals" component={PersonalizedGoalsScreen} />
          <Stack.Screen name="goal-detail" component={GoalDetailScreen} />
          <Stack.Screen name="fitness-analytics" component={FitnessAnalyticsScreen} />
        </Stack.Navigator>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#6200ee",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6200ee",
  },
});