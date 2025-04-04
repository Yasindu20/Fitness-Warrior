import { 
    doc, 
    setDoc, 
    updateDoc, 
    increment,
    collection,
    serverTimestamp,
    addDoc, 
    deleteDoc, 
    Query,
    DocumentData
} from 'firebase/firestore';
import { db } from '../app/firebaseConfig';

export interface UserProfile {
    userId: string;
    displayName: string;
    email: string;
    
    // Bio information
    weight?: number;
    height?: number;
    age?: number;
    gender?: string;
    fitnessGoal?: string;
    
    // Fitness metrics
    totalSteps: number;
    totalCalories: number;
    totalDistance: number;
    totalActiveMinutes: number;
    dailyCalorieGoal: number;
    
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// Create/Update user profile
export const updateUserProfile = async (
    userId: string, 
    userData: Partial<UserProfile>
) => {
    try {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
            ...userData,
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
};

// Update user's fitness metrics
export const updateUserMetrics = async (
    userId: string,
    steps: number,
    calories: number,
    distance: number,
    activeMinutes: number
) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            totalSteps: increment(steps),
            totalCalories: increment(calories),
            totalDistance: increment(distance),
            totalActiveMinutes: increment(activeMinutes),
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating metrics:', error);
        throw error;
    }
};

// Add calorie intake
export const addCalorieIntake = async (intakeData: any) => {
    try {
        const docRef = await addDoc(collection(db, 'calorieIntake'), {
            ...intakeData,
            timestamp: serverTimestamp()
        });

        // Update user's total calories
        await updateDoc(doc(db, 'users', intakeData.userId), {
            totalCalories: increment(intakeData.calories),
            updatedAt: serverTimestamp()
        });

        return docRef;
    } catch (error) {
        console.error('Error adding calorie intake:', error);
        throw error;
    }
};

// Remove calorie intake
export const removeCalorieIntake = async (userId: string, documentId: string, calories: number) => {
    try {
        await deleteDoc(doc(db, 'calorieIntake', documentId));
        
        // Subtract calories from user's total
        await updateDoc(doc(db, 'users', userId), {
            totalCalories: increment(-calories),
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error removing calorie intake:', error);
        throw error;
    }
};