import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { auth } from '../../app/firebaseConfig';
import communityService, { CommunityUser, FriendRequest } from '../../services/communityService';

export default function FriendSearchScreen({ navigation }: { navigation: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CommunityUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [friends, setFriends] = useState<CommunityUser[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get user's friends
      const friendsData = await communityService.getFriendsData();
      setFriends(friendsData);
      
      // Get actual friend requests from Firebase (replacing mock data)
      const requestsData = await communityService.getFriendRequests();
      setFriendRequests(requestsData);
      
    } catch (error) {
      console.error('Error loading friends data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    
    try {
      // Use the real search method instead of mock data
      const results = await communityService.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    try {
      const success = await communityService.sendFriendRequest(userId);
      
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Friend request sent');
        
        // Update search results to show request sent
        setSearchResults(prev => 
          prev.map(user => 
            user.id === userId ? { ...user, requestSent: true } : user
          )
        );
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      const success = await communityService.handleFriendRequest(requestId, action);
      
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Update UI
        setFriendRequests(prev => prev.filter(req => req.id !== requestId));
        
        if (action === 'accept') {
          // Reload friends
          loadData();
        }
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
      Alert.alert('Error', `Failed to ${action} friend request`);
    }
  };

  const handleRemoveFriend = (friend: CommunityUser) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.displayName} from your friends?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // In a real app, implement remove friend functionality
            // For now, just update the UI
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setFriends(prev => prev.filter(f => f.id !== friend.id));
          }
        }
      ]
    );
  };

  const renderFriendItem = ({ item }: { item: CommunityUser }) => {
    return (
      <View style={styles.friendItem}>
        <View style={styles.friendInfo}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>{item.displayName[0]?.toUpperCase() || '?'}</Text>
            </View>
          )}
          <View>
            <Text style={styles.friendName}>{item.displayName}</Text>
            <Text style={styles.friendMeta}>{item.tier} • {item.totalSteps.toLocaleString()} steps</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleRemoveFriend(item)}
        >
          <Ionicons name="person-remove-outline" size={20} color="#ff6b6b" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderRequestItem = ({ item }: { item: FriendRequest }) => {
    return (
      <View style={styles.requestItem}>
        <View style={styles.friendInfo}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>{item.displayName[0]?.toUpperCase() || '?'}</Text>
            </View>
          )}
          <Text style={styles.friendName}>{item.displayName}</Text>
        </View>
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={styles.declineButton}
            onPress={() => handleFriendRequest(item.id, 'decline')}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleFriendRequest(item.id, 'accept')}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSearchResultItem = ({ item }: { item: CommunityUser & { requestSent?: boolean } }) => {
    const isFriend = friends.some(friend => friend.id === item.id);
    
    return (
      <View style={styles.searchResultItem}>
        <View style={styles.friendInfo}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>{item.displayName[0]?.toUpperCase() || '?'}</Text>
            </View>
          )}
          <View>
            <Text style={styles.friendName}>{item.displayName}</Text>
            <Text style={styles.friendMeta}>{item.tier} • {item.totalSteps.toLocaleString()} steps</Text>
          </View>
        </View>
        
        {!isFriend && !item.requestSent ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleSendFriendRequest(item.id)}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        ) : isFriend ? (
          <View style={styles.friendBadge}>
            <Text style={styles.friendBadgeText}>Friend</Text>
          </View>
        ) : (
          <View style={styles.requestSentBadge}>
            <Text style={styles.requestSentText}>Requested</Text>
          </View>
        )}
      </View>
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
        
        <Text style={styles.headerTitle}>Friends</Text>
      </LinearGradient>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
        >
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Search Results */}
      {searchQuery && (
        <View style={styles.searchResultsContainer}>
          <Text style={styles.sectionTitle}>Search Results</Text>
          
          {searchLoading ? (
            <ActivityIndicator style={styles.loadingIndicator} size="large" color="#6200ee" />
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderSearchResultItem}
              contentContainerStyle={styles.searchResultsList}
            />
          ) : (
            <Text style={styles.emptyText}>No users found matching "{searchQuery}"</Text>
          )}
        </View>
      )}
      
      {/* Tab Selector */}
      {!searchQuery && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
              Friends ({friends.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Requests ({friendRequests.length})
            </Text>
            {friendRequests.length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{friendRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
      
      {/* Content based on active tab */}
      {!searchQuery && (
        <>
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6200ee" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <>
              {activeTab === 'friends' ? (
                <FlatList
                  data={friends}
                  keyExtractor={(item) => item.id}
                  renderItem={renderFriendItem}
                  contentContainerStyle={styles.listContainer}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                  }
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Ionicons name="people-outline" size={48} color="#ccc" />
                      <Text style={styles.emptyTitle}>No Friends Yet</Text>
                      <Text style={styles.emptyDescription}>
                        Search for users to add them as friends
                      </Text>
                    </View>
                  }
                />
              ) : (
                <FlatList
                  data={friendRequests}
                  keyExtractor={(item) => item.id}
                  renderItem={renderRequestItem}
                  contentContainerStyle={styles.listContainer}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                  }
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Ionicons name="notifications-outline" size={48} color="#ccc" />
                      <Text style={styles.emptyTitle}>No Friend Requests</Text>
                      <Text style={styles.emptyDescription}>
                        You don't have any pending friend requests
                      </Text>
                    </View>
                  }
                />
              )}
            </>
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  searchButton: {
    backgroundColor: '#6200ee',
    borderRadius: 8,
    padding: 12,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  searchResultsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 16,
    paddingBottom: 8,
  },
  loadingIndicator: {
    marginTop: 20,
  },
  searchResultsList: {
    paddingHorizontal: 16,
  },
  searchResultItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    flexDirection: 'row',
    justifyContent: 'center',
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
  notificationBadge: {
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  notificationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  friendItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  requestItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  friendMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  actionButton: {
    padding: 8,
  },
  requestActions: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  declineButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  declineButtonText: {
    color: '#666',
  },
  addButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  friendBadge: {
    backgroundColor: '#e3f2fd',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  friendBadgeText: {
    color: '#1976d2',
    fontWeight: '500',
  },
  requestSentBadge: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  requestSentText: {
    color: '#666',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
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
  emptyDescription: {
    textAlign: 'center',
    color: '#666',
  },
});