import { FitnessGoal, GoalTimeFrame, GoalType } from '../models/FitnessGoalModels';

// Types for the AI Coach service
export interface CoachMessage {
  id: string;
  text: string;
  sender: 'user' | 'coach';
  timestamp: Date;
  attachment?: MessageAttachment;
}

export interface MessageAttachment {
  type: 'exercise' | 'chart' | 'tip' | 'weeklyProgram';
  data: any;
}

export interface ExerciseData {
  title: string;
  exercises: Exercise[];
}

export interface Exercise {
  name: string;
  reps?: string;
  duration?: string;
  intensity?: string;
  description?: string;
  gifUrl?: string;
}

// Interface for Weekly Programs
export interface WeeklyProgramData {
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  focusArea: string;
  days: ProgramDay[];
}

export interface ProgramDay {
  day: string;
  title: string;
  workoutType: string;
  exercises: Exercise[];
  isRestDay?: boolean;
}

export interface CoachResponse {
  message: string;
  attachment?: MessageAttachment;
}

// For more realistic local AI, we define some patterns to match against
interface IntentPattern {
  pattern: RegExp;
  handler: (userMessage: string, userData: any) => CoachResponse;
}

class AICoachService {
  private patterns: IntentPattern[];
  
  constructor() {
    // Initialize intent patterns
    this.patterns = [
      {
        // Weekly workout programs pattern
        pattern: /program|plan|weekly|schedule|routine for (a )?week/i,
        handler: this.handleProgramRequest.bind(this) // Important: bind 'this' context
      },
      {
        pattern: /workout|exercise|training|routine/i,
        handler: this.handleWorkoutRequest.bind(this)
      },
      {
        pattern: /diet|food|eat|nutrition|meal|calorie/i,
        handler: this.handleNutritionRequest.bind(this)
      },
      {
        pattern: /progress|goal|improve|achievement/i,
        handler: this.handleProgressRequest.bind(this)
      },
      {
        pattern: /sleep|rest|recovery|tired/i,
        handler: this.handleSleepRequest.bind(this)
      },
      {
        pattern: /cardio|run|jog|walk|running/i,
        handler: this.handleCardioRequest.bind(this)
      },
      {
        pattern: /stretch|mobility|flexibility/i,
        handler: this.handleStretchingRequest.bind(this)
      },
      {
        pattern: /weight|fat|lose|burn/i,
        handler: this.handleWeightLossRequest.bind(this)
      },
      {
        pattern: /muscle|strength|strong|build/i,
        handler: this.handleStrengthRequest.bind(this)
      },
      {
        pattern: /water|hydration|drink|fluid/i,
        handler: this.handleHydrationRequest.bind(this)
      },
      {
        pattern: /hello|hi|hey|greetings/i,
        handler: this.handleGreeting.bind(this)
      }
    ];
  }
  
  /**
   * Process a user message and generate a coach response
   */
  processMessage(userMessage: string, userData: any): Promise<CoachResponse> {
    return new Promise((resolve) => {
      // Simulate processing delay for realism
      setTimeout(() => {
        // Try to match an intent
        for (const pattern of this.patterns) {
          if (pattern.pattern.test(userMessage)) {
            return resolve(pattern.handler(userMessage, userData));
          }
        }
        
        // No specific pattern matched, provide general response
        resolve(this.generateGenericResponse(userMessage, userData));
      }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
    });
  }
  
  /**
   * Generate generic fallback response
   */
  private generateGenericResponse(userMessage: string, userData: any): CoachResponse {
    const responses = [
      `I'd be happy to help you with that. Could you provide more details about what you're looking for in terms of ${userData?.fitnessGoal || 'fitness'}?`,
      "I understand. To give you the best advice, could you clarify what specific aspect of fitness you're interested in?",
      "Thanks for sharing! As your coach, I want to make sure I understand exactly what you need. Could you tell me more?",
      `Based on your ${userData?.fitnessGoal || 'fitness'} goals, I have several suggestions. Would you like to focus on workouts, nutrition, or progress tracking?`
    ];
    
    return {
      message: responses[Math.floor(Math.random() * responses.length)]
    };
  }

  /**
   * Handle weekly program creation requests with improved personalization
   */
  private handleProgramRequest(userMessage: string, userData: any): CoachResponse {
    // Default values in case user data is incomplete
    let fitnessLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
    let focusArea = 'general fitness';
    let userPreference = '';
    
    // 1. DETERMINE FITNESS LEVEL - Use multiple data points for better accuracy
    
    // Use steps data as a primary indicator
    const dailySteps = userData?.todaySteps || 0;
    if (dailySteps > 10000) {
      fitnessLevel = 'advanced';
    } else if (dailySteps > 5000) {
      fitnessLevel = 'intermediate';
    }
    
    // Refine with historical workout data if available
    if (userData?.workoutHistory) {
      const workoutsPerWeek = userData.workoutHistory.length / 4; // Assuming 4 weeks of data
      if (workoutsPerWeek > 4) {
        fitnessLevel = 'advanced';
      } else if (workoutsPerWeek > 2) {
        fitnessLevel = 'intermediate';
      }
    }
    
    // Account for user's self-reported fitness level if available
    if (userData?.fitnessLevel) {
      // Give weight to user's self assessment, but don't rely solely on it
      const selfReportedLevel = userData.fitnessLevel.toLowerCase();
      if (selfReportedLevel.includes('beginner')) {
        // If user says beginner, trust them regardless of other indicators
        fitnessLevel = 'beginner';
      } else if (selfReportedLevel.includes('advanced') || selfReportedLevel.includes('expert')) {
        // If user reports advanced AND other metrics support at least intermediate
        if (fitnessLevel !== 'beginner') {
          fitnessLevel = 'advanced';
        }
      }
    }
    
    // 2. DETERMINE FOCUS AREA - Based on user goals and message content
    
    // Get from user goals if available
    const fitnessGoal = userData?.fitnessGoal || 'general';
    
    if (fitnessGoal === 'weightLoss' || /weight|loss|burn|fat/i.test(userMessage)) {
      focusArea = 'weight loss';
    } else if (fitnessGoal === 'muscleGain' || /muscle|strength|build/i.test(userMessage)) {
      focusArea = 'muscle building';
    } else if (/cardio|endurance/i.test(userMessage)) {
      focusArea = 'cardio endurance';
    } else if (/flexibility|mobility/i.test(userMessage)) {
      focusArea = 'flexibility';
    }
    
    // 3. DETERMINE USER PREFERENCES - Look for specific requests in the message
    
    // Check if user wants home or gym workouts
    if (/home|bodyweight/i.test(userMessage)) {
      userPreference = 'home';
    } else if (/gym|equipment|weights/i.test(userMessage)) {
      userPreference = 'gym';
    }
    
    // Check for time constraints
    let timeConstraint = 0;
    const timeMatch = userMessage.match(/(\d+)[\s-]*(min|minute)/i);
    if (timeMatch && timeMatch[1]) {
      timeConstraint = parseInt(timeMatch[1], 10);
    }
    
    // 4. CREATE PERSONALIZED PROGRAM DESCRIPTION
    
    let personalizedDescription = `This ${fitnessLevel} level ${focusArea} program is designed specifically for you`;
    
    // Add personalization based on activity level
    if (userData?.todaySteps) {
      personalizedDescription += `, taking into account your current activity level (averaging around ${userData.todaySteps} steps per day)`;
    }
    
    // Add personalization based on preferences
    if (userPreference === 'home') {
      personalizedDescription += `. All exercises can be done at home with minimal equipment`;
    } else if (userPreference === 'gym') {
      personalizedDescription += `. This program makes use of gym equipment for optimal results`;
    }
    
    // Add personalization based on time constraints
    if (timeConstraint > 0) {
      personalizedDescription += `. Each workout is designed to be completed within ${timeConstraint} minutes`;
    }
    
    personalizedDescription += `. The program is balanced to provide effective results while preventing overtraining and injury.`;
    
    // 5. CREATE APPROPRIATE WEEKLY PROGRAM
    
    const program = this.createWeeklyProgram(
      fitnessLevel, 
      focusArea, 
      userData,
      userPreference,
      timeConstraint,
      personalizedDescription
    );
    
    // 6. CREATE COACH RESPONSE WITH PERSONALIZED MESSAGE
    
    // Craft a personalized message based on user's data and goals
    let responseMessage = `I've created a personalized ${fitnessLevel} level ${focusArea} program for you.`;
    
    // Add context about their fitness level
    if (fitnessLevel === 'beginner') {
      responseMessage += ` This program focuses on building a solid foundation while gradually increasing your fitness level.`;
    } else if (fitnessLevel === 'intermediate') {
      responseMessage += ` This program balances challenging workouts with recovery to help you continue progressing.`;
    } else {
      responseMessage += ` This program includes higher intensity workouts to continue challenging your advanced fitness level.`;
    }
    
    // Add context about the focus area
    if (focusArea === 'weight loss') {
      responseMessage += ` I've incorporated high-efficiency exercises to maximize calorie burn while preserving muscle.`;
    } else if (focusArea === 'muscle building') {
      responseMessage += ` I've structured the program to target all major muscle groups with proper rest periods for growth.`;
    } else if (focusArea === 'cardio endurance') {
      responseMessage += ` The program includes varied cardio sessions to improve both your aerobic and anaerobic capacity.`;
    }
    
    responseMessage += ` Tap on any day to see the details of that workout.`;
    
    return {
      message: responseMessage,
      attachment: {
        type: 'weeklyProgram',
        data: program
      }
    };
  }
  
  /**
   * Create a weekly workout program with enhanced personalization
   */
  private createWeeklyProgram(
    level: 'beginner' | 'intermediate' | 'advanced', 
    focusArea: string, 
    userData: any,
    userPreference: string = '',
    timeConstraint: number = 0,
    customDescription?: string
  ): WeeklyProgramData {
    const title = `${level.charAt(0).toUpperCase() + level.slice(1)} ${focusArea.charAt(0).toUpperCase() + focusArea.slice(1)} Program`;
    
    // Use provided custom description or generate default one
    let description = customDescription || `This program is designed specifically for your ${level} fitness level and ${focusArea} goals.`;
    
    // Create the weekly program structure
    const program: WeeklyProgramData = {
      title,
      description,
      level,
      focusArea,
      days: this.generateWorkoutDays(level, focusArea, userPreference, timeConstraint)
    };
    
    return program;
  }
  
  /**
   * Generate the specific workout days with preference and time constraint support
   */
  private generateWorkoutDays(
    level: 'beginner' | 'intermediate' | 'advanced', 
    focusArea: string,
    userPreference: string = '',
    timeConstraint: number = 0
  ): ProgramDay[] {
    const days: ProgramDay[] = [];
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Configure number of workout/rest days based on level
    let workoutDays = 3; // Default for beginner
    if (level === 'intermediate') workoutDays = 4;
    if (level === 'advanced') workoutDays = 5;
    
    // For 'general fitness' and 'weight loss' we'll do full body or cardio each day
    // For 'muscle building' we'll split by body parts
    let workoutTypes: string[] = [];
    
    // Define workout types based on focus area and level
    if (focusArea === 'muscle building') {
      if (level === 'beginner') {
        workoutTypes = ['Upper Body', 'Rest', 'Lower Body', 'Rest', 'Full Body', 'Rest', 'Rest'];
      } else if (level === 'intermediate') {
        workoutTypes = ['Push Day', 'Pull Day', 'Rest', 'Legs Day', 'Upper Body', 'Rest', 'Rest'];
      } else {
        workoutTypes = ['Chest & Triceps', 'Back & Biceps', 'Rest', 'Legs & Shoulders', 'Upper Body', 'Lower Body', 'Rest'];
      }
    } else if (focusArea === 'weight loss') {
      if (level === 'beginner') {
        workoutTypes = ['Cardio', 'Rest', 'Strength', 'Rest', 'Cardio', 'Rest', 'Rest'];
      } else if (level === 'intermediate') {
        workoutTypes = ['HIIT', 'Strength', 'Rest', 'Cardio', 'Circuit Training', 'Rest', 'Active Recovery'];
      } else {
        workoutTypes = ['HIIT', 'Strength', 'Cardio', 'Rest', 'Circuit Training', 'Strength & Cardio', 'Active Recovery'];
      }
    } else if (focusArea === 'cardio endurance') {
      if (level === 'beginner') {
        workoutTypes = ['Walk/Jog', 'Rest', 'Light Cardio', 'Rest', 'Walk/Jog', 'Rest', 'Rest'];
      } else if (level === 'intermediate') {
        workoutTypes = ['Tempo Run', 'Cross Train', 'Rest', 'Interval Run', 'Easy Run', 'Rest', 'Long Run'];
      } else {
        workoutTypes = ['Speed Work', 'Cross Train', 'Tempo Run', 'Rest', 'Hill Training', 'Easy Run', 'Long Run'];
      }
    } else if (focusArea === 'flexibility') {
      if (level === 'beginner') {
        workoutTypes = ['Basic Stretch', 'Rest', 'Yoga Flow', 'Rest', 'Mobility Work', 'Rest', 'Rest'];
      } else if (level === 'intermediate') {
        workoutTypes = ['Dynamic Stretch', 'Yoga Flow', 'Rest', 'Mobility Work', 'Stretch & Strengthen', 'Rest', 'Active Recovery'];
      } else {
        workoutTypes = ['Dynamic Stretch', 'Yoga Flow', 'Mobility Work', 'Rest', 'Stretch & Strengthen', 'Yoga Power', 'Active Recovery'];
      }
    } else {
      // General fitness
      if (level === 'beginner') {
        workoutTypes = ['Full Body', 'Rest', 'Cardio', 'Rest', 'Full Body', 'Rest', 'Rest'];
      } else if (level === 'intermediate') {
        workoutTypes = ['Upper Body', 'Lower Body', 'Rest', 'Cardio', 'Full Body', 'Rest', 'Active Recovery'];
      } else {
        workoutTypes = ['Push Day', 'Pull Day', 'Legs Day', 'Rest', 'HIIT', 'Full Body', 'Active Recovery'];
      }
    }
    
    // Adjust for time constraints if specified
    if (timeConstraint > 0) {
      // For very short workouts, make them more focused
      if (timeConstraint < 20) {
        // Prioritize full-body, short, intense workouts for time constraints
        for (let i = 0; i < workoutTypes.length; i++) {
          if (workoutTypes[i] !== 'Rest' && !workoutTypes[i].includes('Recovery')) {
            workoutTypes[i] = 'Quick ' + (focusArea === 'weight loss' ? 'HIIT' : 'Full Body');
          }
        }
      }
    }
    
    // Generate each day in the program
    for (let i = 0; i < 7; i++) {
      const day = daysOfWeek[i];
      const workoutType = workoutTypes[i];
      const isRestDay = workoutType.includes('Rest');
      
      days.push({
        day,
        title: isRestDay ? 'Rest Day' : `${day} - ${workoutType}`,
        workoutType,
        isRestDay,
        exercises: isRestDay ? [] : this.generateExercisesForWorkout(workoutType, level, userPreference, timeConstraint)
      });
    }
    
    return days;
  }
  
  /**
   * Generate exercises for specific workout types with preference and time constraint support
   */
  private generateExercisesForWorkout(
    workoutType: string, 
    level: 'beginner' | 'intermediate' | 'advanced',
    userPreference: string = '',
    timeConstraint: number = 0
  ): Exercise[] {
    let exercises: Exercise[] = [];
    let intensity = level === 'beginner' ? 'Low to Medium' : (level === 'intermediate' ? 'Medium' : 'Medium to High');
    
    // Sets and reps based on fitness level
    let sets = level === 'beginner' ? '2-3' : (level === 'intermediate' ? '3-4' : '4-5');
    let repsStrength = level === 'beginner' ? '10-12' : (level === 'intermediate' ? '8-10' : '6-8');
    let repsEndurance = level === 'beginner' ? '12-15' : (level === 'intermediate' ? '15-20' : '20-25');
    
    // Adjust for time constraints
    if (timeConstraint > 0 && timeConstraint < 30) {
      // For shorter workouts, reduce sets but keep intensity
      sets = level === 'beginner' ? '2' : (level === 'intermediate' ? '2-3' : '3');
      
      // If very short workout, focus on compound movements
      if (timeConstraint < 20 && workoutType.includes('Quick')) {
        return [
          { name: 'Jumping Jacks', duration: '1 minute', intensity },
          { name: 'Burpees', reps: '10', intensity },
          { name: 'Mountain Climbers', duration: '45 seconds', intensity },
          { name: 'Air Squats', reps: '15', intensity },
          { name: 'Push-ups', reps: '10-15', intensity },
          { name: 'Plank', duration: '30-45 seconds', intensity },
          { name: 'Rest', duration: '30 seconds', intensity: 'Low' },
          { name: 'Repeat 2-3 times', duration: '', intensity: '' },
        ];
      }
    }
    
    // Adjust exercises based on home/gym preference
    const isHomeWorkout = userPreference === 'home';
    
    // Generate exercises based on workout type
    switch (workoutType) {
      case 'Upper Body':
        exercises = isHomeWorkout ? [
          { name: 'Push-ups', reps: repsStrength, intensity },
          { name: 'Pull-ups (or Doorway Rows)', reps: repsStrength, intensity },
          { name: 'Shoulder Taps', reps: repsStrength, intensity },
          { name: 'Tricep Dips (using chair)', reps: repsStrength, intensity },
          { name: 'Pike Push-ups', reps: repsStrength, intensity },
        ] : [
          { name: 'Bench Press', reps: repsStrength, intensity },
          { name: 'Dumbbell Rows', reps: repsStrength, intensity },
          { name: 'Shoulder Press', reps: repsStrength, intensity },
          { name: 'Bicep Curls', reps: repsStrength, intensity },
          { name: 'Tricep Extensions', reps: repsStrength, intensity },
        ];
        break;
      
      case 'Lower Body':
        exercises = isHomeWorkout ? [
          { name: 'Bodyweight Squats', reps: repsStrength, intensity },
          { name: 'Lunges', reps: repsStrength, intensity },
          { name: 'Glute Bridges', reps: repsStrength, intensity },
          { name: 'Calf Raises', reps: repsStrength, intensity },
          { name: 'Wall Sit', duration: '30-60 seconds', intensity },
        ] : [
          { name: 'Squats', reps: repsStrength, intensity },
          { name: 'Deadlifts', reps: repsStrength, intensity },
          { name: 'Lunges', reps: repsStrength, intensity },
          { name: 'Leg Press', reps: repsStrength, intensity },
          { name: 'Calf Raises', reps: repsStrength, intensity },
        ];
        break;
      
      case 'Full Body':
        exercises = isHomeWorkout ? [
          { name: 'Bodyweight Squats', reps: repsStrength, intensity },
          { name: 'Push-ups', reps: repsStrength, intensity },
          { name: 'Plank', duration: '30-60 seconds', intensity },
          { name: 'Jumping Jacks', duration: '45 seconds', intensity },
          { name: 'Lunges', reps: repsStrength, intensity },
        ] : [
          { name: 'Squats', reps: repsStrength, intensity },
          { name: 'Push-ups', reps: repsStrength, intensity },
          { name: 'Plank', duration: '30-60 seconds', intensity },
          { name: 'Dumbbell Rows', reps: repsStrength, intensity },
          { name: 'Lunges', reps: repsStrength, intensity },
        ];
        break;
      
      case 'Push Day':
        exercises = isHomeWorkout ? [
          { name: 'Push-ups', reps: repsStrength, intensity },
          { name: 'Decline Push-ups', reps: repsStrength, intensity },
          { name: 'Pike Push-ups', reps: repsStrength, intensity },
          { name: 'Tricep Dips', reps: repsStrength, intensity },
          { name: 'Diamond Push-ups', reps: repsStrength, intensity },
        ] : [
          { name: 'Bench Press', reps: repsStrength, intensity },
          { name: 'Shoulder Press', reps: repsStrength, intensity },
          { name: 'Incline Push-ups', reps: repsStrength, intensity },
          { name: 'Tricep Extensions', reps: repsStrength, intensity },
          { name: 'Chest Flyes', reps: repsStrength, intensity },
        ];
        break;
      
      case 'Pull Day':
        exercises = isHomeWorkout ? [
          { name: 'Pull-ups (or Doorway Rows)', reps: repsStrength, intensity },
          { name: 'Bodyweight Rows', reps: repsStrength, intensity },
          { name: 'Superman Hold', duration: '30 seconds', intensity },
          { name: 'Bicep Curls (with household items)', reps: repsStrength, intensity },
          { name: 'Reverse Snow Angels', reps: repsStrength, intensity },
        ] : [
          { name: 'Pull-ups', reps: repsStrength, intensity },
          { name: 'Barbell Rows', reps: repsStrength, intensity },
          { name: 'Face Pulls', reps: repsStrength, intensity },
          { name: 'Bicep Curls', reps: repsStrength, intensity },
          { name: 'Lat Pulldowns', reps: repsStrength, intensity },
        ];
        break;
      
      case 'Legs Day':
        exercises = isHomeWorkout ? [
          { name: 'Bodyweight Squats', reps: repsStrength, intensity },
          { name: 'Lunges', reps: repsStrength, intensity },
          { name: 'Glute Bridges', reps: repsStrength, intensity },
          { name: 'Step-ups (on chair)', reps: repsStrength, intensity },
          { name: 'Calf Raises', reps: repsStrength, intensity },
        ] : [
          { name: 'Squats', reps: repsStrength, intensity },
          { name: 'Deadlifts', reps: repsStrength, intensity },
          { name: 'Lunges', reps: repsStrength, intensity },
          { name: 'Leg Press', reps: repsStrength, intensity },
          { name: 'Calf Raises', reps: repsStrength, intensity },
        ];
        break;
      
      case 'Cardio':
        exercises = [
          { name: 'Jogging', duration: '20-30 minutes', intensity },
          { name: 'Jumping Jacks', duration: '2 minutes', intensity },
          { name: 'Mountain Climbers', duration: '1 minute', intensity },
          { name: 'High Knees', duration: '1 minute', intensity },
          { name: 'Burpees', reps: '10-15', intensity },
        ];
        break;
      
      case 'HIIT':
        exercises = [
          { name: 'Burpees', duration: '30 seconds work, 30 seconds rest', intensity },
          { name: 'Mountain Climbers', duration: '30 seconds work, 30 seconds rest', intensity },
          { name: 'Jump Squats', duration: '30 seconds work, 30 seconds rest', intensity },
          { name: 'Push-ups', duration: '30 seconds work, 30 seconds rest', intensity },
          { name: 'High Knees', duration: '30 seconds work, 30 seconds rest', intensity },
          { name: 'Rest', duration: '1 minute', intensity: 'Low' },
          { name: 'Repeat for 3-4 rounds', duration: '', intensity: '' },
        ];
        break;
      
      case 'Strength':
        exercises = isHomeWorkout ? [
          { name: 'Push-ups', reps: repsStrength, intensity },
          { name: 'Bodyweight Squats', reps: repsStrength, intensity },
          { name: 'Doorway Rows', reps: repsStrength, intensity },
          { name: 'Pike Push-ups', reps: repsStrength, intensity },
          { name: 'Glute Bridges', reps: repsStrength, intensity },
        ] : [
          { name: 'Deadlifts', reps: repsStrength, intensity },
          { name: 'Bench Press', reps: repsStrength, intensity },
          { name: 'Squats', reps: repsStrength, intensity },
          { name: 'Overhead Press', reps: repsStrength, intensity },
          { name: 'Barbell Rows', reps: repsStrength, intensity },
        ];
        break;
      
      case 'Circuit Training':
        exercises = [
          { name: 'Jump Rope (or Jumping Jacks)', duration: '1 minute', intensity },
          { name: 'Push-ups', reps: repsEndurance, intensity },
          { name: isHomeWorkout ? 'Bodyweight Squats' : 'Kettlebell Swings', reps: repsEndurance, intensity },
          { name: isHomeWorkout ? 'Step-ups' : 'Box Jumps', reps: repsEndurance, intensity },
          { name: 'Plank', duration: '45 seconds', intensity },
          { name: 'Rest', duration: '1 minute', intensity: 'Low' },
          { name: 'Repeat for 3-4 rounds', duration: '', intensity: '' },
        ];
        break;
      
      case 'Active Recovery':
        exercises = [
          { name: 'Light Walking', duration: '20-30 minutes', intensity: 'Low' },
          { name: 'Stretching', duration: '10-15 minutes', intensity: 'Low' },
          { name: 'Foam Rolling', duration: '5-10 minutes', intensity: 'Low' },
          { name: 'Yoga', duration: '15-20 minutes', intensity: 'Low' },
        ];
        break;
      
      case 'Strength & Cardio':
        exercises = [
          { name: isHomeWorkout ? 'Bodyweight Squats' : 'Squats', reps: repsStrength, intensity },
          { name: 'Jump Rope (or Jumping Jacks)', duration: '1 minute', intensity },
          { name: 'Push-ups', reps: repsStrength, intensity },
          { name: 'Jumping Jacks', duration: '1 minute', intensity },
          { name: 'Lunges', reps: repsStrength, intensity },
          { name: 'High Knees', duration: '1 minute', intensity },
        ];
        break;
      
      // Yoga and stretching workouts
      case 'Basic Stretch':
      case 'Dynamic Stretch':
      case 'Yoga Flow':
      case 'Yoga Power':
      case 'Mobility Work':
      case 'Stretch & Strengthen':
        exercises = [
          { name: 'Cat-Cow Stretch', duration: '1 minute', intensity: 'Low' },
          { name: 'Downward Dog', duration: '45 seconds', intensity: 'Low to Medium' },
          { name: 'Child\'s Pose', duration: '30 seconds', intensity: 'Low' },
          { name: 'Cobra Pose', duration: '30 seconds', intensity: 'Low to Medium' },
          { name: 'Pigeon Pose', duration: '45 seconds each side', intensity: 'Medium' },
          { name: 'Warrior Poses', duration: '30 seconds each pose', intensity: 'Medium' },
        ];
        break;
      
      // Running workouts
      case 'Walk/Jog':
      case 'Tempo Run':
      case 'Interval Run':
      case 'Easy Run':
      case 'Long Run':
      case 'Speed Work':
      case 'Hill Training':
      case 'Cross Train':
        let runDuration = level === 'beginner' ? '15-20 minutes' : (level === 'intermediate' ? '30-40 minutes' : '45-60 minutes');
        
        if (workoutType === 'Long Run') {
          runDuration = level === 'beginner' ? '30 minutes' : (level === 'intermediate' ? '60 minutes' : '90+ minutes');
        }
        
        if (workoutType === 'Walk/Jog') {
          exercises = [
            { name: 'Warm-up Walk', duration: '5 minutes', intensity: 'Low' },
            { name: 'Alternate: 1 min jog, 2 min walk', duration: '20 minutes', intensity: 'Low to Medium' },
            { name: 'Cool-down Walk', duration: '5 minutes', intensity: 'Low' },
          ];
        } else if (workoutType === 'Interval Run') {
          exercises = [
            { name: 'Warm-up Jog', duration: '5-10 minutes', intensity: 'Low' },
            { name: 'Sprint', duration: '30 seconds', intensity: 'High' },
            { name: 'Recovery Jog', duration: '90 seconds', intensity: 'Low' },
            { name: 'Repeat 6-10 times', duration: '', intensity: '' },
            { name: 'Cool-down Jog', duration: '5 minutes', intensity: 'Low' },
          ];
        } else if (workoutType === 'Hill Training') {
          exercises = [
            { name: 'Warm-up Jog', duration: '10 minutes', intensity: 'Low' },
            { name: 'Hill Sprint', duration: '30-60 seconds', intensity: 'High' },
            { name: 'Recovery Walk/Jog Downhill', duration: '1-2 minutes', intensity: 'Low' },
            { name: 'Repeat 6-8 times', duration: '', intensity: '' },
            { name: 'Cool-down Jog', duration: '10 minutes', intensity: 'Low' },
          ];
        } else if (workoutType === 'Cross Train') {
          exercises = [
            { name: 'Cycling', duration: '20 minutes', intensity: 'Medium' },
            { name: 'Swimming', duration: '20 minutes', intensity: 'Medium' },
            { name: 'Elliptical', duration: '15 minutes', intensity: 'Medium' },
          ];
        } else {
          exercises = [
            { name: 'Warm-up Jog', duration: '5-10 minutes', intensity: 'Low' },
            { name: `${workoutType}`, duration: runDuration, intensity },
            { name: 'Cool-down Jog', duration: '5 minutes', intensity: 'Low' },
            { name: 'Stretching', duration: '5-10 minutes', intensity: 'Low' },
          ];
        }
        break;
        
      case 'Quick HIIT':
        exercises = [
          { name: 'Jumping Jacks', duration: '30 seconds', intensity },
          { name: 'Air Squats', duration: '30 seconds', intensity },
          { name: 'Push-ups', duration: '30 seconds', intensity },
          { name: 'Mountain Climbers', duration: '30 seconds', intensity },
          { name: 'Rest', duration: '30 seconds', intensity: 'Low' },
          { name: 'Repeat 2-3 times', duration: '', intensity: '' },
        ];
        break;
        
      case 'Quick Full Body':
        exercises = [
          { name: 'Bodyweight Squats', reps: '15', intensity },
          { name: 'Push-ups', reps: '10', intensity },
          { name: 'Jumping Jacks', duration: '45 seconds', intensity },
          { name: 'Plank', duration: '30 seconds', intensity },
          { name: 'Rest', duration: '30 seconds', intensity: 'Low' },
          { name: 'Repeat 2-3 times', duration: '', intensity: '' },
        ];
        break;
      
      default:
        // Generic workout as fallback
        exercises = isHomeWorkout ? [
          { name: 'Jumping Jacks', duration: '2 minutes', intensity },
          { name: 'Push-ups', reps: repsStrength, intensity },
          { name: 'Squats', reps: repsStrength, intensity },
          { name: 'Plank', duration: '30-60 seconds', intensity },
          { name: 'Mountain Climbers', duration: '1 minute', intensity },
        ] : [
          { name: 'Treadmill Warm-up', duration: '5 minutes', intensity: 'Low' },
          { name: 'Dumbbell Squats', reps: repsStrength, intensity },
          { name: 'Bench Press', reps: repsStrength, intensity },
          { name: 'Cable Rows', reps: repsStrength, intensity },
          { name: 'Plank', duration: '45-60 seconds', intensity },
        ];
    }
    
    return exercises;
  }
  
  /**
   * Handle workout-related requests
   */
  private handleWorkoutRequest(userMessage: string, userData: any): CoachResponse {
    // Determine intensity based on message content
    const isIntenseRequest = /intense|hard|challenging|hiit/i.test(userMessage);
    const isGentleRequest = /gentle|easy|beginner|start/i.test(userMessage);
    
    // Adjust workout based on user fitness goal
    const fitnessGoal = userData?.fitnessGoal || 'general';
    let workoutTitle = 'Recommended Workout';
    let exercises: Exercise[] = [];
    
    if (fitnessGoal === 'weightLoss' || /weight|loss|burn|fat/i.test(userMessage)) {
      workoutTitle = 'Fat-Burning Workout';
      exercises = [
        { name: 'Jumping Jacks', duration: '60 seconds', intensity: 'Medium' },
        { name: 'Mountain Climbers', duration: '45 seconds', intensity: 'High' },
        { name: 'Burpees', reps: '10', intensity: 'High' },
        { name: 'High Knees', duration: '60 seconds', intensity: 'Medium' },
        { name: 'Rest', duration: '30 seconds', intensity: 'Low' },
        { name: 'Repeat 3x', duration: '', intensity: '' }
      ];
    } else if (fitnessGoal === 'muscleGain' || /muscle|strength|strong/i.test(userMessage)) {
      workoutTitle = 'Strength Building Workout';
      exercises = [
        { name: 'Push-ups', reps: '12-15', intensity: 'Medium' },
        { name: 'Squats', reps: '15-20', intensity: 'Medium' },
        { name: 'Dumbbell Rows', reps: '10-12 each side', intensity: 'Medium' },
        { name: 'Lunges', reps: '10 each leg', intensity: 'Medium' },
        { name: 'Plank', duration: '45 seconds', intensity: 'Medium' },
        { name: 'Rest 60-90 seconds between exercises', duration: '', intensity: '' }
      ];
    } else {
      // General fitness
      workoutTitle = 'Full Body Workout';
      exercises = [
        { name: 'Bodyweight Squats', reps: '15', intensity: 'Medium' },
        { name: 'Push-ups', reps: '10-12', intensity: 'Medium' },
        { name: 'Plank', duration: '30 seconds', intensity: 'Medium' },
        { name: 'Jumping Jacks', duration: '30 seconds', intensity: 'Medium' },
        { name: 'Rest', duration: '30 seconds', intensity: 'Low' },
        { name: 'Repeat 2-3x', duration: '', intensity: '' }
      ];
    }
    
    // Adjust intensity if specified
    if (isIntenseRequest) {
      workoutTitle += ' (High Intensity)';
      exercises = exercises.map(ex => ({
        ...ex,
        intensity: ex.intensity === 'Medium' ? 'High' : ex.intensity,
        reps: ex.reps ? `${parseInt(ex.reps.split('-')[0]) + 5}` : ex.reps,
        duration: ex.duration && ex.duration.includes('seconds') ? 
          `${parseInt(ex.duration) + 15} seconds` : ex.duration
      }));
    } else if (isGentleRequest) {
      workoutTitle += ' (Beginner Friendly)';
      exercises = exercises.map(ex => ({
        ...ex,
        intensity: ex.intensity === 'High' ? 'Medium' : (ex.intensity === 'Medium' ? 'Low' : ex.intensity),
        reps: ex.reps ? `${Math.max(parseInt(ex.reps.split('-')[0]) - 5, 5)}` : ex.reps,
        duration: ex.duration && ex.duration.includes('seconds') ? 
          `${Math.max(parseInt(ex.duration) - 15, 15)} seconds` : ex.duration
      }));
    }
    
    return {
      message: `Here's a ${fitnessGoal === 'weightLoss' ? 'calorie-burning' : (fitnessGoal === 'muscleGain' ? 'strength-building' : 'balanced')} workout I've customized for you. Remember to warm up for 5 minutes before starting and cool down afterwards.`,
      attachment: {
        type: 'exercise',
        data: {
          title: workoutTitle,
          exercises
        }
      }
    };
  }
  
  /**
   * Handle nutrition-related requests
   */
  private handleNutritionRequest(userMessage: string, userData: any): CoachResponse {
    const fitnessGoal = userData?.fitnessGoal || 'general';
    const calorieGoal = userData?.dailyCalorieGoal || 2000;
    
    let nutritionMessage = '';
    let tipTitle = 'Nutrition Tip';
    let tipContent = '';
    
    if (fitnessGoal === 'weightLoss') {
      nutritionMessage = `Based on your weight loss goal, I recommend focusing on nutrient-dense, filling foods that keep you satisfied while staying in a calorie deficit. Your daily target is around ${calorieGoal} calories.`;
      tipTitle = 'Weight Loss Nutrition Tips';
      tipContent = 'Try incorporating more protein and fiber in your meals to stay fuller longer. Aim for 25-30g of protein per meal and plenty of vegetables. Drinking water before meals can also help with portion control.';
    } else if (fitnessGoal === 'muscleGain') {
      nutritionMessage = `For your muscle building goals, focus on getting enough protein and total calories. Your daily target should be around ${calorieGoal} calories with at least 1.6-2g of protein per kg of bodyweight.`;
      tipTitle = 'Muscle Building Nutrition';
      tipContent = 'Spread your protein intake throughout the day for optimal muscle synthesis. Include carbs before and after workouts to fuel performance and recovery. Don\'t forget healthy fats for hormonal balance.';
    } else {
      nutritionMessage = `For general health and fitness, I recommend a balanced diet with plenty of whole foods. Based on your profile, you should aim for around ${calorieGoal} calories daily.`;
      tipTitle = 'Balanced Nutrition Tips';
      tipContent = 'Try to include all food groups in your meals. Aim for at least 5 servings of fruits and vegetables daily, moderate protein intake, whole grains, and healthy fats from sources like olive oil, nuts, and avocados.';
    }
    
    // Check if specific nutrition topics were mentioned
    if (/protein/i.test(userMessage)) {
      tipTitle = 'Protein Intake Guidance';
      tipContent = 'Good protein sources include lean meats, fish, eggs, dairy, legumes, and plant-based options like tofu and tempeh. For optimal muscle maintenance or growth, aim for 1.6-2.2g per kg of bodyweight daily.';
    } else if (/carb|carbohydrate/i.test(userMessage)) {
      tipTitle = 'Carbohydrate Guidance';
      tipContent = 'Focus on complex carbs like whole grains, fruits, vegetables, and legumes. These provide sustained energy and important nutrients. Time larger carb portions around your workouts for better performance and recovery.';
    } else if (/fat/i.test(userMessage)) {
      tipTitle = 'Healthy Fats Guidance';
      tipContent = 'Include sources of healthy fats like avocados, nuts, seeds, olive oil, and fatty fish. These support hormone production and nutrient absorption. Aim for 20-35% of calories from primarily unsaturated fats.';
    } else if (/meal|plan|schedule/i.test(userMessage)) {
      tipTitle = 'Meal Planning Tips';
      tipContent = 'Prepare meals in advance to make healthy eating easier. Aim for 3 main meals and 1-2 snacks depending on your schedule and hunger levels. Include protein, complex carbs, and vegetables in most meals.';
    }
    
    return {
      message: nutritionMessage,
      attachment: {
        type: 'tip',
        data: {
          title: tipTitle,
          content: tipContent
        }
      }
    };
  }
  
  /**
   * Handle progress-related requests
   */
  private handleProgressRequest(userMessage: string, userData: any): CoachResponse {
    // Generate mock progress data
    const today = new Date();
    const progressData = {
      title: 'Weekly Progress',
      dataPoints: [
        Math.floor(Math.random() * 3000) + 2000, // Random values between 2000-5000
        Math.floor(Math.random() * 3000) + 2000,
        Math.floor(Math.random() * 3000) + 2000,
        Math.floor(Math.random() * 3000) + 2000,
        Math.floor(Math.random() * 3000) + 2000,
        Math.floor(Math.random() * 3000) + 2000,
        Math.floor(Math.random() * 3000) + 2000
      ],
      goal: 8000
    };
    
    // Calculate some simple stats
    const average = Math.round(progressData.dataPoints.reduce((sum, val) => sum + val, 0) / progressData.dataPoints.length);
    const max = Math.max(...progressData.dataPoints);
    const goalDays = progressData.dataPoints.filter(val => val >= progressData.goal).length;
    
    let message = '';
    if (average >= progressData.goal) {
      message = `Great work! You've been consistently meeting or exceeding your daily goal. Your average is ${average} steps per day, which is excellent.`;
    } else if (average >= progressData.goal * 0.8) {
      message = `You're making good progress! Your average of ${average} steps per day is close to your goal of ${progressData.goal}. Just a bit more effort and you'll be there consistently.`;
    } else {
      message = `You're on your way! Your current average is ${average} steps per day. Let's work on strategies to increase your daily activity to reach your ${progressData.goal} step goal.`;
    }
    
    message += ` You reached your goal on ${goalDays} out of 7 days last week, with your best day at ${max} steps.`;
    
    return {
      message,
      attachment: {
        type: 'chart',
        data: progressData
      }
    };
  }
  
  /**
   * Handle sleep-related requests
   */
  private handleSleepRequest(userMessage: string, userData: any): CoachResponse {
    return {
      message: "Quality sleep is crucial for recovery, performance, and even weight management. Most adults need 7-9 hours of quality sleep each night.",
      attachment: {
        type: 'tip',
        data: {
          title: 'Sleep Optimization Tips',
          content: '• Maintain a consistent sleep schedule\n• Create a relaxing bedtime routine\n• Keep your bedroom cool, dark, and quiet\n• Limit screen time 1 hour before bed\n• Avoid caffeine and alcohol close to bedtime\n• Try to get natural sunlight during the day'
        }
      }
    };
  }
  
  /**
   * Handle cardio-related requests
   */
  private handleCardioRequest(userMessage: string, userData: any): CoachResponse {
    const isBeginnerRequest = /beginner|start|new/i.test(userMessage);
    const cardioTitle = isBeginnerRequest ? 'Beginner Cardio Plan' : 'Cardio Workout Plan';
    
    const exercises = isBeginnerRequest ? [
      { name: 'Brisk Walking', duration: '20-30 minutes', intensity: 'Low-Medium' },
      { name: 'Walking-Jogging Intervals', duration: '2 min walk, 30 sec jog', intensity: 'Medium' },
      { name: 'Stationary Bike', duration: '15-20 minutes', intensity: 'Low-Medium' },
      { name: 'Rest Days', description: 'Take 2-3 rest days between sessions' }
    ] : [
      { name: 'Jogging/Running', duration: '20-30 minutes', intensity: 'Medium-High' },
      { name: 'HIIT Intervals', duration: '30 sec work, 90 sec rest x 10', intensity: 'High' },
      { name: 'Cycling', duration: '30-45 minutes', intensity: 'Medium-High' },
      { name: 'Recovery', description: 'Include 1-2 low intensity sessions per week' }
    ];
    
    const message = isBeginnerRequest ?
      "Here's a beginner-friendly cardio plan to help you build endurance gradually without overwhelming your body:" :
      "Here's a cardio plan to help you improve your cardiovascular fitness and endurance:";
    
    return {
      message,
      attachment: {
        type: 'exercise',
        data: {
          title: cardioTitle,
          exercises
        }
      }
    };
  }
  
  /**
   * Handle stretching-related requests
   */
  private handleStretchingRequest(userMessage: string, userData: any): CoachResponse {
    const stretchTitle = 'Mobility & Flexibility Routine';
    
    const exercises = [
      { name: 'Cat-Cow Stretch', duration: '30 seconds', description: 'Great for spine mobility' },
      { name: 'World Greatest Stretch', duration: '30 seconds each side', description: 'Full body mobility' },
      { name: 'Downward Dog', duration: '30-45 seconds', description: 'Hamstrings, calves, shoulders' },
      { name: 'Pigeon Pose', duration: '45 seconds each side', description: 'Hip opener' },
      { name: 'Child Pose', duration: '30 seconds', description: 'Relaxation, back stretch' }
    ];
    
    return {
      message: "Stretching and mobility work are essential components of any fitness routine. They improve range of motion, reduce injury risk, and can help with recovery. Here's a routine you can do daily or after workouts:",
      attachment: {
        type: 'exercise',
        data: {
          title: stretchTitle,
          exercises
        }
      }
    };
  }
  
  /**
   * Handle weight loss-related requests
   */
  private handleWeightLossRequest(userMessage: string, userData: any): CoachResponse {
    // Calculate calorie deficit recommended if we have user data
    let calorieDeficit = '500-700';
    let currentWeight = 'current';
    if (userData && userData.weight && userData.dailyCalorieGoal) {
      currentWeight = userData.weight.toString();
      calorieDeficit = Math.round(userData.dailyCalorieGoal * 0.2).toString();
    }
    
    return {
      message: `For sustainable weight loss, focus on creating a moderate calorie deficit through both diet and exercise. Based on your ${currentWeight} weight, I recommend a deficit of approximately ${calorieDeficit} calories per day, which should result in about 0.5-1 kg of weight loss per week.`,
      attachment: {
        type: 'tip',
        data: {
          title: 'Weight Loss Fundamentals',
          content: '• Focus on whole, nutrient-dense foods\n• Prioritize protein (helps with satiety)\n• Stay hydrated (drink water before meals)\n• Combine cardio and strength training\n• Be consistent and patient\n• Get adequate sleep\n• Manage stress levels'
        }
      }
    };
  }
  
  /**
   * Handle strength-related requests
   */
  private handleStrengthRequest(userMessage: string, userData: any): CoachResponse {
    const isBeginnerRequest = /beginner|start|new/i.test(userMessage);
    const strengthTitle = isBeginnerRequest ? 'Beginner Strength Building' : 'Strength Training Plan';
    
    const exercises = isBeginnerRequest ? [
      { name: 'Bodyweight Squats', reps: '12-15', sets: '3' },
      { name: 'Knee Push-ups', reps: '8-12', sets: '3' },
      { name: 'Supported Rows', reps: '10-12', sets: '3' },
      { name: 'Glute Bridges', reps: '12-15', sets: '3' },
      { name: 'Plank', duration: '20-30 seconds', sets: '3' }
    ] : [
      { name: 'Squats', reps: '8-10', sets: '4' },
      { name: 'Push-ups/Bench Press', reps: '8-10', sets: '4' },
      { name: 'Rows/Pull-ups', reps: '8-10', sets: '4' },
      { name: 'Lunges', reps: '8-10 each leg', sets: '3' },
      { name: 'Overhead Press', reps: '8-10', sets: '3' },
      { name: 'Deadlifts', reps: '6-8', sets: '4' }
    ];
    
    const message = isBeginnerRequest ?
      "Here's a beginner-friendly strength training plan focusing on fundamental movement patterns. Start with these bodyweight exercises and gradually progress:" :
      "Here's a comprehensive strength training plan to build muscle and increase strength:";
    
    return {
      message,
      attachment: {
        type: 'exercise',
        data: {
          title: strengthTitle,
          exercises
        }
      }
    };
  }
  
  /**
   * Handle hydration-related requests
   */
  private handleHydrationRequest(userMessage: string, userData: any): CoachResponse {
    let weightKg = 70; // Default weight assumption
    if (userData && userData.weight) {
      weightKg = userData.weight;
    }
    
    // Calculate rough hydration needs (30ml per kg of bodyweight)
    const waterNeeds = Math.round(weightKg * 30 / 1000);
    const waterNeedsML = waterNeeds * 1000;
    
    return {
      message: `Staying properly hydrated is crucial for overall health and fitness performance. Based on your body weight, you should aim for approximately ${waterNeeds} liters (${waterNeedsML} ml) of water daily. This might need to be increased on hot days or when exercising intensely.`,
      attachment: {
        type: 'tip',
        data: {
          title: 'Hydration Tips',
          content: '• Drink water first thing in the morning\n• Carry a water bottle with you throughout the day\n• Set reminders if you tend to forget\n• Increase intake during and after workouts\n• Monitor urine color (pale yellow indicates good hydration)\n• Eat water-rich foods like cucumbers, watermelon, and oranges'
        }
      }
    };
  }
  
  /**
   * Handle greeting messages
   */
  private handleGreeting(userMessage: string, userData: any): CoachResponse {
    const name = userData?.displayName || 'there';
    const greetings = [
      `Hi ${name}! How can I help with your fitness journey today?`,
      `Hello ${name}! What aspect of your fitness would you like to focus on today?`,
      `Great to see you, ${name}! What can I help you with? Workout ideas, nutrition advice, or something else?`,
      `Welcome back, ${name}! I'm here to support your fitness goals. What would you like to know?`
    ];
    
    return {
      message: greetings[Math.floor(Math.random() * greetings.length)],
      attachment: {
        type: 'tip',
        data: {
          title: 'Coach Tip',
          content: 'I can help with workouts, nutrition advice, recovery strategies, and tracking your progress. Just let me know what you need!'
        }
      }
    };
  }
}

export default new AICoachService();