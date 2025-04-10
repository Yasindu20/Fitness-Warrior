import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import communityService from '../../services/communityService';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';

type TeamDetailScreenProps = StackScreenProps<RootStackParamList, 'team-detail'>;

export default function TeamDetailScreen({ route, navigation }: TeamDetailScreenProps) {
  const { teamId } = route.params;
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any>(null);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      
      // Get teams
      const teams = await communityService.getUserTeams();
      const teamData = teams.find(t => t.id === teamId);
      
      if (teamData) {
        setTeam(teamData);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading team details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[team?.color || '#6200ee', (team?.color || '#6200ee') + '80']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Team Details</Text>
      </LinearGradient>
      
      {team ? (
        <View style={styles.content}>
          <Text style={styles.teamName}>{team.name}</Text>
          <Text style={styles.teamDescription}>
            {team.description || 'No team description available.'}
          </Text>
          <Text style={styles.membersTitle}>Members: {team.members.length}</Text>
          
          {/* You would render team members and other details here */}
          <Text style={styles.statsText}>Total Steps: {team.totalSteps.toLocaleString()}</Text>
          <Text style={styles.statsText}>Total Calories: {team.totalCalories.toLocaleString()}</Text>
        </View>
      ) : (
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.notFoundText}>Team not found</Text>
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
  teamName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  teamDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  membersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsText: {
    fontSize: 16,
    color: '#444',
    marginBottom: 8,
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