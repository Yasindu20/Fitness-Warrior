import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FitnessGoal, GoalTimeFrame, GoalStatus, FitnessRecommendation } from '../models/FitnessGoalModels';
import GoalsTrackingService from '../services/GoalsTrackingService';
import GoalsGenerationService from '../services/GoalsGenerationService';
import RecommendationsService from '../services/RecommendationsService';
import WorkoutProgramService from '../services/WorkoutProgramService';
import WeatherService from '../services/WeatherService';
import { auth } from '../app/firebaseConfig';
import { formatDate } from '../utils/dateUtils';

const GoalTimeFrameLabels = {
  [GoalTimeFrame.DAILY]: 'Today',
  [GoalTimeFrame.WEEKLY]: 'This Week',
  [GoalTimeFrame.MONTHLY]: 'This Month'
};

export default function PersonalizedGoalsScreen({ navigation, route }: { navigation: any, route: any }) {
  const [activeGoals, setActiveGoals] = useState<FitnessGoal[]>([]);
  const [recommendations, setRecommendations] = useState<FitnessRecommendation[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [workoutPrograms, setWorkoutPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('goals'); // 'goals', 'recommendations', 'achievements', 'programs'
  const [weather, setWeather] = useState<any>(null);
  
  // Check if we should navigate to a specific tab from route params
  useEffect(() => {
    if (route.params?.tab) {
      setActiveTab(route.params.tab);
    }
  }, [route.params]);
  
  // Load data when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('PersonalizedGoals screen is focused - reloading data');
      // Force a fresh data load every time the screen comes into focus
      loadData();
      return () => {
        console.log('PersonalizedGoals screen is unfocused');
      };
    }, [])
  );
  
  // Improved loadData function with better logging and error handling:
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Sync goal progress with latest activity data
      console.log('Syncing goal progress...');
      await GoalsTrackingService.syncGoalProgress();
      
      // Load current weather
      const currentWeather = await WeatherService.getCurrentWeather();
      setWeather(currentWeather);
      
      // Get active goals with direct debugging
      console.log('Loading active goals...');
      const goals = await GoalsTrackingService.getActiveGoals();
      console.log('Active goals loaded:', goals.length);
      
      // Debug output for each goal
      goals.forEach(goal => {
        console.log(`Goal ${goal.id}: ${goal.description} - ${goal.current}/${goal.target} (${goal.status})`);
      });
      
      setActiveGoals(goals);
      
      // Get recommendations
      const recs = await RecommendationsService.getActiveRecommendations();
      setRecommendations(recs);
      
      // Get achievements
      const achievs = await GoalsTrackingService.getAchievements();
      setAchievements(achievs);
      
      // Get workout programs - NEW!
      console.log('Loading workout programs...');
      const programs = await WorkoutProgramService.getUserPrograms();
      console.log('Workout programs loaded:', programs.length);
      setWorkoutPrograms(programs);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load goals and recommendations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Generate new goals
  const generateNewGoals = async () => {
    try {
      setLoading(true);
      
      // Generate new goals
      await GoalsGenerationService.generateGoalsForUser(auth.currentUser?.uid || '');
      
      // Generate new recommendations
      await RecommendationsService.generateRecommendations();
      
      // Reload data
      await loadData();
      
      Alert.alert('Success', 'New personalized goals and recommendations have been generated!');
    } catch (error) {
      console.error('Error generating goals:', error);
      Alert.alert('Error', 'Failed to generate new goals');
    } finally {
      setLoading(false);
    }
  };
  
  // Refresh data
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };
  
  // Complete a recommendation
  const completeRecommendation = async (recommendationId: string) => {
    try {
      await RecommendationsService.completeRecommendation(recommendationId);
      
      // Update recommendations list
      setRecommendations(prev => 
        prev.filter(rec => rec.id !== recommendationId)
      );
      
      Alert.alert('Success', 'Recommendation completed!');
    } catch (error) {
      console.error('Error completing recommendation:', error);
      Alert.alert('Error', 'Failed to complete recommendation');
    }
  };
  
  // Activate a workout program
  const activateProgram = async (programId: string) => {
    try {
      await WorkoutProgramService.activateProgram(programId);
      
      // Reload programs to reflect the change
      const programs = await WorkoutProgramService.getUserPrograms();
      setWorkoutPrograms(programs);
      
      Alert.alert('Success', 'Workout program activated!');
    } catch (error) {
      console.error('Error activating program:', error);
      Alert.alert('Error', 'Failed to activate program');
    }
  };
  
  // Delete a workout program
  const deleteProgram = async (programId: string) => {
    try {
      Alert.alert(
        'Confirm Deletion',
        'Are you sure you want to delete this workout program?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await WorkoutProgramService.deleteProgram(programId);
              
              // Reload programs to reflect the change
              const programs = await WorkoutProgramService.getUserPrograms();
              setWorkoutPrograms(programs);
              
              Alert.alert('Success', 'Workout program deleted!');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting program:', error);
      Alert.alert('Error', 'Failed to delete program');
    }
  };
  
  // View workout details
  const viewWorkoutDetails = (program: any) => {
    // This would navigate to a workout detail screen
    // For now, we'll just show an alert with program info
    Alert.alert(
      program.title,
      `${program.description}\n\nThis is a ${program.level} level program focusing on ${program.focusArea}.`,
      [
        {
          text: 'OK',
          style: 'cancel'
        }
      ]
    );
  };
  
  // Render goal progress bar
  const renderGoalProgress = (goal: FitnessGoal) => {
    const progress = Math.min(goal.current / goal.target, 1);
    let color1 = '#6200ee';
    let color2 = '#9546f8';
    
    // Different colors based on goal type
    switch (goal.type) {
      case 'step_count':
        color1 = '#6200ee';
        color2 = '#9546f8';
        break;
      case 'active_minutes':
        color1 = '#4CAF50';
        color2 = '#8BC34A';
        break;
      case 'calorie_intake':
        color1 = '#F44336';
        color2 = '#FF9800';
        break;
      case 'distance':
        color1 = '#2196F3';
        color2 = '#03A9F4';
        break;
    }
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <LinearGradient
            colors={[color1, color2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.progressFill,
              { width: `${progress * 100}%` }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {goal.current.toLocaleString()} / {goal.target.toLocaleString()}
          {goal.streak && goal.streak > 1 ? 
            <Text style={styles.streakText}> 🔥 {goal.streak} day streak!</Text> : 
            null
          }
        </Text>
      </View>
    );
  };
  
  // Render a single goal card
  const renderGoalCard = (goal: FitnessGoal) => {
    // Determine icon based on goal type
    let icon = 'footsteps-outline';
    
    switch (goal.type) {
      case 'step_count':
        icon = 'footsteps-outline';
        break;
      case 'active_minutes':
        icon = 'timer-outline';
        break;
      case 'calorie_intake':
        icon = 'fast-food-outline';
        break;
      case 'distance':
        icon = 'map-outline';
        break;
    }
    
    return (
      <View key={goal.id} style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View style={styles.goalIconContainer}>
            <Ionicons name={icon as any} size={24} color="#6200ee" />
          </View>
          <View style={styles.goalTitleContainer}>
            <Text style={styles.goalTitle}>{goal.description}</Text>
            <Text style={styles.goalTimeframe}>{GoalTimeFrameLabels[goal.timeFrame]}</Text>
          </View>
        </View>
        {renderGoalProgress(goal)}
      </View>
    );
  };
  
  // Render a single recommendation card
  const renderRecommendationCard = (recommendation: FitnessRecommendation) => {
    // Determine icon based on recommendation type
    let icon = 'bulb-outline';
    let iconColor = '#6200ee';
    
    switch (recommendation.type) {
      case 'exercise':
        icon = 'fitness-outline';
        iconColor = '#4CAF50';
        break;
      case 'nutrition':
        icon = 'restaurant-outline';
        iconColor = '#FF9800';
        break;
      case 'recovery':
        icon = 'bed-outline';
        iconColor = '#2196F3';
        break;
      case 'general':
        icon = 'bulb-outline';
        iconColor = '#6200ee';
        break;
    }
    
    // Show weather icon if recommendation is weather dependent
    const showWeather = recommendation.weatherDependent && recommendation.idealWeatherCondition;
    let weatherIcon = 'sunny-outline';
    
    if (showWeather) {
      switch (recommendation.idealWeatherCondition) {
        case 'sunny':
          weatherIcon = 'sunny-outline';
          break;
        case 'cloudy':
          weatherIcon = 'cloudy-outline';
          break;
        case 'rainy':
          weatherIcon = 'rainy-outline';
          break;
      }
    }
    
    return (
      <View key={recommendation.id} style={styles.recommendationCard}>
        <View style={styles.recommendationHeader}>
          <View style={[styles.recommendationIconContainer, { backgroundColor: `${iconColor}20` }]}>
            <Ionicons name={icon as any} size={24} color={iconColor} />
          </View>
          <View style={styles.recommendationTitleContainer}>
            <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
            {recommendation.timeOfDayDependent && (
              <Text style={styles.recommendationTimeframe}>
                Best for: {recommendation.idealTimeOfDay}
                {showWeather && (
                  <Ionicons name={weatherIcon as any} size={16} color="#666" style={{ marginLeft: 8 }} />
                )}
              </Text>
            )}
          </View>
        </View>
        <Text style={styles.recommendationDescription}>
          {recommendation.description}
        </Text>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => completeRecommendation(recommendation.id)}
        >
          <Text style={styles.completeButtonText}>Mark as Done</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Render a single achievement card
  const renderAchievementCard = (achievement: any) => {
    const isUnlocked = achievement.unlockedAt !== null;
    
    return (
      <View 
        key={achievement.id} 
        style={[
          styles.achievementCard, 
          !isUnlocked && styles.lockedAchievement
        ]}
      >
        <View style={styles.achievementIconContainer}>
          {isUnlocked ? (
            <Ionicons name="trophy" size={32} color="#FFD700" />
          ) : (
            <Ionicons name="lock-closed" size={32} color="#999" />
          )}
        </View>
        <View style={styles.achievementContent}>
          <Text style={[
            styles.achievementTitle,
            !isUnlocked && styles.lockedText
          ]}>
            {achievement.title}
          </Text>
          <Text style={[
            styles.achievementDescription,
            !isUnlocked && styles.lockedText
          ]}>
            {isUnlocked ? achievement.description : achievement.requirement}
          </Text>
          {!isUnlocked && achievement.progress > 0 && (
            <View style={styles.achievementProgressContainer}>
              <View style={styles.achievementProgressBackground}>
                <View 
                  style={[
                    styles.achievementProgressFill,
                    { width: `${achievement.progress}%` }
                  ]} 
                />
              </View>
              <Text style={styles.achievementProgressText}>
                {achievement.progress}%
              </Text>
            </View>
          )}
          {isUnlocked && (
            <Text style={styles.achievementDate}>
              Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    );
  };
  
  // Render a workout program card
  const renderWorkoutProgramCard = (program: any) => {
    const isActive = program.active;
    const completionPercentage = WorkoutProgramService.getCompletionPercentage(program);
    
    return (
      <View key={program.id} style={styles.programCard}>
        <View style={styles.programHeader}>
          <View style={[
            styles.programIconContainer, 
            isActive ? styles.activeProgramIcon : {}
          ]}>
            <Ionicons name="barbell-outline" size={24} color={isActive ? "#fff" : "#6200ee"} />
          </View>
          <View style={styles.programTitleContainer}>
            <Text style={styles.programTitle}>{program.title}</Text>
            <Text style={styles.programSubtitle}>
              {program.level.charAt(0).toUpperCase() + program.level.slice(1)} • {program.focusArea}
            </Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Progress bar */}
        <View style={styles.programProgressContainer}>
          <View style={styles.programProgressBackground}>
            <View 
              style={[
                styles.programProgressFill,
                { width: `${completionPercentage}%` }
              ]} 
            />
          </View>
          <Text style={styles.programProgressText}>
            {completionPercentage}% Complete
          </Text>
        </View>
        
        {/* Action buttons */}
        <View style={styles.programActions}>
          <TouchableOpacity 
            style={styles.programButton}
            onPress={() => viewWorkoutDetails(program)}
          >
            <Text style={styles.programButtonText}>View</Text>
          </TouchableOpacity>
          
          {!isActive && (
            <TouchableOpacity 
              style={[styles.programButton, styles.activateButton]}
              onPress={() => activateProgram(program.id)}
            >
              <Text style={styles.activateButtonText}>Activate</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.programButton, styles.deleteButton]}
            onPress={() => deleteProgram(program.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Render weather info
  const renderWeatherInfo = () => {
    if (!weather) return null;
    
    let weatherIcon = 'sunny-outline';
    
    switch (weather.condition) {
      case 'sunny':
        weatherIcon = 'sunny-outline';
        break;
      case 'cloudy':
        weatherIcon = 'cloudy-outline';
        break;
      case 'rainy':
        weatherIcon = 'rainy-outline';
        break;
      case 'snowy':
        weatherIcon = 'snow-outline';
        break;
    }
    
    return (
      <View style={styles.weatherContainer}>
        <Ionicons name={weatherIcon as any} size={24} color="#fff" />
        <Text style={styles.weatherText}>
          {weather.temperature}°C {weather.condition}
        </Text>
        {weather.isOutdoorFriendly ? (
          <Text style={styles.weatherGoodText}>Good for outdoor activity</Text>
        ) : (
          <Text style={styles.weatherBadText}>Better for indoor activity</Text>
        )}
      </View>
    );
  };
  
  // Main render
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading your personalized goals...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Personalized Goals</Text>
        {renderWeatherInfo()}
      </View>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'goals' && styles.activeTab]}
          onPress={() => setActiveTab('goals')}
        >
          <Text style={[styles.tabText, activeTab === 'goals' && styles.activeTabText]}>
            Goals
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recommendations' && styles.activeTab]}
          onPress={() => setActiveTab('recommendations')}
        >
          <Text style={[styles.tabText, activeTab === 'recommendations' && styles.activeTabText]}>
            Recommendations
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'programs' && styles.activeTab]}
          onPress={() => setActiveTab('programs')}
        >
          <Text style={[styles.tabText, activeTab === 'programs' && styles.activeTabText]}>
            Programs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'achievements' && styles.activeTab]}
          onPress={() => setActiveTab('achievements')}
        >
          <Text style={[styles.tabText, activeTab === 'achievements' && styles.activeTabText]}>
            Achievements
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <View>
            {/* Daily Goals */}
            <Text style={styles.sectionTitle}>Daily Goals</Text>
            {activeGoals.filter(goal => goal.timeFrame === GoalTimeFrame.DAILY).length > 0 ? (
              activeGoals
                .filter(goal => goal.timeFrame === GoalTimeFrame.DAILY)
                .map(renderGoalCard)
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No daily goals found</Text>
              </View>
            )}
            
            {/* Weekly Goals */}
            <Text style={styles.sectionTitle}>Weekly Goals</Text>
            {activeGoals.filter(goal => goal.timeFrame === GoalTimeFrame.WEEKLY).length > 0 ? (
              activeGoals
                .filter(goal => goal.timeFrame === GoalTimeFrame.WEEKLY)
                .map(renderGoalCard)
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No weekly goals found</Text>
              </View>
            )}
            
            {/* Monthly Goals */}
            <Text style={styles.sectionTitle}>Monthly Goals</Text>
            {activeGoals.filter(goal => goal.timeFrame === GoalTimeFrame.MONTHLY).length > 0 ? (
              activeGoals
                .filter(goal => goal.timeFrame === GoalTimeFrame.MONTHLY)
                .map(renderGoalCard)
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No monthly goals found</Text>
              </View>
            )}
            
            {/* Generate Goals Button */}
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateNewGoals}
            >
              <Text style={styles.generateButtonText}>Generate New Goals</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <View>
            {recommendations.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Personalized Recommendations</Text>
                {recommendations.map(renderRecommendationCard)}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="bulb-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateTitle}>No Recommendations</Text>
                <Text style={styles.emptyStateText}>
                  We'll provide personalized recommendations based on your activity and goals.
                </Text>
                <TouchableOpacity
                  style={styles.generateRecsButton}
                  onPress={async () => {
                    await RecommendationsService.generateRecommendations();
                    await loadData();
                  }}
                >
                  <Text style={styles.generateRecsButtonText}>Generate Recommendations</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        
        {/* Programs Tab - NEW! */}
        {activeTab === 'programs' && (
          <View>
            {workoutPrograms.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Your Workout Programs</Text>
                {workoutPrograms.map(renderWorkoutProgramCard)}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="barbell-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateTitle}>No Workout Programs</Text>
                <Text style={styles.emptyStateText}>
                  You haven't saved any workout programs yet. Use the AI Coach to create personalized workout programs.
                </Text>
                <TouchableOpacity
                  style={styles.goToCoachButton}
                  onPress={() => navigation.navigate('coach')}
                >
                  <Text style={styles.goToCoachButtonText}>Go to AI Coach</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        
        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <View>
            {achievements.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Your Achievements</Text>
                {achievements
                  .filter(a => a.unlockedAt)
                  .map(renderAchievementCard)}
                
                <Text style={styles.sectionTitle}>Locked Achievements</Text>
                {achievements
                  .filter(a => !a.unlockedAt)
                  .map(renderAchievementCard)}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateTitle}>No Achievements Yet</Text>
                <Text style={styles.emptyStateText}>
                  Complete goals and stay active to earn achievements.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6200ee',
  },
  header: {
    backgroundColor: '#6200ee',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  weatherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  weatherText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
  },
  weatherGoodText: {
    color: '#a5d6a7',
    marginLeft: 8,
    fontSize: 14,
  },
  weatherBadText: {
    color: '#ef9a9a',
    marginLeft: 8,
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#6200ee',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    color: '#333',
  },
  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  goalHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  goalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0e6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalTitleContainer: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  goalTimeframe: {
    fontSize: 14,
    color: '#666',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBackground: {
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: 10,
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  streakText: {
    color: '#ff9800',
    fontWeight: 'bold',
  },
  recommendationCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  recommendationHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  recommendationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recommendationTitleContainer: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recommendationTimeframe: {
    fontSize: 14,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
    lineHeight: 20,
  },
  completeButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
    alignSelf: 'flex-end',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  achievementCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    flexDirection: 'row',
  },
  lockedAchievement: {
    backgroundColor: '#f5f5f5',
  },
  achievementIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  lockedText: {
    color: '#999',
  },
  achievementProgressContainer: {
    marginTop: 8,
  },
  achievementProgressBackground: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: 6,
    backgroundColor: '#9e9e9e',
    borderRadius: 3,
  },
  achievementProgressText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    textAlign: 'right',
  },
  // New styles for programs tab
  programCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  programHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  programIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0e6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activeProgramIcon: {
    backgroundColor: '#6200ee',
  },
  programTitleContainer: {
    flex: 1,
  },
  programTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  programSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  activeBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  programProgressContainer: {
    marginVertical: 8,
  },
  programProgressBackground: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  programProgressFill: {
    height: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  programProgressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  programActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  programButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
    backgroundColor: '#f5f5f5',
  },
  programButtonText: {
    color: '#666',
    fontSize: 14,
  },
  activateButton: {
    backgroundColor: '#e8f5e9',
  },
  activateButtonText: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },
  generateButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 40,
    alignSelf: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  generateRecsButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  generateRecsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  goToCoachButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  goToCoachButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});