import 'react-native-get-random-values';
import {
  FitnessGoal,
  GoalType,
  GoalTimeFrame,
  GoalStatus,
  UserAnalytics
} from '../models/FitnessGoalModels';
import { formatDate } from '../utils/dateUtils';
import { auth, db } from '../app/firebaseConfig';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

// Constants for goal generation
const DEFAULT_DAILY_STEP_GOAL = 8000;
const DEFAULT_DAILY_ACTIVE_MINUTES = 30;
const DEFAULT_WEEKLY_ACTIVE_MINUTES = 150;
const CALORIE_DEFICIT_FOR_WEIGHT_LOSS = 500; // Daily calorie deficit for weight loss
const STEPS_PER_CALORIE = 20; // Rough estimate: 20 steps burn 1 calorie

class GoalsGenerationService {
  /**
   * Generate daily, weekly, and monthly goals based on user analytics
   */
  async generateGoalsForUser(userId: string): Promise<FitnessGoal[]> {
    try {
      // Get user profile and recent analytics
      const analytics = await this.getUserAnalytics(userId);
      const userProfile = await this.getUserProfile(userId);

      const goals: FitnessGoal[] = [];

      // Generate daily goals
      goals.push(...await this.generateDailyGoals(userId, analytics, userProfile));

      // Generate weekly goals
      goals.push(...await this.generateWeeklyGoals(userId, analytics, userProfile));

      // Generate monthly goals
      goals.push(...await this.generateMonthlyGoals(userId, analytics, userProfile));

      // Save goals to Firestore
      await this.saveGoalsToFirestore(goals);

      return goals;
    } catch (error) {
      console.error('Error generating goals:', error);
      throw error;
    }
  }

  /**
   * Generate daily goals based on user data
   */
  private async generateDailyGoals(
    userId: string,
    analytics: UserAnalytics[],
    userProfile: any
  ): Promise<FitnessGoal[]> {
    const goals: FitnessGoal[] = [];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Calculate averages from analytics
    const avgSteps = this.calculateAverage(analytics, 'stepCount');
    const avgCaloriesBurned = this.calculateAverage(analytics, 'caloriesBurned');
    const avgCaloriesConsumed = this.calculateAverage(analytics, 'caloriesConsumed');

    // Get current goals to check progress
    const currentGoals = await this.getCurrentGoals(userId, GoalTimeFrame.DAILY);

    // Generate step count goal
    const currentStepGoal = currentGoals.find(g => g.type === GoalType.STEP_COUNT);
    let stepTarget = DEFAULT_DAILY_STEP_GOAL;

    if (avgSteps > 0) {
      // If user has history, base goal on their average with a slight increase
      stepTarget = Math.round(avgSteps * 1.05); // 5% increase
    }

    // If they've been completing goals, make it more challenging
    if (currentStepGoal && currentStepGoal.status === GoalStatus.COMPLETED) {
      stepTarget = Math.round(currentStepGoal.target * 1.1); // 10% increase
    }

    // Cap daily step goal at reasonable maximum
    stepTarget = Math.min(stepTarget, 15000);

    // Create step goal - Fix: Use null instead of undefined
    goals.push({
      id: uuidv4(),
      userId,
      type: GoalType.STEP_COUNT,
      timeFrame: GoalTimeFrame.DAILY,
      target: stepTarget,
      current: 0,
      status: GoalStatus.PENDING,
      startDate: formatDate(today),
      endDate: formatDate(tomorrow),
      description: `Take ${stepTarget.toLocaleString()} steps today`,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      streak: currentStepGoal?.streak || 0,
      previousTarget: currentStepGoal?.target || null // Fix: Use null as fallback
    });

    // Generate calorie goal based on user profile and analytics
    const fitnessGoal = userProfile?.fitnessGoal || 'maintenance';
    let calorieIntakeTarget = userProfile?.dailyCalorieGoal || 2000;

    // If goal is weight loss, ensure deficit
    if (fitnessGoal === 'weightLoss' && avgCaloriesBurned > 0) {
      // Target should be less than what they burn
      calorieIntakeTarget = Math.max(1200, avgCaloriesBurned - CALORIE_DEFICIT_FOR_WEIGHT_LOSS);
    }

    // Create calorie intake goal
    goals.push({
      id: uuidv4(),
      userId,
      type: GoalType.CALORIE_INTAKE,
      timeFrame: GoalTimeFrame.DAILY,
      target: calorieIntakeTarget,
      current: 0,
      status: GoalStatus.PENDING,
      startDate: formatDate(today),
      endDate: formatDate(tomorrow),
      description: `Consume no more than ${calorieIntakeTarget.toLocaleString()} calories today`,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      streak: 0, // Fix: Provide a default value
      previousTarget: null // Fix: Provide a default value
    });

    // Generate active minutes goal
    const activeMinutesTarget =
      userProfile?.fitnessGoal === 'weightLoss'
        ? DEFAULT_DAILY_ACTIVE_MINUTES * 1.5 // More activity for weight loss
        : DEFAULT_DAILY_ACTIVE_MINUTES;

    goals.push({
      id: uuidv4(),
      userId,
      type: GoalType.ACTIVE_MINUTES,
      timeFrame: GoalTimeFrame.DAILY,
      target: Math.round(activeMinutesTarget),
      current: 0,
      status: GoalStatus.PENDING,
      startDate: formatDate(today),
      endDate: formatDate(tomorrow),
      description: `Be active for ${Math.round(activeMinutesTarget)} minutes today`,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      streak: 0, // Fix: Provide a default value
      previousTarget: null // Fix: Provide a default value
    });

    return goals;
  }

  /**
   * Generate weekly goals based on user data
   */
  private async generateWeeklyGoals(
    userId: string,
    analytics: UserAnalytics[],
    userProfile: any
  ): Promise<FitnessGoal[]> {
    const goals: FitnessGoal[] = [];
    const today = new Date();

    // Calculate end of week (next Sunday)
    const endOfWeek = new Date(today);
    const daysUntilSunday = 7 - endOfWeek.getDay();
    endOfWeek.setDate(endOfWeek.getDate() + (daysUntilSunday || 7));

    // Calculate weekly step target (7 days * daily target with slight reduction)
    const dailyGoals = await this.getCurrentGoals(userId, GoalTimeFrame.DAILY);
    const dailyStepGoal = dailyGoals.find(g => g.type === GoalType.STEP_COUNT);

    const weeklyStepTarget = dailyStepGoal
      ? dailyStepGoal.target * 7 * 0.9 // 7 days with 10% buffer
      : DEFAULT_DAILY_STEP_GOAL * 7 * 0.9;

    // Create weekly step goal
    goals.push({
      id: uuidv4(),
      userId,
      type: GoalType.STEP_COUNT,
      timeFrame: GoalTimeFrame.WEEKLY,
      target: Math.round(weeklyStepTarget),
      current: 0,
      status: GoalStatus.PENDING,
      startDate: formatDate(today),
      endDate: formatDate(endOfWeek),
      description: `Take ${Math.round(weeklyStepTarget).toLocaleString()} steps this week`,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      streak: 0, // Fix: Provide a default value
      previousTarget: null // Fix: Provide a default value
    });

    // Weekly active minutes goal (based on CDC recommendation of 150 minutes moderate activity)
    let weeklyActiveMinutesTarget = DEFAULT_WEEKLY_ACTIVE_MINUTES;

    // If goal is weight loss, increase target
    if (userProfile?.fitnessGoal === 'weightLoss') {
      weeklyActiveMinutesTarget = DEFAULT_WEEKLY_ACTIVE_MINUTES * 1.3; // 30% more
    }

    goals.push({
      id: uuidv4(),
      userId,
      type: GoalType.ACTIVE_MINUTES,
      timeFrame: GoalTimeFrame.WEEKLY,
      target: Math.round(weeklyActiveMinutesTarget),
      current: 0,
      status: GoalStatus.PENDING,
      startDate: formatDate(today),
      endDate: formatDate(endOfWeek),
      description: `Be active for ${Math.round(weeklyActiveMinutesTarget)} minutes this week`,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      streak: 0, // Fix: Provide a default value
      previousTarget: null // Fix: Provide a default value
    });

    return goals;
  }

  /**
   * Generate monthly goals based on user data
   */
  private async generateMonthlyGoals(
    userId: string,
    analytics: UserAnalytics[],
    userProfile: any
  ): Promise<FitnessGoal[]> {
    const goals: FitnessGoal[] = [];
    const today = new Date();

    // Calculate end of month
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const daysInMonth = endOfMonth.getDate();
    const remainingDays = endOfMonth.getDate() - today.getDate() + 1;

    // Calculate daily averages
    const avgSteps = this.calculateAverage(analytics, 'stepCount');

    // Monthly step goal
    const monthlyStepTarget = Math.round(avgSteps > 0
      ? avgSteps * remainingDays * 1.05 // Slight increase
      : DEFAULT_DAILY_STEP_GOAL * remainingDays * 0.9); // Default with buffer

    goals.push({
      id: uuidv4(),
      userId,
      type: GoalType.STEP_COUNT,
      timeFrame: GoalTimeFrame.MONTHLY,
      target: monthlyStepTarget,
      current: 0,
      status: GoalStatus.PENDING,
      startDate: formatDate(today),
      endDate: formatDate(endOfMonth),
      description: `Take ${monthlyStepTarget.toLocaleString()} steps by the end of the month`,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      streak: 0, // Fix: Provide a default value
      previousTarget: null // Fix: Provide a default value
    });

    // Calculate distance goal (rough estimate based on step goal)
    const avgStepLength = 0.762; // average step length in meters (30 inches)
    const stepsPerKm = 1000 / avgStepLength;
    const monthlyDistanceTarget = Math.round(monthlyStepTarget / stepsPerKm * 100) / 100;

    goals.push({
      id: uuidv4(),
      userId,
      type: GoalType.DISTANCE,
      timeFrame: GoalTimeFrame.MONTHLY,
      target: monthlyDistanceTarget,
      current: 0,
      status: GoalStatus.PENDING,
      startDate: formatDate(today),
      endDate: formatDate(endOfMonth),
      description: `Walk ${monthlyDistanceTarget.toFixed(1)} kilometers by the end of the month`,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      streak: 0, // Fix: Provide a default value
      previousTarget: null // Fix: Provide a default value
    });

    // Weight-based goal if user has set a weight loss goal
    if (userProfile?.fitnessGoal === 'weightLoss' && userProfile?.weight) {
      // Healthy weight loss is 0.5-1kg per week
      const weightLossTarget = Math.min(remainingDays * 0.1, 2); // Max 2kg per month

      goals.push({
        id: uuidv4(),
        userId,
        type: GoalType.WEIGHT,
        timeFrame: GoalTimeFrame.MONTHLY,
        target: userProfile.weight - weightLossTarget,
        current: userProfile.weight,
        status: GoalStatus.PENDING,
        startDate: formatDate(today),
        endDate: formatDate(endOfMonth),
        description: `Reach a weight of ${(userProfile.weight - weightLossTarget).toFixed(1)} kg by the end of the month`,
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
        streak: 0, // Fix: Provide a default value
        previousTarget: null // Fix: Provide a default value
      });
    }

    return goals;
  }

  /**
   * Save goals to Firestore
   */
  private async saveGoalsToFirestore(goals: FitnessGoal[]): Promise<void> {
    try {
      const batch = [];
  
      for (const goal of goals) {
        // Remove any undefined values to avoid Firestore errors
        const cleanGoal = this.removeUndefinedValues(goal);
  
        // IMPORTANT FIX: Use setDoc with the goal's existing UUID instead of addDoc
        // This ensures the goal ID in Firestore matches the ID used in our code
        const goalRef = doc(db, 'fitnessGoals', goal.id);
        
        console.log(`Saving goal with ID ${goal.id} to Firestore`);
        
        batch.push(setDoc(goalRef, {
          ...cleanGoal,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }));
      }
  
      await Promise.all(batch);
      console.log(`Successfully saved ${goals.length} goals to Firestore`);
    } catch (error) {
      console.error('Error saving goals to Firestore:', error);
      throw error;
    }
  }

  /**
   * Helper to remove undefined values from an object
   */
  private removeUndefinedValues(obj: any): any {
    const cleanObj: any = {};

    // Only copy defined values
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        cleanObj[key] = obj[key];
      }
    });

    return cleanObj;
  }

  /**
   * Get user's recent analytics
   */
  private async getUserAnalytics(userId: string): Promise<UserAnalytics[]> {
    try {
      // Calculate date 30 days ago for analytics query
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = formatDate(thirtyDaysAgo);

      // Get step history
      const stepHistoryRef = collection(db, 'stepHistory');
      const stepQuery = query(
        stepHistoryRef,
        where('userId', '==', userId),
        where('date', '>=', thirtyDaysAgoStr),
        orderBy('date', 'desc')
      );

      const stepQuerySnapshot = await getDocs(stepQuery);
      const stepData: { [key: string]: number } = {};

      stepQuerySnapshot.forEach(doc => {
        const data = doc.data();
        if (!stepData[data.date]) stepData[data.date] = 0;
        stepData[data.date] += data.steps;
      });

      // Get calorie intake
      const calorieIntakeRef = collection(db, 'calorieIntake');
      const calorieQuery = query(
        calorieIntakeRef,
        where('userId', '==', userId),
        where('date', '>=', thirtyDaysAgoStr),
        orderBy('date', 'desc')
      );

      const calorieQuerySnapshot = await getDocs(calorieQuery);
      const calorieData: { [key: string]: number } = {};

      calorieQuerySnapshot.forEach(doc => {
        const data = doc.data();
        if (!calorieData[data.date]) calorieData[data.date] = 0;
        calorieData[data.date] += data.calories;
      });

      // Combine the data
      const analytics: UserAnalytics[] = [];

      // Get all unique dates
      const allDates = new Set([
        ...Object.keys(stepData),
        ...Object.keys(calorieData)
      ]);

      allDates.forEach(date => {
        const steps = stepData[date] || 0;

        // Estimate calories burned from steps (very rough estimate)
        const caloriesBurned = steps / STEPS_PER_CALORIE;
        const caloriesConsumed = calorieData[date] || 0;

        analytics.push({
          userId,
          date,
          caloriesBurned,
          caloriesConsumed,
          calorieDifference: caloriesBurned - caloriesConsumed,
          stepCount: steps,
          activeMinutes: Math.round(steps / 100), // Rough estimate: 100 steps = 1 active minute
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
   * Get user profile from Firestore
   */
  private async getUserProfile(userId: string): Promise<any> {
    try {
      const userProfileRef = doc(db, 'users', userId);
      const userProfileDoc = await getDocs(collection(db, 'users'));

      if (!userProfileDoc) {
        return null;
      }

      let userProfile = null;
      userProfileDoc.forEach(doc => {
        if (doc.id === userId) {
          userProfile = doc.data();
        }
      });

      return userProfile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Get current goals from Firestore
   */
  private async getCurrentGoals(
    userId: string,
    timeFrame: GoalTimeFrame
  ): Promise<FitnessGoal[]> {
    try {
      const today = formatDate(new Date());

      const goalsRef = collection(db, 'fitnessGoals');
      const goalsQuery = query(
        goalsRef,
        where('userId', '==', userId),
        where('timeFrame', '==', timeFrame),
        where('endDate', '>=', today),
        orderBy('endDate', 'asc')
      );

      const goalsQuerySnapshot = await getDocs(goalsQuery);
      const goals: FitnessGoal[] = [];

      goalsQuerySnapshot.forEach(doc => {
        goals.push({ id: doc.id, ...doc.data() } as FitnessGoal);
      });

      return goals;
    } catch (error) {
      console.error('Error getting current goals:', error);
      return [];
    }
  }

  /**
   * Calculate average value from analytics array
   */
  private calculateAverage(analytics: UserAnalytics[], field: keyof UserAnalytics): number {
    if (analytics.length === 0) return 0;

    let sum = 0;
    let count = 0;

    analytics.forEach(item => {
      const value = item[field];
      if (typeof value === 'number') {
        sum += value;
        count++;
      }
    });

    return count > 0 ? sum / count : 0;
  }
}

export default new GoalsGenerationService();