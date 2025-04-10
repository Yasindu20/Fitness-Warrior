import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import communityService, { ActivityEvent } from '../../services/communityService';

export default function CommunityActivityFeed({ navigation }: { navigation: any }) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActivities();
    
    // Set up real-time listener
    const unsubscribe = communityService.setupActivityListener(handleActivityUpdate);
    
    return () => {
      unsubscribe();
    };
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const activityData = await communityService.getFriendsActivity();
      setActivities(activityData);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleActivityUpdate = (updatedActivities: ActivityEvent[]) => {
    setActivities(updatedActivities);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadActivities();
  };

  const getActivityIcon = (eventType: string) => {
    switch (eventType) {
      case 'goal_completed':
        return 'trophy-outline';
      case 'challenge_joined':
        return 'flame-outline';
      case 'team_joined':
        return 'people-outline';
      case 'friend_added':
        return 'person-add-outline';
      case 'achievement_unlocked':
        return 'ribbon-outline';
      default:
        return 'star-outline';
    }
  };

  const getActivityColor = (eventType: string) => {
    switch (eventType) {
      case 'goal_completed':
        return '#4CAF50';
      case 'challenge_joined':
        return '#FF9800';
      case 'team_joined':
        return '#2196F3';
      case 'friend_added':
        return '#9C27B0';
      case 'achievement_unlocked':
        return '#FFD700';
      default:
        return '#6200ee';
    }
  };

  const getActivityText = (item: ActivityEvent) => {
    switch (item.eventType) {
      case 'goal_completed':
        return `completed a ${item.details.type} goal`;
      case 'challenge_joined':
        return `joined the "${item.details.challengeTitle}" challenge`;
      case 'team_joined':
        return `joined the ${item.details.teamName} team`;
      case 'friend_added':
        return item.details.status === 'accepted' 
          ? 'became friends with someone' 
          : 'sent a friend request';
      case 'achievement_unlocked':
        return `unlocked the "${item.details.achievementTitle}" achievement`;
      default:
        return 'did something';
    }
  };

  const getTimeAgo = (timestamp: any) => {
    const now = new Date();
    const activityTime = new Date(timestamp.toDate ? timestamp.toDate() : timestamp);
    const diffMs = now.getTime() - activityTime.getTime();
    
    // Convert to appropriate time unit
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays}d ago`;
    }
    if (diffHours > 0) {
      return `${diffHours}h ago`;
    }
    if (diffMins > 0) {
      return `${diffMins}m ago`;
    }
    return 'just now';
  };

  const renderActivityItem = ({ item }: { item: ActivityEvent }) => {
    return (
      <TouchableOpacity style={styles.activityItem}>
        <View style={[styles.activityIcon, { backgroundColor: getActivityColor(item.eventType) + '20' }]}>
          <Ionicons name={getActivityIcon(item.eventType) as any} size={20} color={getActivityColor(item.eventType)} />
        </View>
        
        <View style={styles.activityContent}>
          <Text style={styles.activityText}>
            <Text style={styles.activityName}>{item.displayName}</Text> {getActivityText(item)}
          </Text>
          <Text style={styles.activityTime}>{getTimeAgo(item.timestamp)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#6200ee', '#9c64f4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Activity Feed</Text>
      </LinearGradient>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={renderActivityItem}
          contentContainerStyle={styles.activityList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Activity Yet</Text>
              <Text style={styles.emptyText}>
                Activity from you and your friends will appear here
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  activityList: {
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  activityName: {
    fontWeight: 'bold',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
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
  },
});