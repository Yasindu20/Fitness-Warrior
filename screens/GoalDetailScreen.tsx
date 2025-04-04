import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '../app/firebaseConfig';
import { FitnessGoal, GoalTimeFrame, GoalStatus } from '../models/FitnessGoalModels';
import GoalsTrackingService from '../services/GoalsTrackingService';
import { formatDate } from '../utils/dateUtils';

const screenWidth = Dimensions.get('window').width;

export default function GoalDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const { goalId } = route.params;
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadGoalDetails();
  }, [goalId]);
  
  const loadGoalDetails = async () => {
    try {
      setLoading(true);
      
      // Get goal details
      const goalDoc = await getDoc(doc(db, 'fitnessGoals', goalId));
      
      if (!goalDoc.exists()) {
        Alert.alert('Error', 'Goal not found');
        navigation.goBack();
        return;
      }
      
      const goalData = { id: goalDoc.id, ...goalDoc.data() } as FitnessGoal;
      setGoal(goalData);
      
      // Load goal history (e.g., previous step counts or calories)
      await loadGoalHistory(goalData);
    } catch (error) {
      console.error('Error loading goal details:', error);
      Alert.alert('Error', 'Failed to load goal details');
    } finally {
      setLoading(false);
    }
  };
  
  const loadGoalHistory = async (goal: FitnessGoal) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      
      const history: { date: string; value: number }[] = [];
      
      switch (goal.type) {
        case 'step_count':
          // Get step history
          await loadStepHistory(goal, history);
          break;
        case 'calorie_intake':
          // Get calorie history
          await loadCalorieHistory(goal, history);
          break;
        case 'active_minutes':
          // For now, derive from step history
          await loadActiveMinutesHistory(goal, history);
          break;
        case 'distance':
          // For now, derive from step history
          await loadDistanceHistory(goal, history);
          break;
      }
      
      setHistory(history);
    } catch (error) {
      console.error('Error loading goal history:', error);
    }
  };
  
  const loadStepHistory = async (goal: FitnessGoal, history: any[]) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    let startDate, endDate;
    const today = new Date();
    
    // Determine date range based on goal timeframe
    switch (goal.timeFrame) {
      case GoalTimeFrame.DAILY:
        // Show last 7 days
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 6);
        endDate = today;
        break;
      case GoalTimeFrame.WEEKLY:
        // Show last 4 weeks
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 28);
        endDate = today;
        break;
      case GoalTimeFrame.MONTHLY:
        // Show last 6 months
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 5);
        endDate = today;
        break;
    }
    
    // Format dates
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    // Query step history
    const stepHistoryRef = collection(db, 'stepHistory');
    const stepQuery = query(
      stepHistoryRef,
      where('userId', '==', userId),
      where('date', '>=', startDateStr),
      where('date', '<=', endDateStr),
      orderBy('date', 'asc')
    );
    
    const querySnapshot = await getDocs(stepQuery);
    
    // Group by appropriate time period
    const groupedData: { [key: string]: number } = {};
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      let key = data.date;
      
      // For weekly and monthly goals, group by week or month
      if (goal.timeFrame === GoalTimeFrame.WEEKLY) {
        // Get week number (simple implementation - group by 7 days)
        const date = new Date(data.date);
        const weekNum = Math.floor((date.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        key = `Week ${weekNum + 1}`;
      } else if (goal.timeFrame === GoalTimeFrame.MONTHLY) {
        // Get month
        const date = new Date(data.date);
        key = date.toLocaleString('default', { month: 'short' });
      }
      
      if (!groupedData[key]) groupedData[key] = 0;
      groupedData[key] += data.steps;
    });
    
    // Convert to array for chart
    Object.keys(groupedData).forEach(key => {
      history.push({
        date: key,
        value: groupedData[key]
      });
    });
  };
  
  const loadCalorieHistory = async (goal: FitnessGoal, history: any[]) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    let startDate, endDate;
    const today = new Date();
    
    // Determine date range based on goal timeframe
    switch (goal.timeFrame) {
      case GoalTimeFrame.DAILY:
        // Show last 7 days
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 6);
        endDate = today;
        break;
      case GoalTimeFrame.WEEKLY:
        // Show last 4 weeks
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 28);
        endDate = today;
        break;
      case GoalTimeFrame.MONTHLY:
        // Show last 6 months
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 5);
        endDate = today;
        break;
    }
    
    // Format dates
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    // Query calorie history
    const calorieIntakeRef = collection(db, 'calorieIntake');
    const calorieQuery = query(
      calorieIntakeRef,
      where('userId', '==', userId),
      where('date', '>=', startDateStr),
      where('date', '<=', endDateStr),
      orderBy('date', 'asc')
    );
    
    const querySnapshot = await getDocs(calorieQuery);
    
    // Group by appropriate time period
    const groupedData: { [key: string]: number } = {};
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      let key = data.date;
      
      // For weekly and monthly goals, group by week or month
      if (goal.timeFrame === GoalTimeFrame.WEEKLY) {
        // Get week number (simple implementation - group by 7 days)
        const date = new Date(data.date);
        const weekNum = Math.floor((date.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        key = `Week ${weekNum + 1}`;
      } else if (goal.timeFrame === GoalTimeFrame.MONTHLY) {
        // Get month
        const date = new Date(data.date);
        key = date.toLocaleString('default', { month: 'short' });
      }
      
      if (!groupedData[key]) groupedData[key] = 0;
      groupedData[key] += data.calories;
    });
    
    // Convert to array for chart
    Object.keys(groupedData).forEach(key => {
      history.push({
        date: key,
        value: groupedData[key]
      });
    });
  };
  
  const loadActiveMinutesHistory = async (goal: FitnessGoal, history: any[]) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    // For now, we'll estimate active minutes from steps (100 steps ≈ 1 active minute)
    let startDate, endDate;
    const today = new Date();
    
    // Determine date range based on goal timeframe
    switch (goal.timeFrame) {
      case GoalTimeFrame.DAILY:
        // Show last 7 days
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 6);
        endDate = today;
        break;
      case GoalTimeFrame.WEEKLY:
        // Show last 4 weeks
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 28);
        endDate = today;
        break;
      case GoalTimeFrame.MONTHLY:
        // Show last 6 months
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 5);
        endDate = today;
        break;
    }
    
    // Format dates
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    // Query step history to derive active minutes
    const stepHistoryRef = collection(db, 'stepHistory');
    const stepQuery = query(
      stepHistoryRef,
      where('userId', '==', userId),
      where('date', '>=', startDateStr),
      where('date', '<=', endDateStr),
      orderBy('date', 'asc')
    );
    
    const querySnapshot = await getDocs(stepQuery);
    
    // Group by appropriate time period
    const groupedData: { [key: string]: number } = {};
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      let key = data.date;
      
      // For weekly and monthly goals, group by week or month
      if (goal.timeFrame === GoalTimeFrame.WEEKLY) {
        // Get week number (simple implementation - group by 7 days)
        const date = new Date(data.date);
        const weekNum = Math.floor((date.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        key = `Week ${weekNum + 1}`;
      } else if (goal.timeFrame === GoalTimeFrame.MONTHLY) {
        // Get month
        const date = new Date(data.date);
        key = date.toLocaleString('default', { month: 'short' });
      }
      
      if (!groupedData[key]) groupedData[key] = 0;
      // Convert steps to active minutes (rough estimate: 100 steps = 1 minute)
      groupedData[key] += Math.round(data.steps / 100);
    });
    
    // Convert to array for chart
    Object.keys(groupedData).forEach(key => {
      history.push({
        date: key,
        value: groupedData[key]
      });
    });
  };
  
  const loadDistanceHistory = async (goal: FitnessGoal, history: any[]) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    // For now, we'll estimate distance from steps (1 step ≈ 0.762 meters)
    let startDate, endDate;
    const today = new Date();
    
    // Determine date range based on goal timeframe
    switch (goal.timeFrame) {
      case GoalTimeFrame.DAILY:
        // Show last 7 days
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 6);
        endDate = today;
        break;
      case GoalTimeFrame.WEEKLY:
        // Show last 4 weeks
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 28);
        endDate = today;
        break;
      case GoalTimeFrame.MONTHLY:
        // Show last 6 months
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 5);
        endDate = today;
        break;
    }
    
    // Format dates
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    // Query step history to derive distance
    const stepHistoryRef = collection(db, 'stepHistory');
    const stepQuery = query(
      stepHistoryRef,
      where('userId', '==', userId),
      where('date', '>=', startDateStr),
      where('date', '<=', endDateStr),
      orderBy('date', 'asc')
    );
    
    const querySnapshot = await getDocs(stepQuery);
    
    // Group by appropriate time period
    const groupedData: { [key: string]: number } = {};
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      let key = data.date;
      
      // For weekly and monthly goals, group by week or month
      if (goal.timeFrame === GoalTimeFrame.WEEKLY) {
        // Get week number (simple implementation - group by 7 days)
        const date = new Date(data.date);
        const weekNum = Math.floor((date.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        key = `Week ${weekNum + 1}`;
      } else if (goal.timeFrame === GoalTimeFrame.MONTHLY) {
        // Get month
        const date = new Date(data.date);
        key = date.toLocaleString('default', { month: 'short' });
      }
      
      if (!groupedData[key]) groupedData[key] = 0;
      // Convert steps to distance in kilometers (0.762 meters per step)
      groupedData[key] += data.steps * 0.000762;
    });
    
    // Convert to array for chart
    Object.keys(groupedData).forEach(key => {
      history.push({
        date: key,
        value: parseFloat(groupedData[key].toFixed(2))
      });
    });
  };
  
  // Determine goal type icon
  const getGoalTypeIcon = () => {
    if (!goal) return 'fitness-outline';
    
    switch (goal.type) {
      case 'step_count':
        return 'footsteps-outline';
      case 'active_minutes':
        return 'timer-outline';
      case 'calorie_intake':
        return 'fast-food-outline';
      case 'distance':
        return 'map-outline';
      default:
        return 'fitness-outline';
    }
  };
  
  // Determine goal status color
  const getGoalStatusColor = () => {
    if (!goal) return '#ccc';
    
    switch (goal.status) {
      case GoalStatus.COMPLETED:
        return '#4CAF50';
      case GoalStatus.IN_PROGRESS:
        return '#2196F3';
      case GoalStatus.PENDING:
        return '#FFC107';
      case GoalStatus.FAILED:
        return '#F44336';
      default:
        return '#ccc';
    }
  };
  
  // Determine goal status label
  const getGoalStatusLabel = () => {
    if (!goal) return 'Unknown';
    
    switch (goal.status) {
      case GoalStatus.COMPLETED:
        return 'Completed';
      case GoalStatus.IN_PROGRESS:
        return 'In Progress';
      case GoalStatus.PENDING:
        return 'Not Started';
      case GoalStatus.FAILED:
        return 'Failed';
      default:
        return 'Unknown';
    }
  };
  
  // Format value based on goal type
  const formatValue = (value: number) => {
    if (!goal) return value.toLocaleString();
    
    switch (goal.type) {
      case 'step_count':
        return value.toLocaleString();
      case 'active_minutes':
        return `${value} min`;
      case 'calorie_intake':
        return `${value} kcal`;
      case 'distance':
        return `${value.toFixed(2)} km`;
      default:
        return value.toLocaleString();
    }
  };
  
  // Format goal timeline
  const formatGoalTimeline = () => {
    if (!goal) return '';
    
    const startDate = new Date(goal.startDate);
    const endDate = new Date(goal.endDate);
    
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };
  
  // Calculate progress percentage
  const calculateProgress = () => {
    if (!goal) return 0;
    
    return Math.min(100, Math.round((goal.current / goal.target) * 100));
  };
  
  // Render the main component
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading goal details...</Text>
      </View>
    );
  }
  
  if (!goal) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={48} color="#F44336" />
        <Text style={styles.errorText}>Goal not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      {/* Goal Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Goal Details</Text>
      </View>
      
      {/* Goal Card */}
      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name={getGoalTypeIcon() as any} size={32} color="#6200ee" />
          </View>
          <View style={styles.goalInfo}>
            <Text style={styles.goalTitle}>{goal.description}</Text>
            <Text style={styles.goalTimeframe}>{formatGoalTimeline()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getGoalStatusColor() }]}>
              <Text style={styles.statusText}>{getGoalStatusLabel()}</Text>
            </View>
          </View>
        </View>
        
        {/* Progress Circle */}
        <View style={styles.progressContainer}>
          <View style={styles.progressCircleContainer}>
            <View style={styles.progressCircle}>
              <Text style={styles.progressPercent}>{calculateProgress()}%</Text>
            </View>
            <View 
              style={[
                styles.progressCircleOverlay, 
                { 
                  transform: [
                    { rotate: `${Math.min(360, (calculateProgress() / 100) * 360)}deg` }
                  ]
                }
              ]}
            />
          </View>
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatLabel}>Current</Text>
              <Text style={styles.progressStatValue}>{formatValue(goal.current)}</Text>
            </View>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatLabel}>Target</Text>
              <Text style={styles.progressStatValue}>{formatValue(goal.target)}</Text>
            </View>
            {goal.streak && goal.streak > 0 && (
              <View style={styles.progressStat}>
                <Text style={styles.progressStatLabel}>Streak</Text>
                <Text style={styles.progressStatValue}>{goal.streak} days 🔥</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* History Chart */}
        {history.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>History</Text>
            <LineChart
              data={{
                labels: history.map(item => item.date),
                datasets: [
                  {
                    data: history.map(item => item.value),
                  },
                ],
              }}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#f5f5f5',
                backgroundGradientFrom: '#f5f5f5',
                backgroundGradientTo: '#f5f5f5',
                decimalPlaces: goal.type === 'distance' ? 1 : 0,
                color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#6200ee',
                },
                propsForLabels: {
                  fontSize: 10,
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}
        
        {/* Guidance Section */}
        <View style={styles.guidanceContainer}>
          <Text style={styles.guidanceTitle}>
            <Ionicons name="bulb-outline" size={18} color="#6200ee" /> Tips
          </Text>
          {renderGuidanceTips()}
        </View>
      </View>
    </ScrollView>
  );
  
  // Helper function to render guidance tips based on goal type
  function renderGuidanceTips() {
    if (!goal) return null;
    
    switch (goal.type) {
      case 'step_count':
        return (
          <>
            <Text style={styles.guidanceTip}>• Try to take short walking breaks every hour</Text>
            <Text style={styles.guidanceTip}>• Use stairs instead of elevators when possible</Text>
            <Text style={styles.guidanceTip}>• Park farther away from entrances to add extra steps</Text>
            {goal.current < goal.target * 0.5 && (
              <Text style={styles.guidanceTip}>• You're currently behind on this goal. Consider taking a 15-minute walk to catch up.</Text>
            )}
          </>
        );
      
      case 'active_minutes':
        return (
          <>
            <Text style={styles.guidanceTip}>• Any activity that gets your heart rate up counts</Text>
            <Text style={styles.guidanceTip}>• Try to accumulate activity in sessions of at least 10 minutes</Text>
            <Text style={styles.guidanceTip}>• Mix cardio, strength training, and flexibility exercises</Text>
          </>
        );
      
      case 'calorie_intake':
        return (
          <>
            <Text style={styles.guidanceTip}>• Focus on nutrient-dense foods that keep you full longer</Text>
            <Text style={styles.guidanceTip}>• Drink water before meals to help control portions</Text>
            <Text style={styles.guidanceTip}>• Plan meals ahead to avoid impulse eating</Text>
            {goal.current > goal.target * 0.9 && (
              <Text style={styles.guidanceTip}>• You're close to your calorie limit for the day. Consider lighter options for your next meal.</Text>
            )}
          </>
        );
      
      case 'distance':
        return (
          <>
            <Text style={styles.guidanceTip}>• Break your distance goal into smaller daily chunks</Text>
            <Text style={styles.guidanceTip}>• Try different routes to keep walks interesting</Text>
            <Text style={styles.guidanceTip}>• Consider a hiking or walking group for motivation</Text>
          </>
        );
      
      default:
        return (
          <Text style={styles.guidanceTip}>• Stay consistent with your habits to reach your goal</Text>
        );
    }
  }
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    marginVertical: 16,
  },
  header: {
    backgroundColor: '#6200ee',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 12,
  },
  backButtonText: {
    color: '#6200ee',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  goalCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    padding: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0e6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  goalTimeframe: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 10,
  },
  progressCircleContainer: {
    width: 120,
    height: 120,
    marginRight: 20,
    position: 'relative',
  },
  progressCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 12,
    borderColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleOverlay: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 12,
    borderLeftColor: '#6200ee',
    borderTopColor: '#6200ee',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  progressStats: {
    flex: 1,
  },
  progressStat: {
    marginBottom: 12,
  },
  progressStatLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  progressStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  chartContainer: {
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  guidanceContainer: {
    padding: 16,
    backgroundColor: '#f0e6ff',
    borderRadius: 8,
  },
  guidanceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 12,
  },
  guidanceTip: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
});