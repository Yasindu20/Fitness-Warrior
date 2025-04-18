import React, { useState, useEffect } from "react";
import { SafeAreaView, StyleSheet, View, Text, ActivityIndicator } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import * as tf from '@tensorflow/tfjs';
import { RootStackParamList } from "../types/navigation";
import { db, auth } from "./firebaseConfig";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

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
import CoachScreen from "../screens/CoachScreen";
import { preloadAnimations } from "@/utils/AnimationPreloader";

// Import community screens
import CommunityLeaderboards from "../screens/community/CommunityLeaderboards";
import TeamDetailScreen from "../screens/community/TeamDetailScreen";
import ChallengeDetailScreen from "../screens/community/ChallengeDetailScreen";
import FriendSearchScreen from "../screens/community/FriendSearchScreen";
import CreateTeamScreen from "../screens/community/CreateTeamScreen";
import TeamsScreen from "../screens/community/TeamsScreen";
import ChallengesScreen from "../screens/community/ChallengesScreen";
import CommunityActivityFeed from "../screens/community/CommunityActivityFeed";

const Stack = createStackNavigator<RootStackParamList>();

export default function AuthLayout() {
  const [isTfReady, setIsTfReady] = useState(false);

  // Initialize TensorFlow.js when app starts
  useEffect(() => {
    const initTensorFlow = async () => {
      try {
        await tf.ready();
        console.log('TensorFlow.js is ready!');
        
        // Preload animations after TensorFlow is ready
        try {
          await preloadAnimations();
          console.log('Animations preloaded successfully');
        } catch (animError) {
          console.error('Failed to preload animations', animError);
        }
        
        setIsTfReady(true);
      } catch (error) {
        console.error('Failed to initialize TensorFlow.js', error);
      }
    };
    initTensorFlow();
  
    const migrateUserDisplayNames = async () => {
      if (!auth.currentUser) return;
      
      // Check if user document exists and has a displayName
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Document doesn't exist, create it with setDoc
        await setDoc(userRef, {
          displayName: auth.currentUser.displayName || 'User',
          totalSteps: 0,
          totalCalories: 0,
          totalDistance: 0,
          totalActiveMinutes: 0,
          createdAt: new Date()
        });
      } else if (!userDoc.data().displayName) {
        // Document exists but has no displayName, update it
        await updateDoc(userRef, {
          displayName: auth.currentUser.displayName || 'User'
        });
      }
    };
  
    // Set up a listener for auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // User is signed in, call migration function
        await migrateUserDisplayNames();
      }
    });
    
    // Clean up the listener when component unmounts
    return () => unsubscribe();
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
          
          {/* AI Coach screen */}
          <Stack.Screen name="coach" component={CoachScreen} />
          
          {/* Community/Leaderboard Screens */}
          <Stack.Screen name="community-leaderboards" component={CommunityLeaderboards} />
          <Stack.Screen name="team-detail" component={TeamDetailScreen} />
          <Stack.Screen name="challenge-detail" component={ChallengeDetailScreen} />
          <Stack.Screen name="friend-search" component={FriendSearchScreen} />
          <Stack.Screen name="create-team" component={CreateTeamScreen} />
          <Stack.Screen name="teams" component={TeamsScreen} />
          <Stack.Screen name="challenges" component={ChallengesScreen} />
          <Stack.Screen name="activity-feed" component={CommunityActivityFeed} />
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