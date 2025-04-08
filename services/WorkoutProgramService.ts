import { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    doc, 
    deleteDoc, 
    updateDoc,
    serverTimestamp 
  } from 'firebase/firestore';
  import { auth, db } from '../app/firebaseConfig';
  import { WeeklyProgramData } from './AICoachService';
  import { formatDate } from '../utils/dateUtils';
  
  // Interface for stored workout program
  export interface StoredWorkoutProgram extends WeeklyProgramData {
    id: string;
    userId: string;
    createdAt: any; // Firestore Timestamp
    startDate: string;
    active: boolean;
    progress: ProgramProgress[];
  }
  
  // Interface for tracking workout progress
  export interface ProgramProgress {
    day: string;
    date: string;
    completed: boolean;
    notes?: string;
  }
  
  class WorkoutProgramService {
    // Save a new workout program
    async saveProgram(program: WeeklyProgramData): Promise<string> {
      try {
        const userId = auth.currentUser?.uid;
        
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        // Prepare initial progress tracking for each day
        const progress: ProgramProgress[] = program.days.map(day => ({
          day: day.day,
          date: '', // Will be filled when program is activated
          completed: false
        }));
        
        // Create the stored program object
        const storedProgram: Omit<StoredWorkoutProgram, 'id'> = {
          ...program,
          userId,
          createdAt: serverTimestamp(),
          startDate: formatDate(new Date()), // Default to today
          active: true,
          progress
        };
        
        // Add to Firestore
        const docRef = await addDoc(collection(db, 'workoutPrograms'), storedProgram);
        
        // Deactivate any other active programs
        await this.deactivateOtherPrograms(docRef.id);
        
        return docRef.id;
      } catch (error) {
        console.error('Error saving workout program:', error);
        throw error;
      }
    }
    
    // Get all workout programs for current user
    async getUserPrograms(): Promise<StoredWorkoutProgram[]> {
      try {
        const userId = auth.currentUser?.uid;
        
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        const programsQuery = query(
          collection(db, 'workoutPrograms'),
          where('userId', '==', userId)
        );
        
        const snapshot = await getDocs(programsQuery);
        
        return snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as StoredWorkoutProgram));
      } catch (error) {
        console.error('Error getting user workout programs:', error);
        return [];
      }
    }
    
    // Get active workout program
    async getActiveProgram(): Promise<StoredWorkoutProgram | null> {
      try {
        const userId = auth.currentUser?.uid;
        
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        const programsQuery = query(
          collection(db, 'workoutPrograms'),
          where('userId', '==', userId),
          where('active', '==', true)
        );
        
        const snapshot = await getDocs(programsQuery);
        
        if (snapshot.empty) {
          return null;
        }
        
        return {
          ...snapshot.docs[0].data(),
          id: snapshot.docs[0].id
        } as StoredWorkoutProgram;
      } catch (error) {
        console.error('Error getting active workout program:', error);
        return null;
      }
    }
    
    // Mark a day's workout as completed
    async markWorkoutCompleted(programId: string, day: string, notes?: string): Promise<void> {
      try {
        const userId = auth.currentUser?.uid;
        
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        // Get the program
        const program = await this.getProgramById(programId);
        
        if (!program) {
          throw new Error('Program not found');
        }
        
        // Update the progress for the specified day
        const updatedProgress = program.progress.map(p => {
          if (p.day === day) {
            return {
              ...p,
              completed: true,
              date: formatDate(new Date()),
              notes: notes || p.notes
            };
          }
          return p;
        });
        
        // Update the program in Firestore
        const programRef = doc(db, 'workoutPrograms', programId);
        await updateDoc(programRef, {
          progress: updatedProgress
        });
      } catch (error) {
        console.error('Error marking workout as completed:', error);
        throw error;
      }
    }
    
    // Activate a program and deactivate others
    async activateProgram(programId: string): Promise<void> {
      try {
        const userId = auth.currentUser?.uid;
        
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        // Activate this program
        const programRef = doc(db, 'workoutPrograms', programId);
        await updateDoc(programRef, {
          active: true
        });
        
        // Deactivate other programs
        await this.deactivateOtherPrograms(programId);
      } catch (error) {
        console.error('Error activating workout program:', error);
        throw error;
      }
    }
    
    // Deactivate all other programs
    private async deactivateOtherPrograms(excludeProgramId: string): Promise<void> {
      try {
        const userId = auth.currentUser?.uid;
        
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        // Get all active programs except the one to exclude
        const programsQuery = query(
          collection(db, 'workoutPrograms'),
          where('userId', '==', userId),
          where('active', '==', true)
        );
        
        const snapshot = await getDocs(programsQuery);
        
        // Deactivate all programs except the excluded one
        const deactivatePromises = snapshot.docs
          .filter(doc => doc.id !== excludeProgramId)
          .map(doc => updateDoc(doc.ref, { active: false }));
        
        await Promise.all(deactivatePromises);
      } catch (error) {
        console.error('Error deactivating other workout programs:', error);
        throw error;
      }
    }
    
    // Delete a program
    async deleteProgram(programId: string): Promise<void> {
      try {
        const userId = auth.currentUser?.uid;
        
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        // Delete the program
        await deleteDoc(doc(db, 'workoutPrograms', programId));
      } catch (error) {
        console.error('Error deleting workout program:', error);
        throw error;
      }
    }
    
    // Get a program by ID
    async getProgramById(programId: string): Promise<StoredWorkoutProgram | null> {
      try {
        const userId = auth.currentUser?.uid;
        
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        const docSnap = await getDocs(
          query(
            collection(db, 'workoutPrograms'),
            where('userId', '==', userId)
          )
        );
        
        const program = docSnap.docs.find(doc => doc.id === programId);
        
        if (!program) {
          return null;
        }
        
        return {
          ...program.data(),
          id: program.id
        } as StoredWorkoutProgram;
      } catch (error) {
        console.error('Error getting workout program by ID:', error);
        return null;
      }
    }
    
    // Update program with new start date
    async updateProgramStartDate(programId: string, startDate: string): Promise<void> {
      try {
        const userId = auth.currentUser?.uid;
        
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        // Update the program start date
        const programRef = doc(db, 'workoutPrograms', programId);
        await updateDoc(programRef, {
          startDate
        });
      } catch (error) {
        console.error('Error updating program start date:', error);
        throw error;
      }
    }
    
    // Get program completion percentage
    getCompletionPercentage(program: StoredWorkoutProgram): number {
      if (!program.progress || program.progress.length === 0) {
        return 0;
      }
      
      const completedWorkouts = program.progress.filter(p => p.completed).length;
      const totalWorkouts = program.days.filter(d => !d.isRestDay).length;
      
      return Math.round((completedWorkouts / totalWorkouts) * 100);
    }
  }
  
  export default new WorkoutProgramService();