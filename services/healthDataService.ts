import { auth, db } from '../app/firebaseConfig';
import {
  collection,
  doc,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  updateDoc,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import GoalsTrackingService from './GoalsTrackingService';
import { formatDate } from '../utils/dateUtils';

export interface StepData {
  userId: string;
  date: string;
  steps: number;
  timestamp: any; // Firestore Timestamp
}

export interface HealthStats {
  userId: string;
  weight?: number;
  height?: number;
  bmi?: number;
  restingHeartRate?: number;
  systolicBP?: number;
  diastolicBP?: number;
  dateRecorded: string;
  timestamp: any;
}

/**
 * Save daily step count to Firestore
 * @param steps - Number of steps to record
 * @returns Promise resolving to document reference
 */
export const saveStepCount = async (steps: number): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not logged in');
    }

    const userId = user.uid;
    const today = formatDate(new Date());
    const sessionId = Date.now().toString(); // Unique ID for this session

    console.log(`Saving ${steps} steps for user ${userId} on date ${today}`);

    // First check if we already have an entry for today
    const stepHistoryRef = collection(db, 'stepHistory');
    const q = query(
      stepHistoryRef,
      where('userId', '==', userId),
      where('date', '==', today)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // No entry for today, create a new one
      console.log('No existing step entry found for today, creating new entry');
      await addDoc(collection(db, 'stepHistory'), {
        userId,
        date: today,
        steps,
        timestamp: serverTimestamp(),
        sessionId
      });
    } else {
      // Update existing entry for today
      const docRef = doc(db, 'stepHistory', querySnapshot.docs[0].id);
      const docId = docRef.id;
      
      // Get the current data
      const currentData = querySnapshot.docs[0].data();
      const currentSteps = currentData.steps || 0;
      
      console.log(`Current steps in database: ${currentSteps}, adding ${steps} more`);
      
      // FIXED: Add steps instead of replacing them
      await updateDoc(docRef, {
        steps: currentSteps + steps, // Add to existing step count
        lastUpdated: serverTimestamp(),
        lastSessionId: sessionId // Track last session
      });
    }

    // Update user's total steps
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      totalSteps: increment(steps),
      updatedAt: serverTimestamp()
    });
    
    console.log(`Successfully saved ${steps} steps for ${today}, total should be updated`);
    
    // Update goal progress immediately
    console.log('Syncing goal progress after saving steps...');
    await GoalsTrackingService.syncGoalProgress();
    
    // Verify data was saved correctly by reading it back
    const verificationQuery = query(
      stepHistoryRef,
      where('userId', '==', userId),
      where('date', '==', today)
    );
    
    const verifySnapshot = await getDocs(verificationQuery);
    if (!verifySnapshot.empty) {
      const savedSteps = verifySnapshot.docs[0].data().steps;
      console.log(`Verification: ${savedSteps} steps saved for today`);
    }
  } catch (error) {
    console.error('Error saving step count:', error);
    throw error;
  }
};

/**
 * Get step history for the current user
 * @param days - Number of days of history to retrieve
 * @returns Promise resolving to array of step data
 */
export const getStepHistory = async (days: number = 7): Promise<StepData[]> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not logged in');
    }

    const stepHistoryRef = collection(db, 'stepHistory');
    const q = query(
      stepHistoryRef,
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(days)
    );

    const querySnapshot = await getDocs(q);
    const history: StepData[] = [];

    querySnapshot.forEach(doc => {
      const data = doc.data() as StepData;
      history.push({
        ...data,
        id: doc.id
      } as any);
    });

    return history;
  } catch (error) {
    console.error('Error getting step history:', error);
    throw error;
  }
};

/**
 * Get total step count for a specific date range
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Promise resolving to total step count
 */
export const getTotalStepsForDateRange = async (startDate: string, endDate: string): Promise<number> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not logged in');
    }

    const stepHistoryRef = collection(db, 'stepHistory');
    const q = query(
      stepHistoryRef,
      where('userId', '==', user.uid),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );

    const querySnapshot = await getDocs(q);
    let totalSteps = 0;

    querySnapshot.forEach(doc => {
      const data = doc.data() as StepData;
      totalSteps += data.steps;
    });

    return totalSteps;
  } catch (error) {
    console.error('Error getting total steps:', error);
    throw error;
  }
};

/**
 * Save health stats to Firestore
 * @param stats - Health stats to record
 * @returns Promise resolving to document reference
 */
export const saveHealthStats = async (stats: Partial<HealthStats>): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not logged in');
    }

    const today = formatDate(new Date());

    await addDoc(collection(db, 'healthStats'), {
      userId: user.uid,
      dateRecorded: today,
      timestamp: serverTimestamp(),
      ...stats
    });
  } catch (error) {
    console.error('Error saving health stats:', error);
    throw error;
  }
};

/**
 * Calculate BMI based on weight and height
 * @param weightKg - Weight in kilograms
 * @param heightCm - Height in centimeters
 * @returns Calculated BMI value
 */
export const calculateBMI = (weightKg: number, heightCm: number): number => {
  // Convert height from cm to meters
  const heightM = heightCm / 100;
  // BMI formula: weight(kg) / height(m)²
  return weightKg / (heightM * heightM);
};

/**
 * Get BMI category based on BMI value
 * @param bmi - BMI value
 * @returns Category as string
 */
export const getBMICategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obesity';
};