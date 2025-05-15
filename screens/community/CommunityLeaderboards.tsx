import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Image,
    Animated,
    Dimensions,
    SafeAreaView,
    ActivityIndicator,
    RefreshControl,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { auth } from '../../app/firebaseConfig';
import communityService, { CommunityUser } from '../../services/communityService';

const { width } = Dimensions.get('window');

export default function CommunityLeaderboards({ navigation }: { navigation: any }) {
    // State variables
    const [activeTab, setActiveTab] = useState<'global' | 'local' | 'friends' | 'challenges' | 'teams'>('global');
    const [selectedMetric, setSelectedMetric] = useState<'steps' | 'calories' | 'distance' | 'minutes'>('steps');
    const [globalUsers, setGlobalUsers] = useState<CommunityUser[]>([]);
    const [localUsers, setLocalUsers] = useState<CommunityUser[]>([]);
    const [friends, setFriends] = useState<CommunityUser[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [challenges, setChallenges] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<CommunityUser | null>(null);
    const [userRank, setUserRank] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [locationName, setLocationName] = useState<string>('');

    // Animation values
    const scrollY = useRef(new Animated.Value(0)).current;
    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [1, 0.9],
        extrapolate: 'clamp',
    });
    const rankingScale = useRef(new Animated.Value(1)).current;

    const metricToProperty: Record<string, keyof CommunityUser> = {
        'steps': 'totalSteps',
        'calories': 'totalCalories',
        'distance': 'totalDistance',
        'minutes': 'totalActiveMinutes'
    };

    // Fetch teams
    const fetchTeams = async () => {
        try {
            const teamsList = await communityService.getUserTeams();
            setTeams(teamsList);
        } catch (error) {
            console.error("Error fetching teams:", error);
        }
    };

    // Location permission and retrieval
    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.log('Permission to access location was denied');
                    return;
                }

                let currentLocation = await Location.getCurrentPositionAsync({});
                setLocation(currentLocation);

                // Get location name
                if (currentLocation) {
                    let geoCode = await Location.reverseGeocodeAsync({
                        latitude: currentLocation.coords.latitude,
                        longitude: currentLocation.coords.longitude,
                    });

                    if (geoCode.length > 0) {
                        const { city, region } = geoCode[0];
                        setLocationName(city && region ? `${city}, ${region}` : 'Your Area');
                    }
                }
            } catch (error) {
                console.error("Error getting location:", error);
            }
        })();
    }, []);

    // Load user data and set up realtime listeners
    useEffect(() => {
        loadData();
    }, [auth.currentUser, location]);

    const loadData = async () => {
        if (!auth.currentUser) return;

        try {
            // Get current user data
            const userData = await communityService.getUserData(auth.currentUser.uid);
            setCurrentUser(userData);

            // Fetch leaderboards
            fetchGlobalLeaderboards();
            fetchFriends();

            try {
                await fetchTeams();
            } catch (error) {
                console.error("Error in fetchTeams:", error);
            }

            try {
                await fetchChallenges();
            } catch (error) {
                console.error("Error in fetchChallenges:", error);
            }

            // If location is available, fetch local leaderboards
            if (location) {
                fetchLocalLeaderboards();
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    // Calculate user tier based on step count
    const calculateTier = (steps: number): string => {
        if (steps >= 1000000) return 'Diamond';
        if (steps >= 500000) return 'Platinum';
        if (steps >= 100000) return 'Gold';
        if (steps >= 50000) return 'Silver';
        if (steps >= 10000) return 'Bronze';
        return 'Rookie';
    };

    // Fetch global leaderboards
    const fetchGlobalLeaderboards = async () => {
        try {
            setLoading(true);

            const usersData = await communityService.getGlobalLeaderboard(selectedMetric, 100);
            setGlobalUsers(usersData);

            // Find the user's rank
            if (auth.currentUser) {
                const userIndex = usersData.findIndex(user => user.id === auth.currentUser?.uid);
                if (userIndex !== -1) {
                    setUserRank(userIndex + 1);
                    pulseRankAnimation();
                }
            }
        } catch (error) {
            console.error("Error fetching global leaderboards:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Animate the ranking number when it changes
    const pulseRankAnimation = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.sequence([
            Animated.timing(rankingScale, {
                toValue: 1.2,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(rankingScale, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    // Fetch local leaderboards based on user's location
    const fetchLocalLeaderboards = async () => {
        if (!location) return;

        try {
            const { latitude, longitude } = location.coords;
            const nearbyUsers = await communityService.getLocalLeaderboard(
                latitude,
                longitude,
                selectedMetric,
                50 // 50km radius
            );

            setLocalUsers(nearbyUsers);
        } catch (error) {
            console.error("Error fetching local leaderboards:", error);
        }
    };

    // Fetch user's friends
    const fetchFriends = async () => {
        try {
            const friendsData = await communityService.getFriendsData();

            // Get the property name for the selected metric
            const propertyName = metricToProperty[selectedMetric];

            // Sort by selected metric using the property name
            friendsData.sort((a, b) => {
                const aValue = a[propertyName] as number;
                const bValue = b[propertyName] as number;
                return bValue - aValue;
            });

            setFriends(friendsData);
        } catch (error) {
            console.error("Error fetching friends:", error);
        }
    };

    // Fetch challenges
    const fetchChallenges = async () => {
        try {
            const challengesList = await communityService.getUserChallenges();

            // Sort challenges: active first, then by end date
            challengesList.sort((a, b) => {
                if (a.status === 'active' && b.status !== 'active') return -1;
                if (a.status !== 'active' && b.status === 'active') return 1;
                return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
            });

            setChallenges(challengesList);
        } catch (error) {
            console.error("Error fetching challenges:", error);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // Helper function to capitalize first letter
    const capitalizeFirstLetter = (string: string) => {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    // Get metric value as a formatted string
    const getMetricValueString = (item: CommunityUser) => {
        if (!item) {
            return 'N/A';
        }

        switch (selectedMetric) {
            case 'steps':
                return `${(item.totalSteps || 0).toLocaleString()} steps`;
            case 'calories':
                return `${(item.totalCalories || 0).toLocaleString()} kcal`;
            case 'distance':
                return `${(item.totalDistance || 0).toLocaleString()} m`;
            case 'minutes':
                return `${(item.totalActiveMinutes || 0).toLocaleString()} mins`;
            default:
                return 'N/A';
        }
    };

    // Render a rank badge with special styles for top 3
    const renderRankBadge = (rank: number) => {
        if (rank === 1) {
            return (
                <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.topRankBadge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.topRankText}>1</Text>
                </LinearGradient>
            );
        } else if (rank === 2) {
            return (
                <LinearGradient
                    colors={['#C0C0C0', '#A9A9A9']}
                    style={styles.topRankBadge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.topRankText}>2</Text>
                </LinearGradient>
            );
        } else if (rank === 3) {
            return (
                <LinearGradient
                    colors={['#CD7F32', '#8B4513']}
                    style={styles.topRankBadge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.topRankText}>3</Text>
                </LinearGradient>
            );
        } else {
            return (
                <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{rank}</Text>
                </View>
            );
        }
    };

    // Render a user item in the leaderboard - ADDITIONAL FIXES HERE
    const renderUserItem = ({ item, index }: { item: CommunityUser; index: number }) => {
        // CRITICAL: Must handle null/undefined items or properties
        if (!item) {
            return (
                <View style={styles.userItem}>
                    <Text>Invalid item</Text>
                </View>
            );
        }

        // Pre-compute all values at the top of the function
        const isCurrentUser = item.id === auth.currentUser?.uid;
        const rank = index + 1;
        const displayName = item.displayName || 'Unknown';
        const avatarLetter = displayName[0]?.toUpperCase() || '?';
        const tier = item.tier || '';
        
        const locationCity = item.location?.city || '';
        const hasLocation = !!locationCity; // Using double negation to convert to boolean
        const hasStreak = !!item.streak && item.streak >= 3;
        const streakValue = item.streak || 0;
        const metricText = getMetricValueString(item);

        // Now build the JSX with pre-computed values
        return (
            <TouchableOpacity
                style={[
                    styles.userItem,
                    isCurrentUser && styles.currentUserItem
                ]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    // In a real app, navigate to user profile
                }}
            >
                <View style={styles.userItemLeft}>
                    {renderRankBadge(rank)}

                    <View style={styles.avatarContainer}>
                        {item.avatar ? (
                            <Image source={{ uri: item.avatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.defaultAvatar, { backgroundColor: isCurrentUser ? '#6200ee' : '#e0e0e0' }]}>
                                <Text style={styles.avatarText}>{avatarLetter}</Text>
                            </View>
                        )}
                        {hasStreak && (
                            <View style={styles.streakBadge}>
                                <Text style={styles.streakText}>🔥 {streakValue}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.userInfo}>
                        <Text style={[styles.userName, isCurrentUser && styles.currentUserText]}>
                            {displayName} {isCurrentUser ? '(You)' : ''}
                        </Text>
                        <View style={styles.userMetaContainer}>
                            <Text style={styles.userTier}>{tier}</Text>
                            {hasLocation && (
                                <Text style={styles.userLocation}> • {locationCity}</Text>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.userItemRight}>
                    <Text style={[styles.metricValue, isCurrentUser && styles.currentUserMetric]}>
                        {metricText}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // Component to show top 3 users in a visually appealing way - ADDITIONAL FIXES HERE
    const renderPodium = (users: CommunityUser[]) => {
        if (!users || users.length < 3) return null;

        // Validate users exist
        const user1 = users[0] || {};
        const user2 = users[1] || {};
        const user3 = users[2] || {};

        // Pre-compute all the values needed
        const propertyName = metricToProperty[selectedMetric];

        const user1Name = user1.displayName || 'Unknown';
        const user1Value = ((user1[propertyName] as number) || 0).toLocaleString();
        const user1Avatar = user1.avatar || null;
        const user1Letter = user1Name[0]?.toUpperCase() || '?';

        const user2Name = user2.displayName || 'Unknown';
        const user2Value = ((user2[propertyName] as number) || 0).toLocaleString();
        const user2Avatar = user2.avatar || null;
        const user2Letter = user2Name[0]?.toUpperCase() || '?';

        const user3Name = user3.displayName || 'Unknown';
        const user3Value = ((user3[propertyName] as number) || 0).toLocaleString();
        const user3Avatar = user3.avatar || null;
        const user3Letter = user3Name[0]?.toUpperCase() || '?';

        return (
            <View style={styles.podiumContainer}>
                {/* Second Place */}
                <View style={styles.podiumSecond}>
                    <View style={styles.podiumAvatarContainer}>
                        {user2Avatar ? (
                            <Image source={{ uri: user2Avatar }} style={styles.podiumAvatar} />
                        ) : (
                            <View style={styles.podiumDefaultAvatar}>
                                <Text style={styles.podiumAvatarText}>{user2Letter}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.podiumNameContainer}>
                        <Text style={styles.podiumName}>{user2Name}</Text>
                        <Text style={styles.podiumValue}>{user2Value}</Text>
                    </View>
                    <View style={[styles.podiumBase, styles.podiumSecondBase]}>
                        <Text style={styles.podiumRank}>2</Text>
                    </View>
                </View>

                {/* First Place */}
                <View style={styles.podiumFirst}>
                    <LinearGradient
                        colors={['#FFD700', '#FFA500']}
                        style={styles.podiumCrown}
                    >
                        <Ionicons name="trophy" size={20} color="#fff" />
                    </LinearGradient>
                    <View style={styles.podiumAvatarContainer}>
                        {user1Avatar ? (
                            <Image source={{ uri: user1Avatar }} style={styles.podiumAvatar} />
                        ) : (
                            <View style={[styles.podiumDefaultAvatar, styles.podiumFirstAvatar]}>
                                <Text style={styles.podiumAvatarText}>{user1Letter}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.podiumNameContainer}>
                        <Text style={[styles.podiumName, styles.podiumFirstName]}>{user1Name}</Text>
                        <Text style={[styles.podiumValue, styles.podiumFirstValue]}>{user1Value}</Text>
                    </View>
                    <View style={[styles.podiumBase, styles.podiumFirstBase]}>
                        <Text style={styles.podiumRank}>1</Text>
                    </View>
                </View>

                {/* Third Place */}
                <View style={styles.podiumThird}>
                    <View style={styles.podiumAvatarContainer}>
                        {user3Avatar ? (
                            <Image source={{ uri: user3Avatar }} style={styles.podiumAvatar} />
                        ) : (
                            <View style={styles.podiumDefaultAvatar}>
                                <Text style={styles.podiumAvatarText}>{user3Letter}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.podiumNameContainer}>
                        <Text style={styles.podiumName}>{user3Name}</Text>
                        <Text style={styles.podiumValue}>{user3Value}</Text>
                    </View>
                    <View style={[styles.podiumBase, styles.podiumThirdBase]}>
                        <Text style={styles.podiumRank}>3</Text>
                    </View>
                </View>
            </View>
        );
    };

    // Render metric selector
    const renderMetricSelector = () => {
        return (
            <View style={styles.metricSelector}>
                <TouchableOpacity
                    style={[styles.metricButton, selectedMetric === 'steps' && styles.selectedMetric]}
                    onPress={() => {
                        setSelectedMetric('steps');
                        fetchGlobalLeaderboards();
                    }}
                >
                    <Ionicons
                        name="footsteps-outline"
                        size={18}
                        color={selectedMetric === 'steps' ? '#fff' : '#333'}
                    />
                    <Text
                        style={[
                            styles.metricButtonText,
                            selectedMetric === 'steps' && styles.selectedMetricText
                        ]}
                    >
                        Steps
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.metricButton, selectedMetric === 'calories' && styles.selectedMetric]}
                    onPress={() => {
                        setSelectedMetric('calories');
                        fetchGlobalLeaderboards();
                    }}
                >
                    <Ionicons
                        name="flame-outline"
                        size={18}
                        color={selectedMetric === 'calories' ? '#fff' : '#333'}
                    />
                    <Text
                        style={[
                            styles.metricButtonText,
                            selectedMetric === 'calories' && styles.selectedMetricText
                        ]}
                    >
                        Calories
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.metricButton, selectedMetric === 'distance' && styles.selectedMetric]}
                    onPress={() => {
                        setSelectedMetric('distance');
                        fetchGlobalLeaderboards();
                    }}
                >
                    <Ionicons
                        name="map-outline"
                        size={18}
                        color={selectedMetric === 'distance' ? '#fff' : '#333'}
                    />
                    <Text
                        style={[
                            styles.metricButtonText,
                            selectedMetric === 'distance' && styles.selectedMetricText
                        ]}
                    >
                        Distance
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.metricButton, selectedMetric === 'minutes' && styles.selectedMetric]}
                    onPress={() => {
                        setSelectedMetric('minutes');
                        fetchGlobalLeaderboards();
                    }}
                >
                    <Ionicons
                        name="time-outline"
                        size={18}
                        color={selectedMetric === 'minutes' ? '#fff' : '#333'}
                    />
                    <Text
                        style={[
                            styles.metricButtonText,
                            selectedMetric === 'minutes' && styles.selectedMetricText
                        ]}
                    >
                        Minutes
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Render global tab content - FLATLIST FIXES HERE
    const renderGlobalTab = () => {
        // Add null check and filter out any null items
        const displayUsers = globalUsers?.filter(item => item != null)?.slice(0, 50) || [];

        return (
            <View style={styles.tabContent}>
                {displayUsers.length >= 3 && renderPodium(displayUsers)}

                <View style={styles.leaderboardContainer}>
                    <FlatList
                        data={displayUsers.length >= 3 ? displayUsers.slice(3) : []}
                        keyExtractor={(item) => item?.id || Math.random().toString()} // Add fallback
                        renderItem={(props) => {
                            if (!props.item) return <View><Text>Loading...</Text></View>;
                            return renderUserItem(props);
                        }}
                        contentContainerStyle={styles.leaderboardList}
                        ListHeaderComponent={<Text style={styles.leaderboardTitle}>Global Leaderboard</Text>}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>No data available</Text>
                        }
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                        }
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: false }
                        )}
                        scrollEventThrottle={16}
                    />
                </View>
            </View>
        );
    };

    // Render local tab content - FLATLIST FIXES HERE
    const renderLocalTab = () => {
        // Apply filter to remove null values
        const filteredLocalUsers = localUsers?.filter(item => item != null) || [];

        return (
            <View style={styles.tabContent}>
                <View style={styles.localHeaderContainer}>
                    <Text style={styles.localTitle}>
                        {locationName ? `Leaderboard in ${locationName}` : 'Local Leaderboard'}
                    </Text>
                    {location && (
                        <TouchableOpacity
                            style={styles.refreshLocationButton}
                            onPress={() => fetchLocalLeaderboards()}
                        >
                            <Ionicons name="refresh" size={20} color="#6200ee" />
                        </TouchableOpacity>
                    )}
                </View>

                {!location && (
                    <View style={styles.locationPermission}>
                        <Ionicons name="location-outline" size={30} color="#999" />
                        <Text style={styles.locationText}>
                            Please enable location permissions to see local leaderboards
                        </Text>
                    </View>
                )}

                {location && filteredLocalUsers.length >= 3 && renderPodium(filteredLocalUsers)}

                {location && (
                    <View style={styles.leaderboardContainer}>
                        <FlatList
                            data={filteredLocalUsers.length >= 3 ? filteredLocalUsers.slice(3) : []}
                            keyExtractor={(item) => item?.id || Math.random().toString()}
                            renderItem={(props) => {
                                if (!props.item) return <View><Text>Loading...</Text></View>;
                                return renderUserItem(props);
                            }}
                            contentContainerStyle={styles.leaderboardList}
                            ListHeaderComponent={<Text style={styles.leaderboardTitle}>Nearby Competitors</Text>}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>No nearby users found</Text>
                            }
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                            }
                            onScroll={Animated.event(
                                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                                { useNativeDriver: false }
                            )}
                            scrollEventThrottle={16}
                        />
                    </View>
                )}
            </View>
        );
    };

    // Render friends tab content - FLATLIST FIXES HERE
    const renderFriendsTab = () => {
        // Apply filter to remove null values
        const filteredFriends = friends?.filter(item => item != null) || [];

        return (
            <View style={styles.tabContent}>
                {filteredFriends.length > 0 ? (
                    <View style={styles.leaderboardContainer}>
                        <FlatList
                            data={filteredFriends}
                            keyExtractor={(item) => item?.id || Math.random().toString()}
                            renderItem={(props) => {
                                if (!props.item) return <View><Text>Loading...</Text></View>;
                                return renderUserItem(props);
                            }}
                            contentContainerStyle={styles.leaderboardList}
                            ListHeaderComponent={<Text style={styles.leaderboardTitle}>Friends Leaderboard</Text>}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>No friends added yet</Text>
                            }
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                            }
                            onScroll={Animated.event(
                                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                                { useNativeDriver: false }
                            )}
                            scrollEventThrottle={16}
                        />

                        <TouchableOpacity
                            style={styles.addFriendsButton}
                            onPress={() => navigation.navigate('friend-search')}
                        >
                            <Ionicons name="person-add-outline" size={20} color="#fff" />
                            <Text style={styles.addFriendsButtonText}>Add Friends</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.noFriendsContainer}>
                        <Ionicons name="people-outline" size={50} color="#ccc" />
                        <Text style={styles.noFriendsTitle}>No Friends Yet</Text>
                        <Text style={styles.noFriendsText}>
                            Add friends to compare your progress and compete together
                        </Text>
                        <TouchableOpacity
                            style={styles.addFriendsButton}
                            onPress={() => navigation.navigate('friend-search')}
                        >
                            <Text style={styles.addFriendsButtonText}>Find Friends</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // Render challenges tab content - FLATLIST FIXES HERE
    const renderChallengesTab = () => {
        // Filter out null values and only keep active challenges
        const activeChallenges = challenges?.filter(c => c && c.status === 'active') || [];

        return (
            <View style={styles.tabContent}>
                {activeChallenges.length > 0 ? (
                    <View style={styles.challengesContainer}>
                        <FlatList
                            data={activeChallenges}
                            keyExtractor={(item) => item?.id || Math.random().toString()}
                            ListHeaderComponent={<Text style={styles.leaderboardTitle}>Your Active Challenges</Text>}
                            renderItem={({ item }) => {
                                if (!item) return <View><Text>Loading...</Text></View>;

                                // Pre-compute all values
                                const title = item.title || '';
                                const startDate = new Date(item.startDate).toLocaleDateString();
                                const endDate = new Date(item.endDate).toLocaleDateString();
                                const metric = item.metric || '';
                                const metricCapitalized = capitalizeFirstLetter(metric);
                                const participantsCount = (item.participants?.length || 0);
                                const iconName =
                                    metric === 'steps' ? 'footsteps-outline' :
                                        metric === 'calories' ? 'flame-outline' :
                                            metric === 'distance' ? 'map-outline' : 'time-outline';

                                return (
                                    <TouchableOpacity
                                        style={styles.challengeItem}
                                        onPress={() => navigation.navigate('challenge-detail', { challengeId: item.id })}
                                    >
                                        <Text style={styles.challengeTitle}>{title}</Text>
                                        <Text style={styles.challengeDate}>
                                            {startDate} - {endDate}
                                        </Text>
                                        <View style={styles.challengeMetrics}>
                                            <View style={styles.challengeMetric}>
                                                <Ionicons
                                                    name={iconName}
                                                    size={16}
                                                    color="#6200ee"
                                                />
                                                <Text style={styles.challengeMetricText}>{metricCapitalized}</Text>
                                            </View>
                                            <View style={styles.challengeMetric}>
                                                <Ionicons name="people-outline" size={16} color="#6200ee" />
                                                <Text style={styles.challengeMetricText}>
                                                    {participantsCount} participants
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>No active challenges</Text>
                            }
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                            }
                            onScroll={Animated.event(
                                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                                { useNativeDriver: false }
                            )}
                            scrollEventThrottle={16}
                        />

                        <TouchableOpacity
                            style={styles.viewAllButton}
                            onPress={() => navigation.navigate('challenges')}
                        >
                            <Text style={styles.viewAllButtonText}>View All Challenges</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.noChallengesContainer}>
                        <Ionicons name="trophy-outline" size={50} color="#ccc" />
                        <Text style={styles.noChallengesTitle}>No Active Challenges</Text>
                        <Text style={styles.noChallengesText}>
                            Join a challenge to compete with others and track your progress
                        </Text>
                        <TouchableOpacity
                            style={styles.joinChallengeButton}
                            onPress={() => navigation.navigate('challenges')}
                        >
                            <Text style={styles.joinChallengeButtonText}>Browse Challenges</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // Render teams tab content - FLATLIST FIXES HERE
    const renderTeamsTab = () => {
        // Filter out null values
        const filteredTeams = teams?.filter(item => item != null) || [];

        return (
            <View style={styles.tabContent}>
                {filteredTeams.length > 0 ? (
                    <View style={styles.teamsContainer}>
                        <FlatList
                            data={filteredTeams}
                            keyExtractor={(item) => item?.id || Math.random().toString()}
                            ListHeaderComponent={<Text style={styles.leaderboardTitle}>Your Teams</Text>}
                            renderItem={({ item }) => {
                                if (!item) return <View><Text>Loading...</Text></View>;

                                // Pre-compute all values
                                const teamName = item.name || '';
                                const teamInitials = teamName.substring(0, 2).toUpperCase();
                                const teamColor = item.color || '#cccccc';
                                const memberCount = (item.members?.length || 0);
                                const totalSteps = (item.totalSteps || 0).toLocaleString();
                                const totalCalories = (item.totalCalories || 0).toLocaleString();

                                return (
                                    <TouchableOpacity
                                        style={[styles.teamItem, { borderLeftColor: teamColor }]}
                                        onPress={() => navigation.navigate('team-detail', { teamId: item.id })}
                                    >
                                        <View style={styles.teamHeader}>
                                            <View style={[styles.teamIcon, { backgroundColor: teamColor + '20' }]}>
                                                <Text style={[styles.teamIconText, { color: teamColor }]}>
                                                    {teamInitials}
                                                </Text>
                                            </View>
                                            <View style={styles.teamInfo}>
                                                <Text style={styles.teamName}>{teamName}</Text>
                                                <Text style={styles.teamMembers}>{memberCount} members</Text>
                                            </View>
                                        </View>
                                        <View style={styles.teamStats}>
                                            <View style={styles.teamStat}>
                                                <Ionicons name="footsteps-outline" size={16} color="#666" />
                                                <Text style={styles.teamStatValue}>{totalSteps}</Text>
                                            </View>
                                            <View style={styles.teamStat}>
                                                <Ionicons name="flame-outline" size={16} color="#666" />
                                                <Text style={styles.teamStatValue}>{totalCalories}</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>No teams found</Text>
                            }
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                            }
                            onScroll={Animated.event(
                                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                                { useNativeDriver: false }
                            )}
                            scrollEventThrottle={16}
                        />

                        <View style={styles.teamButtons}>
                            <TouchableOpacity
                                style={styles.viewAllTeamsButton}
                                onPress={() => navigation.navigate('teams')}
                            >
                                <Text style={styles.viewAllTeamsButtonText}>View All Teams</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.createTeamButton}
                                onPress={() => navigation.navigate('create-team')}
                            >
                                <Text style={styles.createTeamButtonText}>Create Team</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.noTeamsContainer}>
                        <Ionicons name="people-circle-outline" size={50} color="#ccc" />
                        <Text style={styles.noTeamsTitle}>No Teams Yet</Text>
                        <Text style={styles.noTeamsText}>
                            Create or join a team to compete together with friends
                        </Text>
                        <TouchableOpacity
                            style={styles.createTeamButton}
                            onPress={() => navigation.navigate('create-team')}
                        >
                            <Text style={styles.createTeamButtonText}>Create a Team</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* App Bar */}
            <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
                <LinearGradient
                    colors={['#6200ee', '#9c64f4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.headerGradient}
                >
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>Community Leaderboards</Text>

                    {/* User ranking info if available */}
                    {userRank !== null && (
                        <View style={styles.userRankContainer}>
                            <Text style={styles.userRankLabel}>Your Rank</Text>
                            <Animated.View
                                style={[
                                    styles.userRankBadge,
                                    { transform: [{ scale: rankingScale }] }
                                ]}
                            >
                                <Text style={styles.userRankText}>#{userRank}</Text>
                            </Animated.View>
                        </View>
                    )}
                </LinearGradient>
            </Animated.View>

            {/* Metric Selector */}
            {renderMetricSelector()}

            {/* Tab Navigation */}
            <View style={styles.tabBar}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabBarContent}
                >
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'global' && styles.activeTab]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveTab('global');
                        }}
                    >
                        <Ionicons
                            name="globe-outline"
                            size={20}
                            color={activeTab === 'global' ? '#6200ee' : '#666'}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'global' && styles.activeTabText
                            ]}
                        >
                            Global
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'local' && styles.activeTab]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveTab('local');
                        }}
                    >
                        <Ionicons
                            name="location-outline"
                            size={20}
                            color={activeTab === 'local' ? '#6200ee' : '#666'}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'local' && styles.activeTabText
                            ]}
                        >
                            Local
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveTab('friends');
                        }}
                    >
                        <Ionicons
                            name="people-outline"
                            size={20}
                            color={activeTab === 'friends' ? '#6200ee' : '#666'}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'friends' && styles.activeTabText
                            ]}
                        >
                            Friends
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'challenges' && styles.activeTab]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveTab('challenges');
                        }}
                    >
                        <Ionicons
                            name="trophy-outline"
                            size={20}
                            color={activeTab === 'challenges' ? '#6200ee' : '#666'}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'challenges' && styles.activeTabText
                            ]}
                        >
                            Challenges
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'teams' && styles.activeTab]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveTab('teams');
                        }}
                    >
                        <Ionicons
                            name="people-circle-outline"
                            size={20}
                            color={activeTab === 'teams' ? '#6200ee' : '#666'}
                        />
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'teams' && styles.activeTabText
                            ]}
                        >
                            Teams
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Content based on active tab */}
            <View style={styles.container}>
                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6200ee" />
                        <Text style={styles.loadingText}>Loading leaderboards...</Text>
                    </View>
                ) : (
                    <>
                        {activeTab === 'global' && renderGlobalTab()}
                        {activeTab === 'local' && renderLocalTab()}
                        {activeTab === 'friends' && renderFriendsTab()}
                        {activeTab === 'challenges' && renderChallengesTab()}
                        {activeTab === 'teams' && renderTeamsTab()}
                    </>
                )}
            </View>

            {/* Activity Feed Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    navigation.navigate('activity-feed');
                }}
            >
                <Ionicons name="notifications-outline" size={24} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    container: {
        flex: 1,
    },
    header: {
        width: '100%',
        backgroundColor: '#6200ee',
    },
    headerGradient: {
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
    },
    userRankContainer: {
        alignItems: 'center',
    },
    userRankLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 4,
    },
    userRankBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    userRankText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    metricSelector: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    },
    metricButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 20,
        marginHorizontal: 4,
    },
    selectedMetric: {
        backgroundColor: '#6200ee',
    },
    metricButtonText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 4,
        color: '#333',
    },
    selectedMetricText: {
        color: '#fff',
    },
    tabBar: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        paddingVertical: 0,
    },
    tabBarContent: {
        paddingHorizontal: 8,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#6200ee',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 6,
        color: '#666',
    },
    activeTabText: {
        color: '#6200ee',
        fontWeight: 'bold',
    },
    tabContent: {
        flex: 1,
        paddingBottom: 80, // Extra padding for FAB
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        height: 300,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    podiumContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: 10,
        paddingTop: 20,
        paddingBottom: 30,
        backgroundColor: '#fff',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    podiumFirst: {
        alignItems: 'center',
        zIndex: 3,
    },
    podiumSecond: {
        alignItems: 'center',
        marginRight: 10,
        marginTop: 30,
        zIndex: 2,
    },
    podiumThird: {
        alignItems: 'center',
        marginLeft: 10,
        marginTop: 50,
        zIndex: 1,
    },
    podiumCrown: {
        padding: 5,
        borderRadius: 15,
        marginBottom: 5,
    },
    podiumAvatarContainer: {
        marginBottom: 5,
    },
    podiumAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#fff',
    },
    podiumDefaultAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    podiumFirstAvatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderColor: '#FFD700',
        borderWidth: 3,
    },
    podiumAvatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    podiumNameContainer: {
        alignItems: 'center',
        marginBottom: 10,
        width: 80,
    },
    podiumName: {
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 2,
    },
    podiumFirstName: {
        fontSize: 14,
    },
    podiumValue: {
        fontSize: 10,
        color: '#666',
    },
    podiumFirstValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
    },
    podiumBase: {
        width: 70,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderTopLeftRadius: 5,
        borderTopRightRadius: 5,
    },
    podiumFirstBase: {
        backgroundColor: '#FFD700',
        width: 80,
        height: 40,
    },
    podiumSecondBase: {
        backgroundColor: '#C0C0C0',
    },
    podiumThirdBase: {
        backgroundColor: '#CD7F32',
    },
    podiumRank: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    leaderboardContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        marginHorizontal: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    challengesContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        marginHorizontal: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        padding: 16,
    },
    teamsContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        marginHorizontal: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        padding: 16,
    },
    leaderboardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        padding: 16,
        color: '#333',
    },
    leaderboardList: {
        paddingBottom: 16,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        padding: 20,
        fontStyle: 'italic',
    },
    userItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    currentUserItem: {
        backgroundColor: 'rgba(98, 0, 238, 0.05)',
    },
    userItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rankBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    topRankBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rankText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
    },
    topRankText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    defaultAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    streakBadge: {
        position: 'absolute',
        bottom: -5,
        right: 8,
        backgroundColor: '#ff9800',
        borderRadius: 10,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    streakText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 2,
    },
    currentUserText: {
        fontWeight: 'bold',
        color: '#6200ee',
    },
    userMetaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userTier: {
        fontSize: 12,
        color: '#666',
    },
    userLocation: {
        fontSize: 12,
        color: '#999',
    },
    userItemRight: {},
    metricValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    currentUserMetric: {
        color: '#6200ee',
        fontWeight: 'bold',
    },
    localHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    localTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    refreshLocationButton: {
        padding: 8,
    },
    locationPermission: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    locationText: {
        textAlign: 'center',
        marginTop: 10,
        color: '#666',
    },
    noFriendsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
        marginTop: 50,
    },
    noFriendsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
        color: '#333',
    },
    noFriendsText: {
        textAlign: 'center',
        color: '#666',
        marginBottom: 20,
    },
    addFriendsButton: {
        backgroundColor: '#6200ee',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginHorizontal: 16,
        marginBottom: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    addFriendsButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    challengeItem: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    challengeTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    challengeDate: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
    },
    challengeMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    challengeMetric: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    challengeMetricText: {
        fontSize: 12,
        color: '#666',
        marginLeft: 4,
    },
    noChallengesContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
        marginTop: 50,
    },
    noChallengesTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
        color: '#333',
    },
    noChallengesText: {
        textAlign: 'center',
        color: '#666',
        marginBottom: 20,
    },
    joinChallengeButton: {
        backgroundColor: '#6200ee',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    joinChallengeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    teamItem: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderLeftWidth: 5,
    },
    teamHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    teamIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    teamIconText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    teamInfo: {
        flex: 1,
    },
    teamName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    teamMembers: {
        fontSize: 12,
        color: '#666',
    },
    teamStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 8,
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
    },
    teamButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    viewAllTeamsButton: {
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flex: 1,
        marginRight: 8,
        alignItems: 'center',
    },
    viewAllTeamsButtonText: {
        color: '#333',
        fontWeight: '500',
    },
    createTeamButton: {
        backgroundColor: '#6200ee',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flex: 1,
        marginLeft: 8,
        alignItems: 'center',
    },
    createTeamButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    noTeamsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
        marginTop: 50,
    },
    noTeamsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
        color: '#333',
    },
    noTeamsText: {
        textAlign: 'center',
        color: '#666',
        marginBottom: 20,
    },
    viewAllButton: {
        backgroundColor: '#6200ee',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginTop: 8,
    },
    viewAllButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#6200ee',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
});