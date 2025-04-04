// Fitness Goal Data Models

// Enum for goal types
export enum GoalType {
    STEP_COUNT = 'step_count',
    CALORIES_BURNED = 'calories_burned',
    ACTIVE_MINUTES = 'active_minutes',
    DISTANCE = 'distance',
    CALORIE_INTAKE = 'calorie_intake',
    WEIGHT = 'weight',
  }
  
  // Enum for goal time frames
  export enum GoalTimeFrame {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
  }
  
  // Enum for goal status
  export enum GoalStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    FAILED = 'failed',
  }
  
  // Interface for a fitness goal
  export interface FitnessGoal {
    id: string;
    userId: string;
    type: GoalType;
    timeFrame: GoalTimeFrame;
    target: number;
    current: number;
    status: GoalStatus;
    startDate: string; // ISO date string
    endDate: string;   // ISO date string
    description: string;
    createdAt: string;
    updatedAt: string;
    streak?: number;
    previousTarget?: number; // For tracking progress over time
  }
  
  // Interface for analytics data
  export interface UserAnalytics {
    userId: string;
    date: string;
    caloriesBurned: number;
    caloriesConsumed: number;
    calorieDifference: number; // Burned - Consumed
    stepCount: number;
    activeMinutes: number;
    distance: number; // in kilometers
    sleepHours?: number;
    stressLevel?: number; // 1-10 scale
    energyLevel?: number; // 1-10 scale
    weight?: number;
  }
  
  // Interface for recommendations
  export interface FitnessRecommendation {
    id: string;
    userId: string;
    title: string;
    description: string;
    type: 'exercise' | 'nutrition' | 'recovery' | 'general';
    priority: 'low' | 'medium' | 'high';
    createdAt: string;
    expiresAt?: string;
    completed: boolean;
    weatherDependent?: boolean;
    timeOfDayDependent?: boolean;
    idealTimeOfDay?: string; // e.g., "morning", "afternoon", "evening"
    idealWeatherCondition?: string;
  }
  
  // Interface for achievements
  export interface Achievement {
    id: string;
    userId: string;
    title: string;
    description: string;
    icon: string; // Path to icon image
    unlockedAt: string | null; // Date unlocked, null if locked
    progress: number; // 0-100 percentage
    requirement: string; // Description of what's needed to unlock
  }
  
  // Weather Context
  export interface WeatherContext {
    condition: string; // e.g., "sunny", "rainy", "cloudy"
    temperature: number; // in Celsius
    humidity: number;
    windSpeed: number;
    isOutdoorFriendly: boolean;
  }