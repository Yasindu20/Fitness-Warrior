import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  ActivityIndicator,
  ImageBackground
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native'; 
import { GoalType, GoalTimeFrame } from '../models/FitnessGoalModels'; 
import GoalsTrackingService from '../services/GoalsTrackingService';
import RecommendationsService from '../services/RecommendationsService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { formatDate } from '../utils/dateUtils';

export default function MainMenu({ navigation }: { navigation: any }) {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [todaySteps, setTodaySteps] = useState(0);
  const [todayCalories, setTodayCalories] = useState(0);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  
  const username = auth.currentUser?.displayName || 'User';

  // This effect runs every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('MainMenu screen is focused - reloading data');
      loadUserData();
      
      return () => {
        // This is the cleanup function (optional)
        console.log('MainMenu screen is unfocused');
      };
    }, [])
  );

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
      
      // Make sure goals are synced first
      console.log('Syncing goal progress before loading Main Menu data...');
      await GoalsTrackingService.syncGoalProgress();
      
      // Get today's steps and calories with a small delay to ensure Firestore has updated
      console.log('Getting today data for Main Menu...');
      const todayData = await getTodayData();
      console.log('Today data:', todayData);
      setTodaySteps(todayData.steps);
      setTodayCalories(todayData.calories);
      
      // Get personalized recommendations
      const recs = await RecommendationsService.getActiveRecommendations();
      setRecommendations(recs.slice(0, 1)); // Just get the top recommendation
      
      // Get user's global rank (mock for now)
      // In a real app, you would get this from your community service
      setUserRank(Math.floor(Math.random() * 100) + 1);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getTodayData = async () => {
    try {
      // Get today's date string
      const today = formatDate(new Date());
      console.log(`Getting data for date: ${today}`);
      
      // ========== IMPROVED STEP COUNTING ==========
      // Get steps directly from stepHistory collection instead of relying on goals
      let steps = 0;
      
      // Query step history for today's steps
      const stepHistoryRef = collection(db, 'stepHistory');
      const stepQuery = query(
        stepHistoryRef,
        where('userId', '==', auth.currentUser?.uid),
        where('date', '==', today)
      );
      
      const stepSnapshot = await getDocs(stepQuery);
      stepSnapshot.forEach(doc => {
        steps += doc.data().steps || 0;
      });
      
      console.log(`Found ${steps} steps directly from step history for today (${today})`);
      
      // Still check goals as a backup if no steps found in history
      if (steps === 0) {
        console.log('No steps found in history, checking goals as backup');
        const stepGoals = await GoalsTrackingService.getActiveGoals(GoalTimeFrame.DAILY);
        console.log('Step goals:', stepGoals);
        
        const stepGoal = stepGoals.find(g => g.type === GoalType.STEP_COUNT);
        
        if (stepGoal) {
          steps = stepGoal.current;
          console.log('Found step goal with current value:', steps);
        } else {
          console.log('No step goal found for today');
        }
      }
      
      // Get today's calories from goals
      let calories = 0;
      const calorieGoals = await GoalsTrackingService.getActiveGoals(GoalTimeFrame.DAILY);
      const calorieGoal = calorieGoals.find(g => g.type === GoalType.CALORIE_INTAKE);
      
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
      <LinearGradient
        colors={['#6200ee', '#9c64f4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
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
        
        {/* Community Rank - NEW */}
        {userRank && (
          <View style={styles.rankContainer}>
            <Text style={styles.rankLabel}>Your Global Rank</Text>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{userRank}</Text>
            </View>
            <TouchableOpacity 
              style={styles.viewLeaderboardButton}
              onPress={() => navigation.navigate('community-leaderboards')}
            >
              <Text style={styles.viewLeaderboardText}>View Leaderboard</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
      
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
      
      {/* Community Section - NEW */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Community</Text>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: '#e3f2fd' }]} 
          onPress={() => navigation.navigate('community-leaderboards')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#bbdefb' }]}>
            <Ionicons name="trophy-outline" size={28} color="#1976D2" />
          </View>
          <View style={styles.menuContent}>
            <View style={styles.newFeatureTag}>
              <Text style={styles.newFeatureText}>NEW</Text>
            </View>
            <Text style={[styles.menuText, { color: '#1976D2' }]}>Leaderboards</Text>
            <Text style={styles.description}>Compare your progress with others globally and locally</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#1976D2" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: '#f1f8e9' }]} 
          onPress={() => navigation.navigate('friend-search')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#dcedc8' }]}>
            <Ionicons name="people-outline" size={28} color="#7CB342" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuText, { color: '#7CB342' }]}>Friends</Text>
            <Text style={styles.description}>Connect with friends and compete together</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#7CB342" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: '#ede7f6' }]} 
          onPress={() => navigation.navigate('teams')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#d1c4e9' }]}>
            <Ionicons name="people-circle-outline" size={28} color="#7E57C2" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuText, { color: '#7E57C2' }]}>Teams</Text>
            <Text style={styles.description}>Join or create teams to achieve group goals</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#7E57C2" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: '#fff3e0' }]} 
          onPress={() => navigation.navigate('challenges')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#ffe0b2' }]}>
            <Ionicons name="flame-outline" size={28} color="#FF9800" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuText, { color: '#FF9800' }]}>Challenges</Text>
            <Text style={styles.description}>Participate in exciting fitness challenges</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FF9800" />
        </TouchableOpacity>
      </View>
      
      {/* Personalized Features */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Personalized Features</Text>
        
        {/* AI Coach Menu Item */}
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: '#e6f2ff' }]} 
          onPress={() => navigation.navigate('coach')}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#cce4ff' }]}>
            <Ionicons name="fitness-outline" size={28} color="#0066CC" />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuText, { color: '#0066CC' }]}>AI Fitness Coach</Text>
            <Text style={styles.description}>Get personalized fitness advice and demonstrations</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#0066CC" />
        </TouchableOpacity>
        
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
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
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
  rankContainer: {
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
    padding: 15,
  },
  rankLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginBottom: 5,
  },
  rankBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
  },
  rankText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  viewLeaderboardButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewLeaderboardText: {
    color: '#fff',
    fontWeight: '600',
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
  newFeatureTag: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#f44336',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newFeatureText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});