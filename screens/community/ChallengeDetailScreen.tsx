import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import communityService from '../../services/communityService';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';

type ChallengeDetailScreenProps = StackScreenProps<RootStackParamList, 'challenge-detail'>;

export default function ChallengeDetailScreen({ route, navigation }: ChallengeDetailScreenProps) {
  const { challengeId } = route.params;
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    loadChallengeData();
    
    // Set up timer to update time left
    const timer = setInterval(() => {
      if (challenge) {
        updateTimeLeft(challenge.endDate);
      }
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, [challengeId]);

  const loadChallengeData = async () => {
    try {
      setLoading(true);
      
      // Get challenges
      const challenges = await communityService.getUserChallenges();
      const challengeData = challenges.find(c => c.id === challengeId);
      
      if (challengeData) {
        setChallenge(challengeData);
        updateTimeLeft(challengeData.endDate);
      }
    } catch (error) {
      console.error('Error loading challenge data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTimeLeft = (endDateStr: string) => {
    const now = new Date();
    const endDate = new Date(endDateStr);
    const diffMs = endDate.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      setTimeLeft('Challenge ended');
      return;
    }
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      setTimeLeft(`${diffDays}d ${diffHours}h remaining`);
    } else {
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${diffHours}h ${diffMinutes}m remaining`);
    }
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading challenge details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[
          getMetricColor(challenge?.metric || 'steps'),
          getMetricColor(challenge?.metric || 'steps') + '80'
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Challenge Details</Text>
      </LinearGradient>
      
      {challenge ? (
        <ScrollView style={styles.content}>
          <Text style={styles.challengeName}>{challenge.title}</Text>
          <Text style={styles.challengeDescription}>
            {challenge.description || 'No challenge description available.'}
          </Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons 
                name={
                  challenge.metric === 'steps' ? 'footsteps-outline' :
                  challenge.metric === 'calories' ? 'flame-outline' :
                  challenge.metric === 'distance' ? 'map-outline' : 'time-outline'
                } 
                size={20} 
                color="#6200ee" 
              />
              <Text style={styles.infoText}>
                Goal: {challenge.goal?.toLocaleString()} {challenge.metric}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={20} color="#6200ee" />
              <Text style={styles.infoText}>
                {challenge.participants.length} participants
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#6200ee" />
              <Text style={styles.infoText}>
                {new Date(challenge.startDate).toLocaleDateString()} - {new Date(challenge.endDate).toLocaleDateString()}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#6200ee" />
              <Text style={styles.infoText}>
                {timeLeft}
              </Text>
            </View>
          </View>
          
          <Text style={styles.leaderboardTitle}>Leaderboard</Text>
          {/* You would render leaderboard entries here */}
          <Text style={styles.placeholderText}>
            Leaderboard would be shown here
          </Text>
        </ScrollView>
      ) : (
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.notFoundText}>Challenge not found</Text>
        </View>
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
  content: {
    padding: 20,
  },
  challengeName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  challengeDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#444',
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  placeholderText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 18,
    color: '#666',
    marginTop: 12,
  },
});