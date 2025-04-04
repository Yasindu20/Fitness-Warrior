import {
    FitnessRecommendation,
    WeatherContext,
    UserAnalytics,
    GoalType,
    GoalTimeFrame,
    GoalStatus
  } from '../models/FitnessGoalModels';
  import { formatDate } from '../utils/dateUtils';
  import { auth, db } from '../app/firebaseConfig';
  import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    deleteDoc,
    doc,
    updateDoc,
    serverTimestamp
  } from 'firebase/firestore';
  import GoalsTrackingService from './GoalsTrackingService';
  import { v4 as uuidv4 } from 'uuid';
  
  // Sample weather data - in a real app, this would come from a weather API
  const SAMPLE_WEATHER: WeatherContext = {
    condition: 'sunny',
    temperature: 22,
    humidity: 60,
    windSpeed: 5,
    isOutdoorFriendly: true
  };
  
  class RecommendationsService {
    // Store the current weather context
    private weatherContext: WeatherContext = SAMPLE_WEATHER;
    
    /**
     * Generate personalized recommendations based on user data and context
     */
    async generateRecommendations(): Promise<FitnessRecommendation[]> {
      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error('User not logged in');
        }
        
        // Get user profile
        const userDoc = await getDocs(collection(db, 'users'));
        let userProfile = null;
        userDoc.forEach(doc => {
          if (doc.id === user.uid) {
            userProfile = doc.data();
          }
        });
        
        if (!userProfile) {
          throw new Error('User profile not found');
        }
        
        // Get active goals
        const activeGoals = await GoalsTrackingService.getActiveGoals();
        
        // Get recent analytics
        const analytics = await this.getUserAnalytics(user.uid);
        
        // Generate recommendations
        const recommendations: FitnessRecommendation[] = [];
        
        // 1. Step count recommendations
        recommendations.push(...this.generateStepRecommendations(user.uid, activeGoals, analytics));
        
        // 2. Nutrition recommendations
        recommendations.push(...this.generateNutritionRecommendations(user.uid, activeGoals, analytics, userProfile));
        
        // 3. Activity recommendations
        recommendations.push(...this.generateActivityRecommendations(user.uid, activeGoals, this.weatherContext));
        
        // 4. Recovery recommendations
        recommendations.push(...this.generateRecoveryRecommendations(user.uid, analytics));
        
        // Save recommendations to Firestore
        await this.saveRecommendations(recommendations);
        
        return recommendations;
      } catch (error) {
        console.error('Error generating recommendations:', error);
        return [];
      }
    }
    
    /**
     * Get active recommendations for the current user
     */
    async getActiveRecommendations(): Promise<FitnessRecommendation[]> {
      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error('User not logged in');
        }
        
        const today = new Date().toISOString();
        
        const recommendationsRef = collection(db, 'recommendations');
        const recommendationsQuery = query(
          recommendationsRef,
          where('userId', '==', user.uid),
          where('completed', '==', false),
          orderBy('priority', 'desc'),
          limit(10)
        );
        
        const querySnapshot = await getDocs(recommendationsQuery);
        const recommendations: FitnessRecommendation[] = [];
        
        querySnapshot.forEach(doc => {
          const recommendation = {
            id: doc.id,
            ...doc.data()
          } as FitnessRecommendation;
          
          // Filter out expired recommendations
          if (!recommendation.expiresAt || recommendation.expiresAt > today) {
            recommendations.push(recommendation);
          }
        });
        
        return recommendations;
      } catch (error) {
        console.error('Error getting active recommendations:', error);
        return [];
      }
    }
    
    /**
     * Mark a recommendation as completed
     */
    async completeRecommendation(recommendationId: string): Promise<boolean> {
      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error('User not logged in');
        }
        
        const recommendationRef = doc(db, 'recommendations', recommendationId);
        await updateDoc(recommendationRef, {
          completed: true,
          updatedAt: serverTimestamp()
        });
        
        return true;
      } catch (error) {
        console.error('Error completing recommendation:', error);
        return false;
      }
    }
    
    /**
     * Set the current weather context
     */
    setWeatherContext(weather: WeatherContext): void {
      this.weatherContext = weather;
    }
    
    /**
     * Get user analytics from Firestore
     */
    private async getUserAnalytics(userId: string): Promise<UserAnalytics[]> {
      try {
        const today = formatDate(new Date());
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = formatDate(sevenDaysAgo);
        
        // Get step data
        const stepHistoryRef = collection(db, 'stepHistory');
        const stepQuery = query(
          stepHistoryRef,
          where('userId', '==', userId),
          where('date', '>=', sevenDaysAgoStr),
          orderBy('date', 'desc')
        );
        
        const stepSnapshot = await getDocs(stepQuery);
        const stepData: { [key: string]: number } = {};
        
        stepSnapshot.forEach(doc => {
          const data = doc.data();
          if (!stepData[data.date]) stepData[data.date] = 0;
          stepData[data.date] += data.steps;
        });
        
        // Get calorie intake data
        const calorieIntakeRef = collection(db, 'calorieIntake');
        const calorieQuery = query(
          calorieIntakeRef,
          where('userId', '==', userId),
          where('date', '>=', sevenDaysAgoStr),
          orderBy('date', 'desc')
        );
        
        const calorieSnapshot = await getDocs(calorieQuery);
        const calorieData: { [key: string]: number } = {};
        
        calorieSnapshot.forEach(doc => {
          const data = doc.data();
          if (!calorieData[data.date]) calorieData[data.date] = 0;
          calorieData[data.date] += data.calories;
        });
        
        // Combine into analytics objects
        const analytics: UserAnalytics[] = [];
        const allDates = new Set([...Object.keys(stepData), ...Object.keys(calorieData)]);
        
        allDates.forEach(date => {
          const steps = stepData[date] || 0;
          const caloriesConsumed = calorieData[date] || 0;
          
          // Estimate calories burned based on steps (very rough calculation)
          const caloriesBurned = steps / 20; // Approx 20 steps = 1 calorie
          
          analytics.push({
            userId,
            date,
            stepCount: steps,
            caloriesBurned,
            caloriesConsumed,
            calorieDifference: caloriesBurned - caloriesConsumed,
            activeMinutes: Math.round(steps / 100), // Rough estimate
            distance: steps * 0.000762, // Average step is 0.762 meters
          });
        });
        
        return analytics;
      } catch (error) {
        console.error('Error getting user analytics:', error);
        return [];
      }
    }
    
    /**
     * Generate step count recommendations
     */
    private generateStepRecommendations(
      userId: string,
      activeGoals: any[],
      analytics: UserAnalytics[]
    ): FitnessRecommendation[] {
      const recommendations: FitnessRecommendation[] = [];
      const today = new Date();
      
      // Find step goals
      const dailyStepGoal = activeGoals.find(g => 
        g.type === GoalType.STEP_COUNT && g.timeFrame === GoalTimeFrame.DAILY
      );
      
      if (dailyStepGoal) {
        const currentSteps = dailyStepGoal.current;
        const targetSteps = dailyStepGoal.target;
        
        // If less than 50% of goal completed and it's afternoon
        if (currentSteps < targetSteps * 0.5 && today.getHours() >= 12) {
          recommendations.push({
            id: uuidv4(),
            userId,
            title: 'You\'re behind on steps today',
            description: `You've taken ${currentSteps.toLocaleString()} steps out of your goal of ${targetSteps.toLocaleString()}. Take a 15-minute walk to catch up!`,
            type: 'exercise',
            priority: 'high',
            createdAt: today.toISOString(),
            completed: false,
            weatherDependent: true,
            idealWeatherCondition: 'sunny'
          });
        }
        
        // If close to goal, give encouragement
        if (currentSteps >= targetSteps * 0.8 && currentSteps < targetSteps) {
          const remainingSteps = targetSteps - currentSteps;
          
          recommendations.push({
            id: uuidv4(),
            userId,
            title: 'Almost there!',
            description: `Only ${remainingSteps.toLocaleString()} more steps to reach your daily goal. A quick 5-minute walk should do it!`,
            type: 'exercise',
            priority: 'medium',
            createdAt: today.toISOString(),
            completed: false
          });
        }
      }
      
      // Check for trends and patterns
      if (analytics.length >= 3) {
        const recentSteps = analytics.slice(0, 3).map(a => a.stepCount);
        const avgSteps = recentSteps.reduce((sum, val) => sum + val, 0) / recentSteps.length;
        
        // If step count has been decreasing
        if (recentSteps[0] < recentSteps[1] && recentSteps[1] < recentSteps[2]) {
          recommendations.push({
            id: uuidv4(),
            userId,
            title: 'Step count decreasing',
            description: 'Your daily steps have been decreasing. Try to incorporate more walking into your routine.',
            type: 'exercise',
            priority: 'medium',
            createdAt: today.toISOString(),
            completed: false
          });
        }
      }
      
      return recommendations;
    }
    
    /**
     * Generate nutrition recommendations
     */
    private generateNutritionRecommendations(
      userId: string,
      activeGoals: any[],
      analytics: UserAnalytics[],
      userProfile: any
    ): FitnessRecommendation[] {
      const recommendations: FitnessRecommendation[] = [];
      const today = new Date();
      
      // Find calorie intake goal
      const dailyCalorieGoal = activeGoals.find(g => 
        g.type === GoalType.CALORIE_INTAKE && g.timeFrame === GoalTimeFrame.DAILY
      );
      
      if (dailyCalorieGoal) {
        const currentCalories = dailyCalorieGoal.current;
        const targetCalories = dailyCalorieGoal.target;
        
        // If exceeding calorie goal
        if (currentCalories > targetCalories) {
          recommendations.push({
            id: uuidv4(),
            userId,
            title: 'Calorie alert',
            description: `You've consumed ${currentCalories.toLocaleString()} calories, which is above your daily target of ${targetCalories.toLocaleString()}. Try to have a lighter dinner.`,
            type: 'nutrition',
            priority: 'high',
            createdAt: today.toISOString(),
            completed: false
          });
        }
        
        // If well below calorie goal and it's evening
        if (currentCalories < targetCalories * 0.5 && today.getHours() >= 17) {
          recommendations.push({
            id: uuidv4(),
            userId,
            title: 'Nutrition check',
            description: `You've only consumed ${currentCalories.toLocaleString()} calories today. Make sure you're eating enough to fuel your activities.`,
            type: 'nutrition',
            priority: 'medium',
            createdAt: today.toISOString(),
            completed: false
          });
        }
      }
      
      // Weight loss specific recommendations
      if (userProfile?.fitnessGoal === 'weightLoss') {
        // If consistently staying under calorie goal
        const calorieDeficit = analytics
          .filter(a => a.calorieDifference > 0)
          .length;
          
        if (calorieDeficit >= 5 && analytics.length >= 5) {
          recommendations.push({
            id: uuidv4(),
            userId,
            title: 'Great work!',
            description: 'You\'ve maintained a calorie deficit for 5 days. Keep up the good work!',
            type: 'nutrition',
            priority: 'low',
            createdAt: today.toISOString(),
            completed: false
          });
        }
      }
      
      return recommendations;
    }
    
    /**
     * Generate activity recommendations based on weather and time of day
     */
    private generateActivityRecommendations(
      userId: string,
      activeGoals: any[],
      weather: WeatherContext
    ): FitnessRecommendation[] {
      const recommendations: FitnessRecommendation[] = [];
      const today = new Date();
      const hour = today.getHours();
      
      // Morning recommendations (6am-10am)
      if (hour >= 6 && hour <= 10) {
        if (weather.isOutdoorFriendly) {
          recommendations.push({
            id: uuidv4(),
            userId,
            title: 'Morning boost',
            description: 'It\'s a beautiful morning! Start your day with a brisk 10-minute walk to boost your energy.',
            type: 'exercise',
            priority: 'medium',
            createdAt: today.toISOString(),
            completed: false,
            weatherDependent: true,
            idealWeatherCondition: weather.condition,
            timeOfDayDependent: true,
            idealTimeOfDay: 'morning'
          });
        } else {
          recommendations.push({
            id: uuidv4(),
            userId,
            title: 'Indoor morning routine',
            description: 'Start your day with a 5-minute indoor stretching routine to wake up your body.',
            type: 'exercise',
            priority: 'medium',
            createdAt: today.toISOString(),
            completed: false,
            timeOfDayDependent: true,
            idealTimeOfDay: 'morning'
          });
        }
      }
      
      // Afternoon recommendations (12pm-5pm)
      if (hour >= 12 && hour <= 17) {
        if (weather.isOutdoorFriendly && weather.temperature < 28) {
          recommendations.push({
            id: uuidv4(),
            userId,
            title: 'Afternoon break',
            description: 'Take a break from your activities with a 15-minute walk outside to refresh your mind.',
            type: 'exercise',
            priority: 'medium',
            createdAt: today.toISOString(),
            completed: false,
            weatherDependent: true,
            idealWeatherCondition: weather.condition,
            timeOfDayDependent: true,
            idealTimeOfDay: 'afternoon'
          });
        } else {
          recommendations.push({
            id: uuidv4(),
            userId,
            title: 'Desk stretches',
            description: 'Take a 5-minute break to do some simple desk stretches and reduce stiffness.',
            type: 'exercise',
            priority: 'low',
            createdAt: today.toISOString(),
            completed: false,
            timeOfDayDependent: true,
            idealTimeOfDay: 'afternoon'
          });
        }
      }
      
      // Evening recommendations (6pm-9pm)
      if (hour >= 18 && hour <= 21) {
        if (weather.isOutdoorFriendly) {
          recommendations.push({
            id: uuidv4(),
            userId,
            title: 'Evening stroll',
            description: 'Enjoy the evening with a relaxing 20-minute walk to wind down your day.',
            type: 'exercise',
            priority: 'medium',
            createdAt: today.toISOString(),
            completed: false,
            weatherDependent: true,
            idealWeatherCondition: weather.condition,
            timeOfDayDependent: true,
            idealTimeOfDay: 'evening'
          });
        } else {
          recommendations.push({
            id: uuidv4(),
            userId,
            title: 'Evening relaxation',
            description: 'Try a 10-minute gentle yoga routine to relax your body before bed.',
            type: 'recovery',
            priority: 'low',
            createdAt: today.toISOString(),
            completed: false,
            timeOfDayDependent: true,
            idealTimeOfDay: 'evening'
          });
        }
      }
      
      return recommendations;
    }
    
    /**
     * Generate recovery recommendations
     */
    private generateRecoveryRecommendations(
      userId: string,
      analytics: UserAnalytics[]
    ): FitnessRecommendation[] {
      const recommendations: FitnessRecommendation[] = [];
      const today = new Date();
      
      // If the user has been very active recently
      if (analytics.length >= 3) {
        const recentSteps = analytics.slice(0, 3).map(a => a.stepCount);
        const avgSteps = recentSteps.reduce((sum, val) => sum + val, 0) / recentSteps.length;
        
        // If they've been consistently active (>10K steps)
        if (avgSteps > 10000) {
          recommendations.push({
            id: uuidv4(),
            userId,
            title: 'Recovery day',
            description: 'You\'ve been very active lately. Consider taking a recovery day with gentle stretching and adequate hydration.',
            type: 'recovery',
            priority: 'medium',
            createdAt: today.toISOString(),
            completed: false
          });
        }
      }
      
      // Weekend recovery recommendation (Saturday and Sunday)
      if (today.getDay() === 0 || today.getDay() === 6) {
        recommendations.push({
          id: uuidv4(),
          userId,
          title: 'Weekend recovery',
          description: 'Take some time this weekend for recovery activities like gentle stretching, adequate hydration, and quality sleep.',
          type: 'recovery',
          priority: 'low',
          createdAt: today.toISOString(),
          completed: false
        });
      }
      
      return recommendations;
    }
    
    /**
     * Save recommendations to Firestore
     */
    private async saveRecommendations(recommendations: FitnessRecommendation[]): Promise<void> {
      try {
        // First, remove old uncompleted recommendations
        await this.cleanupOldRecommendations();
        
        // Then save new recommendations
        const batch = [];
        
        for (const recommendation of recommendations) {
          batch.push(addDoc(collection(db, 'recommendations'), {
            ...recommendation,
            createdAt: serverTimestamp()
          }));
        }
        
        await Promise.all(batch);
      } catch (error) {
        console.error('Error saving recommendations:', error);
      }
    }
    
    /**
     * Clean up old recommendations
     */
    private async cleanupOldRecommendations(): Promise<void> {
      try {
        const user = auth.currentUser;
        if (!user) return;
        
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        
        const recommendationsRef = collection(db, 'recommendations');
        const oldRecommendationsQuery = query(
          recommendationsRef,
          where('userId', '==', user.uid),
          where('completed', '==', false),
          where('createdAt', '<', twoDaysAgo)
        );
        
        const querySnapshot = await getDocs(oldRecommendationsQuery);
        
        const deletePromises = querySnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        
        await Promise.all(deletePromises);
      } catch (error) {
        console.error('Error cleaning up recommendations:', error);
      }
    }
    
    // Add method to update recommendation with weather information
    async updateRecommendationsWithWeather(weather: WeatherContext): Promise<void> {
      this.setWeatherContext(weather);
      
      // In a real app, you would update existing recommendations based on weather
      // For example, changing outdoor activities to indoor when it's raining
    }
  }
  
  export default new RecommendationsService();