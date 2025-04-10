import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { auth } from '../../app/firebaseConfig';
import communityService, { Challenge } from '../../services/communityService';

export default function ChallengesScreen({ navigation }: { navigation: any }) {
  const [userChallenges, setUserChallenges] = useState<Challenge[]>([]);
  const [availableChallenges, setAvailableChallenges] = useState<Challenge[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-challenges' | 'discover'>('my-challenges');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get user's challenges
      const challenges = await communityService.getUserChallenges();
      setUserChallenges(challenges);
      
      // In a real app, you would implement a method to get available challenges
      // For now, we'll generate mock data
      const mockChallenges: Challenge[] = [
        {
          id: 'challenge1',
          title: '10K Steps Daily',
          description: 'Complete 10,000 steps every day for a week',
          startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), // In 8 days
          metric: 'steps',
          participants: ['user1', 'user2', 'user3'],
          goal: 10000,
          type: 'individual',
          status: 'upcoming',
          leaderboard: [],
          createdBy: 'user1'
        },
        {
          id: 'challenge2',
          title: 'Burn 500 Calories',
          description: 'Burn at least 500 calories daily for 5 days',
          startDate: new Date(Date.now()).toISOString(), // Today
          endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // In 5 days
          metric: 'calories',
          participants: ['user4', 'user5', 'user6'],
          goal: 500,
          type: 'individual',
          status: 'active',
          leaderboard: [],
          createdBy: 'user4'
        },
        {
          id: 'challenge3',
          title: 'Marathon Prep',
          description: 'Accumulate 50km distance in two weeks',
          startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          endDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(), // In 11 days
          metric: 'distance',
          participants: ['user7', 'user8', 'user9', 'user10'],
          goal: 50000,
          type: 'individual',
          status: 'active',
          leaderboard: [],
          createdBy: 'user7'
        },
        {
          id: 'challenge4',
          title: 'Active Minutes Master',
          description: 'Log at least 60 active minutes daily for 10 days',
          startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // In 5 days
          endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // In 15 days
          metric: 'minutes',
          participants: ['user11', 'user12'],
          goal: 60,
          type: 'individual',
          status: 'upcoming',
          leaderboard: [],
          createdBy: 'user11'
        },
        {
          id: 'challenge5',
          title: 'Team Step Challenge',
          description: 'Accumulate 100,000 steps as a team in 7 days',
          startDate: new Date(Date.now()).toISOString(), // Today
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // In 7 days
          metric: 'steps',
          participants: ['team1-user1', 'team1-user2', 'team1-user3'],
          goal: 100000,
          type: 'team',
          status: 'active',
          leaderboard: [],
          createdBy: 'team1-user1'
        }
      ];
      
      setAvailableChallenges(mockChallenges);
    } catch (error) {
      console.error('Error loading challenges data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      const success = await communityService.joinChallenge(challengeId);
      
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Refresh the challenges list
        loadData();
      }
    } catch (error) {
      console.error('Error joining challenge:', error);
    }
  };

  const filterChallenges = (challenges: Challenge[]) => {
    if (!searchQuery) return challenges;
    
    return challenges.filter(challenge => 
      challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      challenge.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Helper to get color based on metric type
  const getMetricColor = (metric: string) => {
    switch (metric) {
      case 'steps':
        return '#4CAF50';
      case 'calories':
        return '#F44336';
      case 'distance':
        return '#2196F3';
      case 'minutes':
        return '#FF9800';
      default:
        return '#6200ee';
    }
  };

  // Helper to get icon based on metric type
  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'steps':
        return 'footsteps-outline';
      case 'calories':
        return 'flame-outline';
      case 'distance':
        return 'map-outline';
      case 'minutes':
        return 'time-outline';
      default:
        return 'analytics-outline';
    }
  };

  // Calculate time remaining or progress
  const getTimeInfo = (challenge: Challenge) => {
    const now = new Date();
    const startDate = new Date(challenge.startDate);
    const endDate = new Date(challenge.endDate);
    
    if (challenge.status === 'upcoming') {
      const daysToStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `Starts in ${daysToStart} day${daysToStart > 1 ? 's' : ''}`;
    } else if (challenge.status === 'active') {
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} remaining`;
    } else {
      return 'Completed';
    }
  };

  // Get progress percentage for active challenges
  const getProgressPercentage = (challenge: Challenge) => {
    if (challenge.status !== 'active') return 0;
    
    const now = new Date();
    const startDate = new Date(challenge.startDate);
    const endDate = new Date(challenge.endDate);
    
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    
    return Math.min(Math.max(elapsed / totalDuration, 0), 1) * 100;
  };

  const renderChallengeItem = ({ item }: { item: Challenge }) => {
    const isUserParticipant = item.participants.includes(auth.currentUser?.uid || '');
    const metricColor = getMetricColor(item.metric);
    const progressPercentage = getProgressPercentage(item);
    
    return (
      <TouchableOpacity
        style={styles.challengeItem}
        onPress={() => navigation.navigate('challenge-detail', { challengeId: item.id })}
      >
        <View style={styles.challengeHeader}>
          <View style={[styles.challengeBadge, { backgroundColor: metricColor + '20' }]}>
            <Ionicons name={getMetricIcon(item.metric) as any} size={20} color={metricColor} />
          </View>
          <View style={styles.challengeInfo}>
            <Text style={styles.challengeTitle}>{item.title}</Text>
            <Text style={styles.challengeType}>
              {item.type === 'team' ? 'Team Challenge' : 'Individual Challenge'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#4CAF50' : '#FF9800' }]}>
            <Text style={styles.statusText}>{item.status === 'active' ? 'Active' : 'Upcoming'}</Text>
          </View>
        </View>
        
        <Text style={styles.challengeDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.challengeDetails}>
          <View style={styles.detailItem}>
            <Ionicons name={getMetricIcon(item.metric) as any} size={16} color="#666" />
            <Text style={styles.detailText}>
              {item.goal?.toLocaleString()} {item.metric}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {item.participants.length} participant{item.participants.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {new Date(item.endDate).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        {item.status === 'active' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progressPercentage}%`, backgroundColor: metricColor }
                ]} 
              />
            </View>
            <Text style={styles.timeRemaining}>{getTimeInfo(item)}</Text>
          </View>
        )}
        
        {item.status === 'upcoming' && (
          <Text style={styles.timeRemaining}>{getTimeInfo(item)}</Text>
        )}
        
        {activeTab === 'discover' && !isUserParticipant && (
          <TouchableOpacity
            style={[styles.joinButton, { backgroundColor: metricColor }]}
            onPress={() => handleJoinChallenge(item.id)}
          >
            <Text style={styles.joinButtonText}>Join Challenge</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <LinearGradient
        colors={['#6200ee', '#9c64f4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Challenges</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            // In a real app, navigate to create challenge screen
            console.log('Create challenge');
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search challenges..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Tab Selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-challenges' && styles.activeTab]}
          onPress={() => setActiveTab('my-challenges')}
        >
          <Text style={[styles.tabText, activeTab === 'my-challenges' && styles.activeTabText]}>
            My Challenges
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
            Discover
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Challenges List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading challenges...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'my-challenges' ? (
            <FlatList
              data={filterChallenges(userChallenges)}
              keyExtractor={(item) => item.id}
              renderItem={renderChallengeItem}
              contentContainerStyle={styles.challengesList}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="trophy-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyTitle}>No Challenges Yet</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery 
                      ? `No challenges found matching "${searchQuery}"`
                      : "You haven't joined any challenges yet. Create a new challenge or join an existing one."}
                  </Text>
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => {
                      // In a real app, navigate to create challenge screen
                      console.log('Create challenge');
                    }}
                  >
                    <Text style={styles.createButtonText}>Create a Challenge</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          ) : (
            <FlatList
              data={filterChallenges(availableChallenges)}
              keyExtractor={(item) => item.id}
              renderItem={renderChallengeItem}
              contentContainerStyle={styles.challengesList}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyTitle}>No Challenges Found</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery 
                      ? `No challenges found matching "${searchQuery}"`
                      : "There are no challenges available to join right now. Try again later or create your own challenge."}
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#6200ee',
  },
  tabText: {
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  challengesList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  challengeItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  challengeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  challengeType: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  challengeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  challengeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#666',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
  },
  timeRemaining: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  joinButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#6200ee',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});