import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { auth, db } from '../app/firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { formatDate } from '../utils/dateUtils';

const screenWidth = Dimensions.get('window').width;

const CHART_CONFIG = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16
  },
  propsForDots: {
    r: '5',
    strokeWidth: '2',
    stroke: '#6200ee'
  }
};

export default function FitnessAnalyticsScreen({ navigation }: { navigation: any }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('week'); // 'week', 'month', 'year'
  const [stepData, setStepData] = useState<any[]>([]);
  const [calorieData, setCalorieData] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState({
    totalSteps: 0,
    totalCaloriesBurned: 0,
    totalCaloriesConsumed: 0,
    calorieBalance: 0,
    activeMinutes: 0,
    distance: 0,
    avgStepsPerDay: 0,
    stepStreak: 0
  });
  
  // Load data when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadAnalyticsData();
      return () => {}; // Cleanup function
    }, [selectedTimeframe])
  );
  
  // Load analytics data
  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not logged in');
      }
      
      // Determine date range based on selected timeframe
      const { startDate, endDate, interval } = getDateRange(selectedTimeframe);
      
      // Load step data
      await loadStepData(userId, startDate, endDate, interval);
      
      // Load calorie data
      await loadCalorieData(userId, startDate, endDate, interval);
      
      // Calculate summary statistics
      calculateSummaryStats();
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Determine date range based on selected timeframe
  const getDateRange = (timeframe: string) => {
    const today = new Date();
    let startDate = new Date();
    let interval: 'day' | 'week' | 'month' = 'day';
    
    switch (timeframe) {
      case 'week':
        // Last 7 days
        startDate.setDate(today.getDate() - 7);
        interval = 'day';
        break;
      case 'month':
        // Last 30 days
        startDate.setDate(today.getDate() - 30);
        interval = 'day';
        break;
      case 'year':
        // Last 12 months
        startDate.setMonth(today.getMonth() - 12);
        interval = 'month';
        break;
    }
    
    return {
      startDate: formatDate(startDate),
      endDate: formatDate(today),
      interval
    };
  };
  
  // Load step data
  const loadStepData = async (userId: string, startDate: string, endDate: string, interval: string) => {
    try {
      const stepHistoryRef = collection(db, 'stepHistory');
      const stepQuery = query(
        stepHistoryRef,
        where('userId', '==', userId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );
      
      const querySnapshot = await getDocs(stepQuery);
      
      // Group data by the specified interval
      const groupedData = groupDataByInterval(querySnapshot.docs.map(doc => doc.data()), interval);
      
      setStepData(groupedData);
    } catch (error) {
      console.error('Error loading step data:', error);
    }
  };
  
  // Load calorie data
  const loadCalorieData = async (userId: string, startDate: string, endDate: string, interval: string) => {
    try {
      const calorieIntakeRef = collection(db, 'calorieIntake');
      const calorieQuery = query(
        calorieIntakeRef,
        where('userId', '==', userId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );
      
      const querySnapshot = await getDocs(calorieQuery);
      
      // Group data by the specified interval
      const groupedData = groupDataByInterval(querySnapshot.docs.map(doc => doc.data()), interval);
      
      setCalorieData(groupedData);
    } catch (error) {
      console.error('Error loading calorie data:', error);
    }
  };
  
  // Group data by interval (day, week, month)
  const groupDataByInterval = (data: any[], interval: string) => {
    const result: any[] = [];
    const groupedData: { [key: string]: number } = {};
    
    // Group data by interval
    data.forEach(item => {
      let key = item.date;
      
      if (interval === 'week') {
        // Get week number
        const date = new Date(item.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Sunday
        key = formatDate(weekStart);
      } else if (interval === 'month') {
        // Get month
        const date = new Date(item.date);
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      // Determine the value to add (steps or calories)
      const value = item.steps || item.calories || 0;
      
      if (!groupedData[key]) {
        groupedData[key] = 0;
      }
      
      groupedData[key] += value;
    });
    
    // Convert to array format for charts
    Object.keys(groupedData).sort().forEach(key => {
      let label = key;
      
      // Format label for display
      if (interval === 'day') {
        const date = new Date(key);
        label = `${date.getMonth() + 1}/${date.getDate()}`;
      } else if (interval === 'week') {
        const date = new Date(key);
        label = `W${Math.ceil((date.getDate() + date.getDay()) / 7)}`;
      } else if (interval === 'month') {
        const [year, month] = key.split('-');
        label = `${month}/${year.slice(2)}`;
      }
      
      result.push({
        date: key,
        label,
        value: groupedData[key]
      });
    });
    
    return result;
  };
  
  // Calculate summary statistics
  const calculateSummaryStats = () => {
    // Calculate total steps
    const totalSteps = stepData.reduce((sum, item) => sum + item.value, 0);
    
    // Calculate average steps per day
    const avgStepsPerDay = stepData.length > 0 ? Math.round(totalSteps / stepData.length) : 0;
    
    // Calculate total calories consumed
    const totalCaloriesConsumed = calorieData.reduce((sum, item) => sum + item.value, 0);
    
    // Estimate calories burned from steps (very rough estimate: 20 steps = 1 calorie)
    const totalCaloriesBurned = Math.round(totalSteps / 20);
    
    // Calculate calorie balance
    const calorieBalance = totalCaloriesBurned - totalCaloriesConsumed;
    
    // Estimate active minutes from steps (rough estimate: 100 steps = 1 active minute)
    const activeMinutes = Math.round(totalSteps / 100);
    
    // Estimate distance from steps (0.762 meters per step)
    const distance = parseFloat((totalSteps * 0.000762).toFixed(2));
    
    // Calculate step streak (simplified version - consecutive days with steps > 0)
    let stepStreak = 0;
    if (selectedTimeframe === 'week' || selectedTimeframe === 'month') {
      // Group by date
      const dateMap: { [key: string]: boolean } = {};
      
      stepData.forEach(item => {
        if (item.value > 0) {
          dateMap[item.date] = true;
        }
      });
      
      // Check for consecutive days
      const dates = Object.keys(dateMap).sort();
      let currentStreak = 0;
      
      for (let i = 0; i < dates.length; i++) {
        if (i === 0) {
          currentStreak = 1;
        } else {
          const prevDate = new Date(dates[i - 1]);
          const currDate = new Date(dates[i]);
          
          const diffTime = currDate.getTime() - prevDate.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          
          if (diffDays === 1) {
            currentStreak++;
          } else {
            currentStreak = 1;
          }
        }
        
        stepStreak = Math.max(stepStreak, currentStreak);
      }
    }
    
    setSummaryData({
      totalSteps,
      totalCaloriesBurned,
      totalCaloriesConsumed,
      calorieBalance,
      activeMinutes,
      distance,
      avgStepsPerDay,
      stepStreak
    });
  };
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalyticsData();
  };
  
  // Render loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading analytics data...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fitness Analytics</Text>
      </View>
      
      {/* Timeframe Selection */}
      <View style={styles.timeframeContainer}>
        <TouchableOpacity
          style={[styles.timeframeButton, selectedTimeframe === 'week' && styles.selectedTimeframe]}
          onPress={() => setSelectedTimeframe('week')}
        >
          <Text style={[styles.timeframeText, selectedTimeframe === 'week' && styles.selectedTimeframeText]}>
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeframeButton, selectedTimeframe === 'month' && styles.selectedTimeframe]}
          onPress={() => setSelectedTimeframe('month')}
        >
          <Text style={[styles.timeframeText, selectedTimeframe === 'month' && styles.selectedTimeframeText]}>
            Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeframeButton, selectedTimeframe === 'year' && styles.selectedTimeframe]}
          onPress={() => setSelectedTimeframe('year')}
        >
          <Text style={[styles.timeframeText, selectedTimeframe === 'year' && styles.selectedTimeframeText]}>
            Year
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="footsteps-outline" size={24} color="#6200ee" />
              <Text style={styles.statValue}>{summaryData.totalSteps.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Steps</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="flame-outline" size={24} color="#FF9800" />
              <Text style={styles.statValue}>{summaryData.totalCaloriesBurned.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Calories Burned</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="fast-food-outline" size={24} color="#F44336" />
              <Text style={styles.statValue}>{summaryData.totalCaloriesConsumed.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Calories Consumed</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons 
                name={summaryData.calorieBalance >= 0 ? "trending-down-outline" : "trending-up-outline"} 
                size={24} 
                color={summaryData.calorieBalance >= 0 ? "#4CAF50" : "#F44336"} 
              />
              <Text 
                style={[
                  styles.statValue, 
                  { color: summaryData.calorieBalance >= 0 ? "#4CAF50" : "#F44336" }
                ]}
              >
                {Math.abs(summaryData.calorieBalance).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>
                Calorie {summaryData.calorieBalance >= 0 ? "Deficit" : "Surplus"}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="timer-outline" size={24} color="#2196F3" />
              <Text style={styles.statValue}>{summaryData.activeMinutes}</Text>
              <Text style={styles.statLabel}>Active Minutes</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="map-outline" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{summaryData.distance} km</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="analytics-outline" size={24} color="#9C27B0" />
              <Text style={styles.statValue}>{summaryData.avgStepsPerDay.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Avg Steps/Day</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="bonfire-outline" size={24} color="#FF9800" />
              <Text style={styles.statValue}>{summaryData.stepStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>
        </View>
        
        {/* Steps Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Step Trends</Text>
          {stepData.length > 0 ? (
            <LineChart
              data={{
                labels: stepData.map(item => item.label),
                datasets: [
                  {
                    data: stepData.map(item => item.value),
                  },
                ],
              }}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                ...CHART_CONFIG,
                color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
              }}
              bezier
              style={styles.chart}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="analytics-outline" size={48} color="#ccc" />
              <Text style={styles.emptyChartText}>No step data available</Text>
            </View>
          )}
        </View>
        
        {/* Calorie Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Calorie Intake</Text>
          {calorieData.length > 0 ? (
            <BarChart
              data={{
                labels: calorieData.map(item => item.label),
                datasets: [
                  {
                    data: calorieData.map(item => item.value),
                  },
                ],
              }}
              width={screenWidth - 40}
              height={220}
              yAxisLabel=""
              yAxisSuffix=" cal"
              chartConfig={{
                ...CHART_CONFIG,
                color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
              }}
              style={styles.chart}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="analytics-outline" size={48} color="#ccc" />
              <Text style={styles.emptyChartText}>No calorie data available</Text>
            </View>
          )}
        </View>
        
        {/* Calorie Balance Chart */}
        {summaryData.totalCaloriesBurned > 0 && summaryData.totalCaloriesConsumed > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.sectionTitle}>Calorie Balance</Text>
            <PieChart
              data={[
                {
                  name: 'Burned',
                  calories: summaryData.totalCaloriesBurned,
                  color: '#4CAF50',
                  legendFontColor: '#7F7F7F',
                  legendFontSize: 12
                },
                {
                  name: 'Consumed',
                  calories: summaryData.totalCaloriesConsumed,
                  color: '#F44336',
                  legendFontColor: '#7F7F7F',
                  legendFontSize: 12
                }
              ]}
              width={screenWidth - 40}
              height={220}
              chartConfig={CHART_CONFIG}
              accessor="calories"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}
        
        {/* Insights Section */}
        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <View style={styles.insightCard}>
            <Ionicons name="trending-up-outline" size={24} color="#6200ee" style={styles.insightIcon} />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Activity Trend</Text>
              <Text style={styles.insightText}>
                {generateActivityTrendInsight()}
              </Text>
            </View>
          </View>
          <View style={styles.insightCard}>
            <Ionicons name="nutrition-outline" size={24} color="#F44336" style={styles.insightIcon} />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Nutrition Insight</Text>
              <Text style={styles.insightText}>
                {generateNutritionInsight()}
              </Text>
            </View>
          </View>
          <View style={styles.insightCard}>
            <Ionicons name="bulb-outline" size={24} color="#FF9800" style={styles.insightIcon} />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Recommendation</Text>
              <Text style={styles.insightText}>
                {generateRecommendation()}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
  
  // Helper function to generate activity trend insight
  function generateActivityTrendInsight() {
    if (stepData.length < 2) {
      return "Not enough data to analyze activity trends yet. Keep tracking your steps!";
    }
    
    // Look at the last few data points to see if steps are increasing or decreasing
    const recentData = stepData.slice(-3);
    
    if (recentData.length >= 2) {
      const lastValue = recentData[recentData.length - 1].value;
      const prevValue = recentData[recentData.length - 2].value;
      const percentChange = ((lastValue - prevValue) / prevValue) * 100;
      
      if (percentChange > 20) {
        return `Great job! Your activity has increased by ${Math.round(percentChange)}% recently. Keep up the good work!`;
      } else if (percentChange > 5) {
        return `You're making progress! Your activity has increased by ${Math.round(percentChange)}% recently.`;
      } else if (percentChange < -20) {
        return `Your activity has decreased by ${Math.round(Math.abs(percentChange))}% recently. Try to find ways to be more active.`;
      } else if (percentChange < -5) {
        return `Your activity has slightly decreased by ${Math.round(Math.abs(percentChange))}% recently. Consider adding a short walk to your day.`;
      } else {
        return "Your activity level has been consistent recently. For better results, try to gradually increase your daily steps.";
      }
    }
    
    return "Keep tracking your steps to see activity trends and insights.";
  }
  
  // Helper function to generate nutrition insight
  function generateNutritionInsight() {
    if (calorieData.length < 3) {
      return "Not enough nutrition data yet. Continue logging your meals to get insights.";
    }
    
    if (summaryData.calorieBalance >= 500) {
      return `You have a calorie deficit of ${summaryData.calorieBalance.toLocaleString()} calories. This is on track for weight loss goals if that's your aim.`;
    } else if (summaryData.calorieBalance >= 0) {
      return `You have a small calorie deficit of ${summaryData.calorieBalance.toLocaleString()} calories. This is good for maintenance or gradual weight loss.`;
    } else if (summaryData.calorieBalance > -500) {
      return `You have a small calorie surplus of ${Math.abs(summaryData.calorieBalance).toLocaleString()} calories. This is fine for maintenance or if you're trying to build muscle.`;
    } else {
      return `You have a calorie surplus of ${Math.abs(summaryData.calorieBalance).toLocaleString()} calories. If weight loss is your goal, consider reducing portion sizes or increasing activity.`;
    }
  }
  
  // Helper function to generate personalized recommendation
  function generateRecommendation() {
    // Base recommendation on activity level and calorie balance
    if (summaryData.avgStepsPerDay < 5000) {
      return "Try to increase your daily steps to at least 7,500. Start by adding a 10-minute walk after meals.";
    } else if (summaryData.avgStepsPerDay < 7500) {
      return "You're on the right track! Aim for 10,000 steps daily by adding a 20-minute walk to your routine.";
    } else if (summaryData.calorieBalance < -1000) {
      return "Your calorie surplus is quite high. Focus on portion control and choosing nutrient-dense foods to help manage your calorie intake.";
    } else if (summaryData.stepStreak > 3) {
      return `Great job maintaining a ${summaryData.stepStreak}-day activity streak! Keep the momentum going.`;
    } else {
      return "Try to be consistent with your daily activity. Setting a regular time for exercise can help build lasting habits.";
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
  header: {
    backgroundColor: '#6200ee',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  selectedTimeframe: {
    borderBottomWidth: 3,
    borderBottomColor: '#6200ee',
  },
  timeframeText: {
    fontSize: 14,
    color: '#666',
  },
  selectedTimeframeText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  insightsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  insightIcon: {
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});