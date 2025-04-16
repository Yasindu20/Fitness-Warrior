import { 
    collection, 
    query, 
    where, 
    orderBy, 
    getDocs, 
    getDoc, 
    doc, 
    limit, 
    updateDoc, 
    arrayUnion, 
    arrayRemove, 
    onSnapshot, 
    serverTimestamp, 
    addDoc 
  } from 'firebase/firestore';
  
  import { auth, db } from '../app/firebaseConfig';
  
  // Interfaces
  export interface CommunityUser {
    id: string;
    displayName: string;
    totalSteps: number;
    totalCalories: number;
    totalDistance: number;
    totalActiveMinutes: number;
    avatar?: string;
    streak?: number;
    location?: {
      latitude: number;
      longitude: number;
      city?: string;
      region?: string;
    };
    tier?: string;
    friends?: string[];
  }

  export interface FriendRequest {
    id: string;
    userId: string;
    displayName: string;
    status: 'pending' | 'accepted' | 'declined' | 'requested';
    avatar?: string;
  }
  
  export interface Team {
    id: string;
    name: string;
    description?: string;
    members: string[];
    totalSteps: number;
    totalCalories: number;
    avatar?: string;
    color: string;
    createdBy: string;
    createdAt: any; // Firestore timestamp
  }
  
  export interface Challenge {
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    metric: 'steps' | 'calories' | 'distance' | 'minutes';
    participants: string[];
    goal?: number;
    type: 'individual' | 'team';
    status: 'upcoming' | 'active' | 'completed';
    leaderboard: {
      userId: string;
      name: string;
      value: number;
      rank?: number;
    }[];
    createdBy: string;
  }
  
  export interface ActivityEvent {
    id: string;
    userId: string;
    displayName: string;
    eventType: 'goal_completed' | 'challenge_joined' | 'team_joined' | 'friend_added' | 'achievement_unlocked';
    timestamp: any; // Firestore timestamp
    details: any;
  }
  
  // Calculate user tier based on step count
  const calculateTier = (steps: number): string => {
    if (steps >= 1000000) return 'Diamond';
    if (steps >= 500000) return 'Platinum';
    if (steps >= 100000) return 'Gold';
    if (steps >= 50000) return 'Silver';
    if (steps >= 10000) return 'Bronze';
    return 'Rookie';
  };
  
  // Service class
  class CommunityService {
    
    // Get global leaderboard
    async getGlobalLeaderboard(
      metricType: 'steps' | 'calories' | 'distance' | 'minutes' = 'steps',
      limitCount: number = 100
    ): Promise<CommunityUser[]> {
      try {
        const q = query(
          collection(db, 'users'),
          orderBy(`total${metricType.charAt(0).toUpperCase() + metricType.slice(1)}`, 'desc'),
          limit(limitCount)
        );
        
        const querySnapshot = await getDocs(q);
        const usersData: CommunityUser[] = [];
        
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          usersData.push({
            id: doc.id,
            displayName: userData.displayName || 'Anonymous',
            totalSteps: userData.totalSteps || 0,
            totalCalories: userData.totalCalories || 0,
            totalDistance: userData.totalDistance || 0,
            totalActiveMinutes: userData.totalActiveMinutes || 0,
            avatar: userData.avatar || null,
            streak: userData.streak || 0,
            location: userData.location || null,
            tier: calculateTier(userData.totalSteps || 0),
          });
        });
        
        return usersData;
      } catch (error) {
        console.error("Error fetching global leaderboard:", error);
        throw error;
      }
    }
    
    // Get local leaderboard based on user's location
    async getLocalLeaderboard(
        latitude: number,
        longitude: number,
        metricType: 'steps' | 'calories' | 'distance' | 'minutes' = 'steps',
        radiusKm: number = 50
      ): Promise<CommunityUser[]> {
        try {
          // Define mapping from metric type to property name
          const metricToProperty: Record<string, keyof CommunityUser> = {
            'steps': 'totalSteps',
            'calories': 'totalCalories',
            'distance': 'totalDistance',
            'minutes': 'totalActiveMinutes'
          };
      
          // Get the property name for the requested metric
          const propertyName = metricToProperty[metricType];
          
          // Calculate bounding box (approximate based on the radius)
          const latDelta = radiusKm / 111.12; // Roughly convert km to degrees (1 deg = 111.12 km)
          const lonDelta = latDelta / Math.cos(latitude * (Math.PI / 180));
          
          const minLat = latitude - latDelta;
          const maxLat = latitude + latDelta;
          const minLon = longitude - lonDelta;
          const maxLon = longitude + lonDelta;
          
          // Get users with location data
          const usersRef = collection(db, 'users');
          const usersSnapshot = await getDocs(usersRef);
          const nearbyUsers: CommunityUser[] = [];
          
          usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.location) {
              const userLat = userData.location.latitude;
              const userLon = userData.location.longitude;
              
              if (userLat >= minLat && userLat <= maxLat && userLon >= minLon && userLon <= maxLon) {
                nearbyUsers.push({
                  id: doc.id,
                  displayName: userData.displayName || 'Anonymous',
                  totalSteps: userData.totalSteps || 0,
                  totalCalories: userData.totalCalories || 0,
                  totalDistance: userData.totalDistance || 0,
                  totalActiveMinutes: userData.totalActiveMinutes || 0,
                  avatar: userData.avatar || null,
                  location: userData.location,
                  tier: calculateTier(userData.totalSteps || 0),
                });
              }
            }
          });
          
          // Sort by selected metric using the property name
          nearbyUsers.sort((a, b) => {
            const aValue = a[propertyName] as number;
            const bValue = b[propertyName] as number;
            return bValue - aValue;
          });
          
          return nearbyUsers;
        } catch (error) {
          console.error("Error fetching local leaderboard:", error);
          throw error;
        }
      }
    
    // Get user data
    async getUserData(userId: string): Promise<CommunityUser | null> {
      try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          return {
            id: userId,
            displayName: userData.displayName || 'Anonymous',
            totalSteps: userData.totalSteps || 0,
            totalCalories: userData.totalCalories || 0,
            totalDistance: userData.totalDistance || 0,
            totalActiveMinutes: userData.totalActiveMinutes || 0,
            avatar: userData.avatar || null,
            streak: userData.streak || 0,
            location: userData.location || null,
            tier: calculateTier(userData.totalSteps || 0),
            friends: userData.friends || [],
          };
        }
        
        return null;
      } catch (error) {
        console.error("Error fetching user data:", error);
        throw error;
      }
    }
    
    // Get friends data
    async getFriendsData(): Promise<CommunityUser[]> {
      try {
        if (!auth.currentUser) return [];
        
        const userId = auth.currentUser.uid;
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists() && userDoc.data().friends) {
          const friendIds = userDoc.data().friends;
          const friendsData: CommunityUser[] = [];
          
          // Fetch data for each friend
          for (const friendId of friendIds) {
            const friendData = await this.getUserData(friendId);
            if (friendData) {
              friendsData.push(friendData);
            }
          }
          
          return friendsData;
        }
        
        return [];
      } catch (error) {
        console.error("Error fetching friends data:", error);
        throw error;
      }
    }
    
    // Send friend request
    async sendFriendRequest(friendId: string): Promise<boolean> {
      try {
        if (!auth.currentUser) return false;
        
        const userId = auth.currentUser.uid;
        
        // Create a friend request
        await addDoc(collection(db, 'friendRequests'), {
          senderId: userId,
          receiverId: friendId,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        return true;
      } catch (error) {
        console.error("Error sending friend request:", error);
        throw error;
      }
    }
    
    // Handle friend request (accept or decline)
    async handleFriendRequest(requestId: string, action: 'accept' | 'decline'): Promise<boolean> {
      try {
        if (!auth.currentUser) return false;
        
        const userId = auth.currentUser.uid;
        const requestRef = doc(db, 'friendRequests', requestId);
        const requestDoc = await getDoc(requestRef);
        
        if (!requestDoc.exists()) return false;
        
        const requestData = requestDoc.data();
        
        if (requestData.receiverId !== userId) return false;
        
        if (action === 'accept') {
          // Update request status
          await updateDoc(requestRef, {
            status: 'accepted',
            updatedAt: serverTimestamp(),
          });
          
          // Add to each user's friends list
          const userRef = doc(db, 'users', userId);
          const friendRef = doc(db, 'users', requestData.senderId);
          
          await updateDoc(userRef, {
            friends: arrayUnion(requestData.senderId)
          });
          
          await updateDoc(friendRef, {
            friends: arrayUnion(userId)
          });
          
          // Add activity event
          await this.addActivityEvent('friend_added', {
            friendId: requestData.senderId,
            status: 'accepted'
          });
        } else {
          // Decline request
          await updateDoc(requestRef, {
            status: 'declined',
            updatedAt: serverTimestamp(),
          });
        }
        
        return true;
      } catch (error) {
        console.error("Error handling friend request:", error);
        throw error;
      }
    }

    async searchUsers(searchQuery: string): Promise<CommunityUser[]> {
      try {
        if (!auth.currentUser) return [];
        
        // Get a reference to all users
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const allUsers: CommunityUser[] = [];
        
        // Convert the query to lowercase for case-insensitive comparison
        const queryLower = searchQuery.toLowerCase();
        
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          // Skip the current user
          if (doc.id === auth.currentUser?.uid) return;
          
          // Check if displayName contains the search query (case insensitive)
          if (userData.displayName && 
              userData.displayName.toLowerCase().includes(queryLower)) {
            allUsers.push({
              id: doc.id,
              displayName: userData.displayName || 'Anonymous',
              totalSteps: userData.totalSteps || 0,
              totalCalories: userData.totalCalories || 0,
              totalDistance: userData.totalDistance || 0,
              totalActiveMinutes: userData.totalActiveMinutes || 0,
              avatar: userData.avatar || null,
              streak: userData.streak || 0,
              tier: calculateTier(userData.totalSteps || 0),
            });
          }
        });
        
        return allUsers;
      } catch (error) {
        console.error("Error searching users:", error);
        throw error;
      }
    }

    async getFriendRequests(): Promise<FriendRequest[]> {
      try {
        if (!auth.currentUser) return [];
        
        const userId = auth.currentUser.uid;
        
        // Query for pending friend requests where this user is the receiver
        const requestsQuery = query(
          collection(db, 'friendRequests'),
          where('receiverId', '==', userId),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        );
        
        const requestsSnapshot = await getDocs(requestsQuery);
        const requests: FriendRequest[] = [];
        
        // Process each request document
        for (const docSnap of requestsSnapshot.docs) {
          const requestData = docSnap.data();
          
          // Get sender's user profile to display their name
          const senderRef = doc(db, 'users', requestData.senderId);
          const senderDoc = await getDoc(senderRef);
          
          if (senderDoc.exists()) {
            const senderData = senderDoc.data();
            
            requests.push({
              id: docSnap.id,
              userId: requestData.senderId,
              displayName: senderData.displayName || 'Unknown User',
              status: 'pending',
              avatar: senderData.avatar, // Include avatar if available
            });
          }
        }
        
        return requests;
      } catch (error) {
        console.error("Error fetching friend requests:", error);
        throw error;
      }
    }
    
    // Get user's teams
    async getUserTeams(): Promise<Team[]> {
      try {
        if (!auth.currentUser) return [];
        
        const userId = auth.currentUser.uid;
        
        // Get teams the user is a member of
        const teamsQuery = query(
          collection(db, 'teams'),
          where('members', 'array-contains', userId)
        );
        
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsList: Team[] = [];
        
        teamsSnapshot.forEach((doc) => {
          teamsList.push({
            id: doc.id,
            ...doc.data()
          } as Team);
        });
        
        return teamsList;
      } catch (error) {
        console.error("Error fetching teams:", error);
        throw error;
      }
    }
    
    // Create team
    async createTeam(name: string, color: string, description?: string): Promise<string> {
      try {
        if (!auth.currentUser) throw new Error("User not authenticated");
        
        const userId = auth.currentUser.uid;
        const userData = await this.getUserData(userId);
        
        if (!userData) throw new Error("User data not found");
        
        const teamRef = await addDoc(collection(db, 'teams'), {
          name,
          description: description || '',
          members: [userId],
          totalSteps: userData.totalSteps || 0,
          totalCalories: userData.totalCalories || 0,
          color,
          createdBy: userId,
          createdAt: serverTimestamp(),
        });
        
        // Add activity event
        await this.addActivityEvent('team_joined', {
          teamId: teamRef.id,
          teamName: name
        });
        
        return teamRef.id;
      } catch (error) {
        console.error("Error creating team:", error);
        throw error;
      }
    }
    
    // Join team
    async joinTeam(teamId: string): Promise<boolean> {
      try {
        if (!auth.currentUser) return false;
        
        const userId = auth.currentUser.uid;
        const teamRef = doc(db, 'teams', teamId);
        const teamDoc = await getDoc(teamRef);
        
        if (!teamDoc.exists()) return false;
        
        const teamData = teamDoc.data();
        
        // Check if user is already a member
        if (teamData.members.includes(userId)) return true;
        
        // Add user to team
        await updateDoc(teamRef, {
          members: arrayUnion(userId)
        });
        
        // Add activity event
        await this.addActivityEvent('team_joined', {
          teamId,
          teamName: teamData.name
        });
        
        return true;
      } catch (error) {
        console.error("Error joining team:", error);
        throw error;
      }
    }
    
    // Leave team
    async leaveTeam(teamId: string): Promise<boolean> {
      try {
        if (!auth.currentUser) return false;
        
        const userId = auth.currentUser.uid;
        const teamRef = doc(db, 'teams', teamId);
        
        await updateDoc(teamRef, {
          members: arrayRemove(userId)
        });
        
        return true;
      } catch (error) {
        console.error("Error leaving team:", error);
        throw error;
      }
    }
    
    // Get user's challenges
    async getUserChallenges(): Promise<Challenge[]> {
      try {
        if (!auth.currentUser) return [];
        
        const userId = auth.currentUser.uid;
        
        // Get challenges the user is participating in
        const challengesQuery = query(
          collection(db, 'challenges'),
          where('participants', 'array-contains', userId)
        );
        
        const challengesSnapshot = await getDocs(challengesQuery);
        const challengesList: Challenge[] = [];
        
        challengesSnapshot.forEach((doc) => {
          challengesList.push({
            id: doc.id,
            ...doc.data()
          } as Challenge);
        });
        
        return challengesList;
      } catch (error) {
        console.error("Error fetching challenges:", error);
        throw error;
      }
    }
    
    // Join challenge
    async joinChallenge(challengeId: string): Promise<boolean> {
      try {
        if (!auth.currentUser) return false;
        
        const userId = auth.currentUser.uid;
        const challengeRef = doc(db, 'challenges', challengeId);
        const challengeDoc = await getDoc(challengeRef);
        
        if (!challengeDoc.exists()) return false;
        
        const challengeData = challengeDoc.data();
        
        // Check if user is already participating
        if (challengeData.participants.includes(userId)) return true;
        
        // Add user to challenge
        await updateDoc(challengeRef, {
          participants: arrayUnion(userId)
        });
        
        // Add activity event
        await this.addActivityEvent('challenge_joined', {
          challengeId,
          challengeTitle: challengeData.title
        });
        
        return true;
      } catch (error) {
        console.error("Error joining challenge:", error);
        throw error;
      }
    }
    
    // Leave challenge
    async leaveChallenge(challengeId: string): Promise<boolean> {
      try {
        if (!auth.currentUser) return false;
        
        const userId = auth.currentUser.uid;
        const challengeRef = doc(db, 'challenges', challengeId);
        
        await updateDoc(challengeRef, {
          participants: arrayRemove(userId)
        });
        
        return true;
      } catch (error) {
        console.error("Error leaving challenge:", error);
        throw error;
      }
    }
    
    // Get friends activity
    async getFriendsActivity(limitCount: number = 20): Promise<ActivityEvent[]> {
      try {
        if (!auth.currentUser) return [];
        
        const userId = auth.currentUser.uid;
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (!userDoc.exists() || !userDoc.data().friends) return [];
        
        const friendIds = userDoc.data().friends;
        
        // Query activity for friends and self
        const activityQuery = query(
          collection(db, 'activity'),
          where('userId', 'in', [...friendIds, userId]),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
        
        const activitySnapshot = await getDocs(activityQuery);
        const activityList: ActivityEvent[] = [];
        
        activitySnapshot.forEach((doc) => {
          activityList.push({
            id: doc.id,
            ...doc.data()
          } as ActivityEvent);
        });
        
        return activityList;
      } catch (error) {
        console.error("Error fetching friends activity:", error);
        throw error;
      }
    }
    
    // Add activity event
    async addActivityEvent(
      eventType: ActivityEvent['eventType'],
      details: any
    ): Promise<string> {
      try {
        if (!auth.currentUser) throw new Error("User not authenticated");
        
        const userId = auth.currentUser.uid;
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (!userDoc.exists()) throw new Error("User not found");
        
        const displayName = userDoc.data().displayName || 'Anonymous';
        
        const activityRef = await addDoc(collection(db, 'activity'), {
          userId,
          displayName,
          eventType,
          details,
          timestamp: serverTimestamp()
        });
        
        return activityRef.id;
      } catch (error) {
        console.error("Error adding activity event:", error);
        throw error;
      }
    }
    
    // Setup activity listener for real-time updates
    setupActivityListener(callback: (activities: ActivityEvent[]) => void): () => void {
      if (!auth.currentUser) return () => {};
      
      const userId = auth.currentUser.uid;
      
      // Get initial friends list
      getDoc(doc(db, 'users', userId)).then((userDoc) => {
        if (!userDoc.exists() || !userDoc.data().friends) {
          callback([]);
          return;
        }
        
        const friendIds = userDoc.data().friends;
        
        // Set up listener
        const activityQuery = query(
          collection(db, 'activity'),
          where('userId', 'in', [...friendIds, userId]),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        
        const unsubscribe = onSnapshot(activityQuery, (snapshot) => {
          const activities: ActivityEvent[] = [];
          snapshot.forEach((doc) => {
            activities.push({ id: doc.id, ...doc.data() } as ActivityEvent);
          });
          callback(activities);
        }, (error) => {
          console.error("Error in activity listener:", error);
        });
        
        return unsubscribe;
      }).catch((error) => {
        console.error("Error setting up activity listener:", error);
      });
      
      // Return empty unsubscribe function as fallback
      return () => {};
    }
  }
  
  // Create singleton instance
  const communityService = new CommunityService();
  export default communityService;