import {
    FitnessGoal,
    GoalType,
    GoalTimeFrame,
    GoalStatus,
    Achievement
  } from '../models/FitnessGoalModels';
  import { formatDate } from '../utils/dateUtils';
  import { auth, db } from '../app/firebaseConfig';
  import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    query,
    where,
    updateDoc,
    orderBy,
    serverTimestamp,
    Timestamp,
    limit
  } from 'firebase/firestore';
  
  class GoalsTrackingService {
    /**
     * Get active goals for the current user
     */
    async getActiveGoals(timeFrame?: GoalTimeFrame): Promise<FitnessGoal[]> {
      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error('User not logged in');
        }
  
        const today = formatDate(new Date());
        
        // Create the base query
        let goalsQuery = query(
          collection(db, 'fitnessGoals'),
          where('userId', '==', user.uid),
          where('endDate', '>=', today),
          where('status', 'in', [GoalStatus.PENDING, GoalStatus.IN_PROGRESS])
        );
        
        // Add timeFrame filter if specified
        if (timeFrame) {
          goalsQuery = query(
            goalsQuery,
            where('timeFrame', '==', timeFrame)
          );
        }
        
        // Add ordering
        goalsQuery = query(
          goalsQuery,
          orderBy('endDate', 'asc')
        );
        
        const querySnapshot = await getDocs(goalsQuery);
        const goals: FitnessGoal[] = [];
        
        querySnapshot.forEach(doc => {
          goals.push({ id: doc.id, ...doc.data() } as FitnessGoal);
        });
        
        return goals;
      } catch (error) {
        console.error('Error getting active goals:', error);
        return [];
      }
    }
    
    /**
     * Get completed goals for the current user
     */
    async getCompletedGoals(limitCount = 10): Promise<FitnessGoal[]> {
        try {
          const user = auth.currentUser;
          if (!user) {
            throw new Error('User not logged in');
          }
          
          const goalsQuery = query(
            collection(db, 'fitnessGoals'),
            where('userId', '==', user.uid),
            where('status', '==', GoalStatus.COMPLETED),
            orderBy('endDate', 'desc'),
            limit(limitCount) // Use the renamed parameter here
          );
        
        const querySnapshot = await getDocs(goalsQuery);
        const goals: FitnessGoal[] = [];
        
        querySnapshot.forEach(doc => {
          goals.push({ id: doc.id, ...doc.data() } as FitnessGoal);
        });
        
        return goals;
      } catch (error) {
        console.error('Error getting completed goals:', error);
        return [];
      }
    }
    
    /**
     * Update goal progress
     */
    async updateGoalProgress(goalId: string, progress: number): Promise<FitnessGoal | null> {
      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error('User not logged in');
        }
        
        // Get current goal
        const goalRef = doc(db, 'fitnessGoals', goalId);
        const goalDoc = await getDoc(goalRef);
        
        if (!goalDoc.exists()) {
          console.warn(`Goal with ID ${goalId} not found. Skipping update.`);
          return null;
        }
        
        // Get goal data
        const goalData = goalDoc.data() as FitnessGoal;
        
        // Verify this goal belongs to current user
        if (goalData.userId !== user.uid) {
          throw new Error('Unauthorized access to goal');
        }
        
        // Update goal progress
        const current = progress;
        const target = goalData.target;
        
        // Calculate new status
        let status = GoalStatus.IN_PROGRESS;
        if (current >= target) {
          status = GoalStatus.COMPLETED;
        }
        
        // Update goal in Firestore
        await updateDoc(goalRef, {
          current,
          status,
          updatedAt: serverTimestamp()
        });
        
        // If goal is completed, check for achievements
        if (status === GoalStatus.COMPLETED) {
          await this.checkAndUpdateAchievements(goalData);
          
          // Update streak if it's a daily goal
          if (goalData.timeFrame === GoalTimeFrame.DAILY) {
            await this.updateStreak(goalId, (goalData.streak || 0) + 1);
          }
        }
        
        // Return updated goal data
        return {
          ...goalData,
          id: goalId,
          current,
          status
        };
      } catch (error) {
        console.error('Error updating goal progress:', error);
        return null;
      }
    }
    
    /**
     * Update goal streak
     */
    private async updateStreak(goalId: string, streak: number): Promise<void> {
      try {
        const goalRef = doc(db, 'fitnessGoals', goalId);
        await updateDoc(goalRef, { streak });
      } catch (error) {
        console.error('Error updating streak:', error);
      }
    }
    
    /**
     * Synchronize goal progress from activity data
     */
    async syncGoalProgress(): Promise<void> {
      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error('User not logged in');
        }
        
        // Get active goals
        const activeGoals = await this.getActiveGoals();
        if (activeGoals.length === 0) {
          console.log('No active goals found to sync');
          return;
        }
        
        // Get today's date
        const today = formatDate(new Date());
        
        // Process each goal type
        await this.syncStepGoals(user.uid, activeGoals.filter(g => g.type === GoalType.STEP_COUNT), today);
        await this.syncCalorieGoals(user.uid, activeGoals.filter(g => g.type === GoalType.CALORIE_INTAKE), today);
        await this.syncActiveMinutesGoals(user.uid, activeGoals.filter(g => g.type === GoalType.ACTIVE_MINUTES), today);
        await this.syncDistanceGoals(user.uid, activeGoals.filter(g => g.type === GoalType.DISTANCE), today);
      } catch (error) {
        console.error('Error syncing goal progress:', error);
      }
    }
    
    /**
     * Sync step goals with actual step data
     */
    private async syncStepGoals(userId: string, goals: FitnessGoal[], today: string): Promise<void> {
      try {
        if (goals.length === 0) return;
        
        // Get step data for each time frame
        const [dailySteps, weeklySteps, monthlySteps] = await Promise.all([
          this.getStepsForTimeframe(userId, today, today),
          this.getStepsForTimeframe(userId, this.getFirstDayOfWeek(), today),
          this.getStepsForTimeframe(userId, this.getFirstDayOfMonth(), today)
        ]);
        
        // Update each goal
        for (const goal of goals) {
          try {
            let progress = 0;
            
            switch (goal.timeFrame) {
              case GoalTimeFrame.DAILY:
                progress = dailySteps;
                break;
              case GoalTimeFrame.WEEKLY:
                progress = weeklySteps;
                break;
              case GoalTimeFrame.MONTHLY:
                progress = monthlySteps;
                break;
            }
            
            // Skip update if goal doesn't exist anymore
            if (!goal.id) {
              console.warn('Goal has no ID, skipping update');
              continue;
            }
            
            // Update goal progress
            await this.updateGoalProgress(goal.id, progress);
          } catch (error) {
            console.warn(`Error updating goal ${goal.id}:`, error);
            // Continue with other goals even if one fails
            continue;
          }
        }
      } catch (error) {
        console.error('Error syncing step goals:', error);
      }
    }
    
    /**
     * Sync calorie intake goals
     */
    private async syncCalorieGoals(userId: string, goals: FitnessGoal[], today: string): Promise<void> {
      try {
        // Get calorie data for each time frame
        const [dailyCalories, weeklyCalories, monthlyCalories] = await Promise.all([
          this.getCaloriesForTimeframe(userId, today, today),
          this.getCaloriesForTimeframe(userId, this.getFirstDayOfWeek(), today),
          this.getCaloriesForTimeframe(userId, this.getFirstDayOfMonth(), today)
        ]);
        
        // Update each goal
        for (const goal of goals) {
          let progress = 0;
          
          switch (goal.timeFrame) {
            case GoalTimeFrame.DAILY:
              progress = dailyCalories;
              break;
            case GoalTimeFrame.WEEKLY:
              progress = weeklyCalories;
              break;
            case GoalTimeFrame.MONTHLY:
              progress = monthlyCalories;
              break;
          }
          
          // Calorie intake goals are special - they're successful when below target
          // But for UI purposes, we'll store actual intake
          await this.updateGoalProgress(goal.id, progress);
        }
      } catch (error) {
        console.error('Error syncing calorie goals:', error);
      }
    }
    
    /**
     * Sync active minutes goals
     */
    private async syncActiveMinutesGoals(userId: string, goals: FitnessGoal[], today: string): Promise<void> {
      try {
        // For now, estimate active minutes from steps (later could come from actual activity tracking)
        const [dailySteps, weeklySteps, monthlySteps] = await Promise.all([
          this.getStepsForTimeframe(userId, today, today),
          this.getStepsForTimeframe(userId, this.getFirstDayOfWeek(), today),
          this.getStepsForTimeframe(userId, this.getFirstDayOfMonth(), today)
        ]);
        
        // Rough estimation: 100 steps = 1 active minute
        const dailyMinutes = Math.round(dailySteps / 100);
        const weeklyMinutes = Math.round(weeklySteps / 100);
        const monthlyMinutes = Math.round(monthlySteps / 100);
        
        // Update each goal
        for (const goal of goals) {
          let progress = 0;
          
          switch (goal.timeFrame) {
            case GoalTimeFrame.DAILY:
              progress = dailyMinutes;
              break;
            case GoalTimeFrame.WEEKLY:
              progress = weeklyMinutes;
              break;
            case GoalTimeFrame.MONTHLY:
              progress = monthlyMinutes;
              break;
          }
          
          await this.updateGoalProgress(goal.id, progress);
        }
      } catch (error) {
        console.error('Error syncing active minutes goals:', error);
      }
    }
    
    /**
     * Sync distance goals
     */
    private async syncDistanceGoals(userId: string, goals: FitnessGoal[], today: string): Promise<void> {
      try {
        // For now, estimate distance from steps
        const [dailySteps, weeklySteps, monthlySteps] = await Promise.all([
          this.getStepsForTimeframe(userId, today, today),
          this.getStepsForTimeframe(userId, this.getFirstDayOfWeek(), today),
          this.getStepsForTimeframe(userId, this.getFirstDayOfMonth(), today)
        ]);
        
        // Average step length is about 0.762 meters (30 inches)
        // Convert to kilometers
        const stepToKm = 0.000762;
        const dailyDistance = dailySteps * stepToKm;
        const weeklyDistance = weeklySteps * stepToKm;
        const monthlyDistance = monthlySteps * stepToKm;
        
        // Update each goal
        for (const goal of goals) {
          let progress = 0;
          
          switch (goal.timeFrame) {
            case GoalTimeFrame.DAILY:
              progress = dailyDistance;
              break;
            case GoalTimeFrame.WEEKLY:
              progress = weeklyDistance;
              break;
            case GoalTimeFrame.MONTHLY:
              progress = monthlyDistance;
              break;
          }
          
          await this.updateGoalProgress(goal.id, progress);
        }
      } catch (error) {
        console.error('Error syncing distance goals:', error);
      }
    }
    
    /**
     * Get steps for a specific time frame
     */
    private async getStepsForTimeframe(userId: string, startDate: string, endDate: string): Promise<number> {
      try {
        const stepsRef = collection(db, 'stepHistory');
        const stepsQuery = query(
          stepsRef,
          where('userId', '==', userId),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        );
        
        const querySnapshot = await getDocs(stepsQuery);
        let totalSteps = 0;
        
        querySnapshot.forEach(doc => {
          totalSteps += doc.data().steps;
        });
        
        return totalSteps;
      } catch (error) {
        console.error('Error getting steps for timeframe:', error);
        return 0;
      }
    }
    
    /**
     * Get calories for a specific time frame
     */
    private async getCaloriesForTimeframe(userId: string, startDate: string, endDate: string): Promise<number> {
      try {
        const caloriesRef = collection(db, 'calorieIntake');
        const caloriesQuery = query(
          caloriesRef,
          where('userId', '==', userId),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        );
        
        const querySnapshot = await getDocs(caloriesQuery);
        let totalCalories = 0;
        
        querySnapshot.forEach(doc => {
          totalCalories += doc.data().calories;
        });
        
        return totalCalories;
      } catch (error) {
        console.error('Error getting calories for timeframe:', error);
        return 0;
      }
    }
    
    /**
     * Get first day of the current week (Sunday)
     */
    private getFirstDayOfWeek(): string {
      const today = new Date();
      const day = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const diff = today.getDate() - day;
      
      const firstDay = new Date(today);
      firstDay.setDate(diff);
      
      return formatDate(firstDay);
    }
    
    /**
     * Get first day of the current month
     */
    private getFirstDayOfMonth(): string {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      
      return formatDate(firstDay);
    }
    
    /**
     * Check and update achievements based on completed goals
     */
    private async checkAndUpdateAchievements(goal: FitnessGoal): Promise<void> {
      try {
        const user = auth.currentUser;
        if (!user) return;
        
        // Different achievements based on goal type
        switch (goal.type) {
          case GoalType.STEP_COUNT:
            await this.checkStepAchievements(user.uid, goal);
            break;
          case GoalType.ACTIVE_MINUTES:
            await this.checkActiveMinutesAchievements(user.uid, goal);
            break;
          case GoalType.CALORIE_INTAKE:
            await this.checkCalorieAchievements(user.uid, goal);
            break;
        }
        
        // Check streak achievements
        if (goal.streak && goal.streak >= 3) {
          await this.updateOrCreateAchievement(user.uid, {
            id: `streak-${goal.streak}`,
            userId: user.uid,
            title: `${goal.streak} Day Streak!`,
            description: `Completed the same goal for ${goal.streak} days in a row`,
            icon: 'streak',
            unlockedAt: new Date().toISOString(),
            progress: 100,
            requirement: `Complete a goal for ${goal.streak} days in a row`
          });
        }
      } catch (error) {
        console.error('Error checking achievements:', error);
      }
    }
    
    /**
     * Check step-related achievements
     */
    private async checkStepAchievements(userId: string, goal: FitnessGoal): Promise<void> {
      try {
        // Get completed step goals
        const completedGoalsQuery = query(
          collection(db, 'fitnessGoals'),
          where('userId', '==', userId),
          where('type', '==', GoalType.STEP_COUNT),
          where('status', '==', GoalStatus.COMPLETED)
        );
        
        const querySnapshot = await getDocs(completedGoalsQuery);
        const completedCount = querySnapshot.size + 1; // +1 for current goal
        
        // First step goal completed
        if (completedCount === 1) {
          await this.updateOrCreateAchievement(userId, {
            id: 'first-step-goal',
            userId,
            title: 'First Steps!',
            description: 'Completed your first step goal',
            icon: 'first-steps',
            unlockedAt: new Date().toISOString(),
            progress: 100,
            requirement: 'Complete your first step goal'
          });
        }
        
        // 5 step goals completed
        if (completedCount === 5) {
          await this.updateOrCreateAchievement(userId, {
            id: 'step-master',
            userId,
            title: 'Step Master',
            description: 'Completed 5 step goals',
            icon: 'step-master',
            unlockedAt: new Date().toISOString(),
            progress: 100,
            requirement: 'Complete 5 step goals'
          });
        }
        
        // 10K steps in a day
        if (goal.timeFrame === GoalTimeFrame.DAILY && goal.current >= 10000) {
          await this.updateOrCreateAchievement(userId, {
            id: '10k-steps',
            userId,
            title: '10K Club',
            description: 'Took 10,000 steps in a single day',
            icon: '10k-steps',
            unlockedAt: new Date().toISOString(),
            progress: 100,
            requirement: 'Take 10,000 steps in a single day'
          });
        }
      } catch (error) {
        console.error('Error checking step achievements:', error);
      }
    }
    
    /**
     * Check active minutes achievements
     */
    private async checkActiveMinutesAchievements(userId: string, goal: FitnessGoal): Promise<void> {
      try {
        // Weekly active minutes achievements
        if (goal.timeFrame === GoalTimeFrame.WEEKLY && goal.current >= 150) {
          await this.updateOrCreateAchievement(userId, {
            id: 'active-week',
            userId,
            title: 'Active Lifestyle',
            description: 'Achieved 150+ active minutes in a week',
            icon: 'active-lifestyle',
            unlockedAt: new Date().toISOString(),
            progress: 100,
            requirement: 'Achieve 150+ active minutes in a week'
          });
        }
      } catch (error) {
        console.error('Error checking active minutes achievements:', error);
      }
    }
    
    /**
     * Check calorie achievements
     */
    private async checkCalorieAchievements(userId: string, goal: FitnessGoal): Promise<void> {
      try {
        // Daily calorie goal achievement
        if (goal.timeFrame === GoalTimeFrame.DAILY && goal.current <= goal.target) {
          // Get streak of calorie goals
          const calorieGoalsQuery = query(
            collection(db, 'fitnessGoals'),
            where('userId', '==', userId),
            where('type', '==', GoalType.CALORIE_INTAKE),
            where('timeFrame', '==', GoalTimeFrame.DAILY),
            where('status', '==', GoalStatus.COMPLETED),
            orderBy('endDate', 'desc'),
            limit(7)
          );
          
          const querySnapshot = await getDocs(calorieGoalsQuery);
          const streakCount = querySnapshot.size + 1; // +1 for current goal
          
          if (streakCount >= 7) {
            await this.updateOrCreateAchievement(userId, {
              id: 'calorie-streak',
              userId,
              title: 'Nutrition Master',
              description: 'Met your calorie goal for 7 days in a row',
              icon: 'nutrition',
              unlockedAt: new Date().toISOString(),
              progress: 100,
              requirement: 'Meet your calorie goal for 7 days in a row'
            });
          }
        }
      } catch (error) {
        console.error('Error checking calorie achievements:', error);
      }
    }
    
    /**
     * Update or create an achievement
     */
    private async updateOrCreateAchievement(userId: string, achievement: Achievement): Promise<void> {
      try {
        // Check if achievement exists
        const achievementsRef = collection(db, 'achievements');
        const achievementQuery = query(
          achievementsRef,
          where('userId', '==', userId),
          where('id', '==', achievement.id)
        );
        
        const querySnapshot = await getDocs(achievementQuery);
        
        if (querySnapshot.empty) {
          // Create new achievement
          await addDoc(achievementsRef, {
            ...achievement,
            createdAt: serverTimestamp()
          });
        } else {
          // Update existing achievement
          const achievementDoc = querySnapshot.docs[0];
          
          // Only update if not already unlocked
          if (!achievementDoc.data().unlockedAt) {
            await updateDoc(doc(db, 'achievements', achievementDoc.id), {
              progress: achievement.progress,
              unlockedAt: achievement.unlockedAt,
              updatedAt: serverTimestamp()
            });
          }
        }
      } catch (error) {
        console.error('Error updating achievement:', error);
      }
    }
    
    /**
     * Get all achievements for the current user
     */
    async getAchievements(): Promise<Achievement[]> {
      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error('User not logged in');
        }
        
        const achievementsRef = collection(db, 'achievements');
        const achievementsQuery = query(
          achievementsRef,
          where('userId', '==', user.uid),
          orderBy('unlockedAt', 'desc')
        );
        
        const querySnapshot = await getDocs(achievementsQuery);
        const achievements: Achievement[] = [];
        
        querySnapshot.forEach(doc => {
          achievements.push({ id: doc.id, ...doc.data() } as Achievement);
        });
        
        return achievements;
      } catch (error) {
        console.error('Error getting achievements:', error);
        return [];
      }
    }
  }
  
  export default new GoalsTrackingService();