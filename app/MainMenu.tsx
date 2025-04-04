import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import GoalsTrackingService from '../services/GoalsTrackingService';
import RecommendationsService from '../services/RecommendationsService';
import { 
  FitnessRecommendation, 
  GoalTimeFrame 
} from '../models/FitnessGoalModels';

export default function MainMenu({ navigation }: { navigation: any }) {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [todaySteps, setTodaySteps] = useState(0);
  const [todayCalories, setTodayCalories] = useState(0);
  const [recommendations, setRecommendations] = useState<FitnessRecommendation[]>([]);
  
  const username = auth.currentUser?.displayName || 'User';

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get user profile
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      }
      
      // Sync goal progress
      await GoalsTrackingService.syncGoalProgress();
      
      // Get today's steps and calories
      const todayData = await getTodayData();
      setTodaySteps(todayData.steps);
      setTodayCalories(todayData.calories);
      
      // Get personalized recommendations
      const recs = await RecommendationsService.getActiveRecommendations();
      setRecommendations(recs.slice(0, 1)); // Just get the top recommendation
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getTodayData = async () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    try {
      // Get today's steps
      let steps = 0;
      const stepGoals = await GoalsTrackingService.getActiveGoals(GoalTimeFrame.DAILY);
      const stepGoal = stepGoals.find(g => g.type === 'step_count');
      
      if (stepGoal) {
        steps = stepGoal.current;
      }
      
      // Get today's calories
      let calories = 0;
      const calorieGoals = await GoalsTrackingService.getActiveGoals(GoalTimeFrame.DAILY);
      const calorieGoal = calorieGoals.find(g => g.type === 'calorie_intake');
      
      if (calorieGoal) {
        calories = calorieGoal.current;
      }
      
      return { steps, calories };
    } catch (error) {
      console.error('Error getting today data:', error);
      return { steps: 0, calories: 0 };
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header with User Greeting */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {username}!</Text>
        <Text style={styles.subGreeting}>What would you like to track today?</Text>
        
        {/* Today's Quick Stats */}
        {!loading ? (
          <View style={styles.quickStats}>
            <View style={styles.statItem}>
              <Ionicons name="footsteps-outline" size={24} color="#fff" />
              <Text style={styles.statValue}>{todaySteps.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Steps</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="flame-outline" size={24} color="#fff" />
              <Text style={styles.statValue}>{todayCalories.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
            {userData?.dailyCalorieGoal && (
              <View style={styles.statItem}>
                <Ionicons name="nutrition-outline" size={24} color="#fff" />
                <Text style={styles.statValue}>{userData.dailyCalorieGoal.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Goal</Text>
              </View>
            )}
          </View>
        ) : (
          <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
        )}
      </View>
      
      {/* Main Menu Options */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Trackers</Text>
        
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => navigation.navigate('step-counter')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#e8f5e9' }]}>
            <Ionicons name="footsteps-outline" size={28} color="#4CAF50" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuText}>Step Tracker</Text>
            <Text style={styles.description}>Track your daily steps and activity</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => navigation.navigate('calorie-tracker')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#fff3e0' }]}>
            <Ionicons name="fast-food-outline" size={28} color="#FF9800" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuText}>Calorie Tracker</Text>
            <Text style={styles.description}>Monitor your daily food intake</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>
      
      {/* Personalized Features */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Personalized Features</Text>
        
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => navigation.navigate('personalized-goals')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#e8eaf6' }]}>
            <Ionicons name="trophy-outline" size={28} color="#3F51B5" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuText}>Personalized Goals</Text>
            <Text style={styles.description}>Custom fitness goals based on your activity</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => navigation.navigate('fitness-analytics')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#f3e5f5' }]}>
            <Ionicons name="analytics-outline" size={28} color="#9C27B0" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuText}>Fitness Analytics</Text>
            <Text style={styles.description}>Visualize your progress and trends</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>
      
      {/* Top Recommendation */}
      {recommendations.length > 0 && (
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Recommended For You</Text>
          
          <TouchableOpacity 
            style={styles.recommendationCard}
            onPress={() => navigation.navigate('personalized-goals', { tab: 'recommendations' })}
          >
            <View style={styles.recommendationHeader}>
              <Ionicons name="bulb-outline" size={24} color="#FFC107" />
              <Text style={styles.recommendationTitle}>{recommendations[0].title}</Text>
            </View>
            <Text style={styles.recommendationDescription}>
              {recommendations[0].description}
            </Text>
            <Text style={styles.recommendationLink}>View All Recommendations →</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* User Profile Link */}
      <View style={styles.menuSection}>
        <TouchableOpacity 
          style={[styles.menuItem, styles.profileMenuItem]} 
          onPress={() => navigation.navigate('user-profile')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#e1f5fe' }]}>
            <Ionicons name="person-outline" size={28} color="#03A9F4" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuText}>User Profile</Text>
            <Text style={styles.description}>View and edit your profile information</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#6200ee',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subGreeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    padding: 12,
    minWidth: 90,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  menuSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    color: '#666',
    fontSize: 14,
  },
  profileMenuItem: {
    borderWidth: 0,
    borderStyle: 'solid',
  },
  recommendationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  recommendationLink: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: 'bold',
    textAlign: 'right',
  },
});