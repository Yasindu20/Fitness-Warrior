import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  RefreshControl,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { auth } from '../../app/firebaseConfig';
import communityService, { Team } from '../../services/communityService';

export default function TeamsScreen({ navigation }: { navigation: any }) {
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [publicTeams, setPublicTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-teams' | 'discover'>('my-teams');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get user's teams
      const teams = await communityService.getUserTeams();
      setUserTeams(teams);
      
      // In a real app, you would implement a method to get public teams
      // For now, we'll generate mock data
      const mockPublicTeams: Team[] = [
        {
          id: 'team1',
          name: 'Running Enthusiasts',
          description: 'A team for passionate runners of all levels',
          members: ['user1', 'user2', 'user3'],
          totalSteps: 1250000,
          totalCalories: 42500,
          color: '#4CAF50',
          createdBy: 'user1',
          createdAt: new Date()
        },
        {
          id: 'team2',
          name: 'Fitness Warriors',
          description: 'Train hard, compete harder!',
          members: ['user4', 'user5', 'user6', 'user7'],
          totalSteps: 980000,
          totalCalories: 36200,
          color: '#2196F3',
          createdBy: 'user4',
          createdAt: new Date()
        },
        {
          id: 'team3',
          name: 'Step Masters',
          description: 'Dedicated to achieving high step counts daily',
          members: ['user8', 'user9'],
          totalSteps: 820000,
          totalCalories: 28900,
          color: '#FF9800',
          createdBy: 'user8',
          createdAt: new Date()
        },
        {
          id: 'team4',
          name: 'Weight Loss Journey',
          description: 'Supporting each other on our weight loss goals',
          members: ['user10', 'user11', 'user12', 'user13'],
          totalSteps: 650000,
          totalCalories: 45800,
          color: '#9C27B0',
          createdBy: 'user10',
          createdAt: new Date()
        },
        {
          id: 'team5',
          name: 'Morning Joggers',
          description: 'Early birds who love to jog at sunrise',
          members: ['user14', 'user15', 'user16'],
          totalSteps: 750000,
          totalCalories: 32400,
          color: '#F44336',
          createdBy: 'user14',
          createdAt: new Date()
        }
      ];
      
      setPublicTeams(mockPublicTeams);
    } catch (error) {
      console.error('Error loading teams data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleJoinTeam = async (teamId: string) => {
    try {
      const success = await communityService.joinTeam(teamId);
      
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Refresh the teams list
        loadData();
      }
    } catch (error) {
      console.error('Error joining team:', error);
    }
  };

  const filterTeams = (teams: Team[]) => {
    if (!searchQuery) return teams;
    
    return teams.filter(team => 
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team.description && team.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const renderTeamItem = ({ item }: { item: Team }) => {
    const isUserMember = item.members.includes(auth.currentUser?.uid || '');
    
    return (
      <TouchableOpacity
        style={[styles.teamItem, { borderLeftColor: item.color }]}
        onPress={() => navigation.navigate('team-detail', { teamId: item.id })}
      >
        <View style={styles.teamHeader}>
          <View style={[styles.teamIcon, { backgroundColor: item.color + '20' }]}>
            <Text style={[styles.teamIconText, { color: item.color }]}>
              {item.name.substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>{item.name}</Text>
            <Text style={styles.teamMembers}>{item.members.length} members</Text>
          </View>
        </View>
        
        {item.description && (
          <Text style={styles.teamDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        
        <View style={styles.teamStats}>
          <View style={styles.teamStat}>
            <Ionicons name="footsteps-outline" size={16} color="#666" />
            <Text style={styles.teamStatValue}>{item.totalSteps.toLocaleString()}</Text>
          </View>
          <View style={styles.teamStat}>
            <Ionicons name="flame-outline" size={16} color="#666" />
            <Text style={styles.teamStatValue}>{item.totalCalories.toLocaleString()}</Text>
          </View>
        </View>
        
        {activeTab === 'discover' && !isUserMember && (
          <TouchableOpacity
            style={[styles.joinButton, { backgroundColor: item.color }]}
            onPress={() => handleJoinTeam(item.id)}
          >
            <Text style={styles.joinButtonText}>Join Team</Text>
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
        
        <Text style={styles.headerTitle}>Teams</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('create-team')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search teams..."
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
          style={[styles.tab, activeTab === 'my-teams' && styles.activeTab]}
          onPress={() => setActiveTab('my-teams')}
        >
          <Text style={[styles.tabText, activeTab === 'my-teams' && styles.activeTabText]}>
            My Teams
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
      
      {/* Teams List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading teams...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'my-teams' ? (
            <FlatList
              data={filterTeams(userTeams)}
              keyExtractor={(item) => item.id}
              renderItem={renderTeamItem}
              contentContainerStyle={styles.teamsList}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-circle-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyTitle}>No Teams Yet</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery 
                      ? `No teams found matching "${searchQuery}"`
                      : "You haven't joined any teams yet. Create a new team or join an existing one."}
                  </Text>
                  <TouchableOpacity
                    style={styles.createTeamButton}
                    onPress={() => navigation.navigate('create-team')}
                  >
                    <Text style={styles.createTeamButtonText}>Create a Team</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          ) : (
            <FlatList
              data={filterTeams(publicTeams)}
              keyExtractor={(item) => item.id}
              renderItem={renderTeamItem}
              contentContainerStyle={styles.teamsList}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyTitle}>No Teams Found</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery 
                      ? `No teams found matching "${searchQuery}"`
                      : "There are no teams available to join right now. Try again later or create your own team."}
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
  teamsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  teamItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  teamIconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  teamMembers: {
    fontSize: 14,
    color: '#666',
  },
  teamDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  teamStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  teamStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamStatValue: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
    color: '#666',
  },
  joinButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-end',
    marginTop: 12,
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
  createTeamButton: {
    backgroundColor: '#6200ee',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  createTeamButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});