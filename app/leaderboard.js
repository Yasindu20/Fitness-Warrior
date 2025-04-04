import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, FlatList, ActivityIndicator } from 'react-native';
import { db } from './firebaseConfig';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

const Leaderboard = () => {
    const [selectedMetric, setSelectedMetric] = useState('totalSteps');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchLeaderboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const q = query(
                collection(db, 'users'),
                orderBy(selectedMetric, 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            const usersData = [];
            
            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                usersData.push({
                    id: doc.id,
                    name: userData.displayName || 'Anonymous',
                    steps: userData.totalSteps || 0,
                    calories: userData.totalCalories ? Number(userData.totalCalories.toFixed(2)) : 0,
                    distance: userData.totalDistance ? Number(userData.totalDistance.toFixed(2)) : 0,
                    minutes: userData.totalActiveMinutes || 0
                });
            });
            
            setUsers(usersData);
        } catch (err) {
            setError('Failed to fetch leaderboard data');
            console.error("Firestore fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboardData();
    }, [selectedMetric]);

    const getMetricDisplay = (user) => {
        switch(selectedMetric) {
            case 'totalSteps':
                return `${user.steps} steps`;
            case 'totalCalories':
                return `${user.calories} kcal`;
            case 'totalDistance':
                return `${user.distance}m`;
            case 'totalActiveMinutes':
                return `${user.minutes} mins`;
            default:
                return '';
        }
    };

    const renderItem = ({ item, index }) => (
        <View style={styles.leaderboardItem}>
            <Text style={styles.rank}>#{index + 1}</Text>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.metricValue}>{getMetricDisplay(item)}</Text>
            </View>
        </View>
    );

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={fetchLeaderboardData} style={styles.retryButton}>
                    <Text style={styles.retryText}>Try Again</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>🏆 Fitness Leaderboard</Text>
            
            <View style={styles.metricSelector}>
                <TouchableOpacity
                    style={[styles.metricButton, selectedMetric === 'totalSteps' && styles.selectedMetric]}
                    onPress={() => setSelectedMetric('totalSteps')}
                >
                    <Text style={styles.metricButtonText}>Steps</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={[styles.metricButton, selectedMetric === 'totalCalories' && styles.selectedMetric]}
                    onPress={() => setSelectedMetric('totalCalories')}
                >
                    <Text style={styles.metricButtonText}>Calories</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={[styles.metricButton, selectedMetric === 'totalDistance' && styles.selectedMetric]}
                    onPress={() => setSelectedMetric('totalDistance')}
                >
                    <Text style={styles.metricButtonText}>Distance</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={[styles.metricButton, selectedMetric === 'totalActiveMinutes' && styles.selectedMetric]}
                    onPress={() => setSelectedMetric('totalActiveMinutes')}
                >
                    <Text style={styles.metricButtonText}>Minutes</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#3498db" />
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No records found. Be the first!</Text>
                    }
                    contentContainerStyle={styles.listContent}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 20,
        color: '#2c3e50',
    },
    metricSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    metricButton: {
        flex: 1,
        padding: 12,
        marginHorizontal: 4,
        borderRadius: 8,
        backgroundColor: '#ecf0f1',
        alignItems: 'center',
    },
    selectedMetric: {
        backgroundColor: '#3498db',
    },
    metricButtonText: {
        color: '#2c3e50',
        fontWeight: '600',
    },
    leaderboardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    rank: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3498db',
        marginRight: 16,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 14,
        color: '#7f8c8d',
        fontWeight: '500',
    },
    emptyText: {
        textAlign: 'center',
        color: '#95a5a6',
        marginTop: 20,
    },
    errorText: {
        color: '#e74c3c',
        textAlign: 'center',
        marginVertical: 20,
    },
    retryButton: {
        backgroundColor: '#3498db',
        padding: 12,
        borderRadius: 8,
        alignSelf: 'center',
    },
    retryText: {
        color: 'white',
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 20,
    },
});

export default Leaderboard;