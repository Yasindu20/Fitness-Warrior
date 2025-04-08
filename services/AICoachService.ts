//AICoachService.tsx
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
  type: 'exercise' | 'chart' | 'tip';
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
        pattern: /workout|exercise|training|routine/i,
        handler: this.handleWorkoutRequest
      },
      {
        pattern: /diet|food|eat|nutrition|meal|calorie/i,
        handler: this.handleNutritionRequest
      },
      {
        pattern: /progress|goal|improve|achievement/i,
        handler: this.handleProgressRequest
      },
      {
        pattern: /sleep|rest|recovery|tired/i,
        handler: this.handleSleepRequest
      },
      {
        pattern: /cardio|run|jog|walk|running/i,
        handler: this.handleCardioRequest
      },
      {
        pattern: /stretch|mobility|flexibility/i,
        handler: this.handleStretchingRequest
      },
      {
        pattern: /weight|fat|lose|burn/i,
        handler: this.handleWeightLossRequest
      },
      {
        pattern: /muscle|strength|strong|build/i,
        handler: this.handleStrengthRequest
      },
      {
        pattern: /water|hydration|drink|fluid/i,
        handler: this.handleHydrationRequest
      },
      {
        pattern: /hello|hi|hey|greetings/i,
        handler: this.handleGreeting
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
        reps: ex.reps ? `${parseInt(ex.reps) + 5}` : ex.reps,
        duration: ex.duration ? `${parseInt(ex.duration) + 15} seconds` : ex.duration
      }));
    } else if (isGentleRequest) {
      workoutTitle += ' (Beginner Friendly)';
      exercises = exercises.map(ex => ({
        ...ex,
        intensity: ex.intensity === 'High' ? 'Medium' : (ex.intensity === 'Medium' ? 'Low' : ex.intensity),
        reps: ex.reps ? `${Math.max(parseInt(ex.reps) - 5, 5)}` : ex.reps,
        duration: ex.duration ? `${Math.max(parseInt(ex.duration) - 15, 15)} seconds` : ex.duration
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
      calorieDeficit = (userData.dailyCalorieGoal * 0.2).toFixed(0);
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