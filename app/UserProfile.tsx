import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Modal,
    TextInput,
    Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { auth, db } from './firebaseConfig';
import { updateUserProfile } from '../services/firestoreHelpers';
import { formatDate, formatReadableDate } from '../utils/dateUtils';
import {
    collection,
    query,
    where,
    doc,
    getDoc,
    getDocs,
    orderBy,
    limit,
} from 'firebase/firestore';

interface UserData {
    displayName: string;
    email: string;
    weight: number;
    height: number;
    age: number;
    gender: string;
    fitnessGoal: string;
    dailyCalorieGoal: number;
    totalSteps: number;
    totalCalories: number;
    joinDate?: Date;
}

interface HistoryItem {
    date: string;
    readableDate: string;
    steps?: number;
    calories?: number;
}

export default function UserProfile({ navigation }: { navigation: any }) {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('profile'); // profile, steps, calories
    const [editFormData, setEditFormData] = useState<Partial<UserData>>({});
    const [stepsHistory, setStepsHistory] = useState<HistoryItem[]>([]);
    const [caloriesHistory, setCaloriesHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            setLoading(true);
            const user = auth.currentUser;
            if (!user) {
                navigation.navigate('login');
                return;
            }

            // Get user data from Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const data = userDoc.data() as UserData;
                setUserData(data);
                // Pre-fill edit form with current data
                setEditFormData({
                    weight: data.weight,
                    height: data.height,
                    age: data.age,
                    gender: data.gender,
                    fitnessGoal: data.fitnessGoal,
                });
            } else {
                // Fallback to basic user data
                setUserData({
                    displayName: user.displayName || 'User',
                    email: user.email || 'No email',
                    weight: 0,
                    height: 0,
                    age: 0,
                    gender: '',
                    fitnessGoal: '',
                    dailyCalorieGoal: 2000,
                    totalSteps: 0,
                    totalCalories: 0,
                });
            }

            // Load step history data
            await loadStepsHistory(user.uid);
            // Load calorie history data
            await loadCaloriesHistory(user.uid);
        } catch (error) {
            console.error('Error loading user profile:', error);
            Alert.alert('Error', 'Failed to load your profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const loadStepsHistory = async (userId: string) => {
        try {
          // Query Firestore for actual step history data
          const stepsRef = collection(db, 'stepHistory');
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const sevenDaysAgoStr = formatDate(sevenDaysAgo);
          
          const q = query(
            stepsRef,
            where('userId', '==', userId),
            where('date', '>=', sevenDaysAgoStr),
            orderBy('date', 'desc')
          );
          
          const querySnapshot = await getDocs(q);
          const historyData: { [key: string]: HistoryItem } = {};
          
          // Initialize all 7 days with zero steps
          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = formatDate(date);
            historyData[dateStr] = {
              date: dateStr,
              readableDate: formatReadableDate(date),
              steps: 0
            };
          }
          
          // Fill in actual data from Firestore
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (historyData[data.date]) {
              historyData[data.date].steps = (historyData[data.date].steps || 0) + data.steps;
            }
          });
          
          // Convert to array and sort by date
          const sortedHistory = Object.values(historyData).sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          
          setStepsHistory(sortedHistory);
        } catch (error) {
          console.error('Error loading steps history:', error);
          // Fallback to empty history
          setStepsHistory([]);
        }
      };

    const loadCaloriesHistory = async (userId: string) => {
        try {
            // If you have actual calorie intake data in the database, query it
            const calorieData: { [key: string]: number } = {};

            // Get calorie intake data from Firestore
            const intakeRef = collection(db, 'calorieIntake');
            const q = query(
                intakeRef,
                where('userId', '==', userId),
                orderBy('date', 'desc'),
                limit(30) // Get last 30 days of data
            );

            const querySnapshot = await getDocs(q);

            // Group by date
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const date = data.date;
                if (!calorieData[date]) {
                    calorieData[date] = 0;
                }
                calorieData[date] += data.calories;
            });

            // Convert to array format for chart
            const historyData: HistoryItem[] = Object.keys(calorieData)
                .sort() // Sort dates ascending
                .slice(-7) // Get last 7 days
                .map(date => ({
                    date,
                    readableDate: formatReadableDate(new Date(date)),
                    calories: Math.round(calorieData[date]),
                }));

            setCaloriesHistory(historyData);
        } catch (error) {
            console.error('Error loading calorie history:', error);
        }
    };

    const handleLogout = () => {
        auth.signOut()
            .then(() => {
                navigation.navigate('login');
            })
            .catch((error) => {
                console.error('Error signing out:', error);
                Alert.alert('Error', 'Failed to sign out. Please try again.');
            });
    };

    const handleSaveProfile = async () => {
        if (!auth.currentUser) return;

        try {
            // Validate input
            if (
                !editFormData.weight ||
                !editFormData.height ||
                !editFormData.age ||
                !editFormData.gender ||
                !editFormData.fitnessGoal
            ) {
                Alert.alert('Error', 'Please fill in all fields.');
                return;
            }

            // Calculate new daily calorie goal
            let bmr = 0;
            if (editFormData.gender === 'male') {
                bmr = 10 * editFormData.weight! + 6.25 * editFormData.height! - 5 * editFormData.age! + 5;
            } else {
                bmr = 10 * editFormData.weight! + 6.25 * editFormData.height! - 5 * editFormData.age! - 161;
            }

            const activityFactor = 1.375;
            let dailyCalorieGoal = Math.round(bmr * activityFactor);

            if (editFormData.fitnessGoal === 'weightLoss') {
                dailyCalorieGoal = Math.round(dailyCalorieGoal * 0.8);
            }

            // Update user profile
            await updateUserProfile(auth.currentUser.uid, {
                ...editFormData,
                dailyCalorieGoal,
                updatedAt: new Date(),
            });

            // Update local state
            setUserData(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    ...editFormData,
                    dailyCalorieGoal,
                };
            });

            setEditModalVisible(false);
            Alert.alert('Success', 'Your profile has been updated.');
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update your profile. Please try again.');
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#6200ee" />
                <Text style={styles.loadingText}>Loading your profile...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Profile Header */}
            <View style={styles.header}>
                <View style={styles.profileCircle}>
                    <Text style={styles.profileInitial}>
                        {userData?.displayName?.[0]?.toUpperCase() || 'U'}
                    </Text>
                </View>
                <Text style={styles.userName}>{userData?.displayName}</Text>
                <Text style={styles.userEmail}>{userData?.email}</Text>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
                    onPress={() => setActiveTab('profile')}
                >
                    <Text
                        style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}
                    >
                        Profile
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'steps' && styles.activeTab]}
                    onPress={() => setActiveTab('steps')}
                >
                    <Text
                        style={[styles.tabText, activeTab === 'steps' && styles.activeTabText]}
                    >
                        Steps
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'calories' && styles.activeTab]}
                    onPress={() => setActiveTab('calories')}
                >
                    <Text
                        style={[styles.tabText, activeTab === 'calories' && styles.activeTabText]}
                    >
                        Calories
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {/* Profile Info */}
                {activeTab === 'profile' && (
                    <View style={styles.profileInfo}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Weight:</Text>
                            <Text style={styles.infoValue}>{userData?.weight || 'Not set'} kg</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Height:</Text>
                            <Text style={styles.infoValue}>{userData?.height || 'Not set'} cm</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Age:</Text>
                            <Text style={styles.infoValue}>{userData?.age || 'Not set'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Gender:</Text>
                            <Text style={styles.infoValue}>{userData?.gender || 'Not set'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Fitness Goal:</Text>
                            <Text style={styles.infoValue}>{userData?.fitnessGoal || 'Not set'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Daily Calorie Goal:</Text>
                            <Text style={styles.infoValue}>{userData?.dailyCalorieGoal || 0} kcal</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Total Steps:</Text>
                            <Text style={styles.infoValue}>{userData?.totalSteps || 0}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Total Calories Tracked:</Text>
                            <Text style={styles.infoValue}>{userData?.totalCalories || 0} kcal</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => setEditModalVisible(true)}
                        >
                            <Text style={styles.editButtonText}>Edit Profile</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Steps History */}
                {activeTab === 'steps' && (
                    <View style={styles.historyContainer}>
                        <Text style={styles.historyTitle}>Steps History (Last 7 Days)</Text>

                        {stepsHistory.length > 0 ? (
                            <>
                                <LineChart
                                    data={{
                                        labels: stepsHistory.map(item => item.date.slice(5)), // Show as MM-DD
                                        datasets: [
                                            {
                                                data: stepsHistory.map(item => item.steps || 0),
                                            },
                                        ],
                                    }}
                                    width={Dimensions.get('window').width - 40}
                                    height={220}
                                    chartConfig={{
                                        backgroundColor: '#f5f5f5',
                                        backgroundGradientFrom: '#f5f5f5',
                                        backgroundGradientTo: '#f5f5f5',
                                        decimalPlaces: 0,
                                        color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
                                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                        propsForDots: {
                                            r: '6',
                                            strokeWidth: '2',
                                            stroke: '#6200ee',
                                        },
                                    }}
                                    bezier
                                    style={styles.chart}
                                />

                                <View style={styles.historyList}>
                                    {stepsHistory.map((item, index) => (
                                        <View key={index} style={styles.historyItem}>
                                            <Text style={styles.historyDate}>{item.readableDate}</Text>
                                            <Text style={styles.historyValue}>{item.steps} steps</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        ) : (
                            <Text style={styles.noDataText}>No step history available</Text>
                        )}
                    </View>
                )}

                {/* Calories History */}
                {activeTab === 'calories' && (
                    <View style={styles.historyContainer}>
                        <Text style={styles.historyTitle}>Calorie Intake History (Last 7 Days)</Text>

                        {caloriesHistory.length > 0 ? (
                            <>
                                <LineChart
                                    data={{
                                        labels: caloriesHistory.map(item => item.date.slice(5)), // Show as MM-DD
                                        datasets: [
                                            {
                                                data: caloriesHistory.map(item => item.calories || 0),
                                            },
                                        ],
                                    }}
                                    width={Dimensions.get('window').width - 40}
                                    height={220}
                                    chartConfig={{
                                        backgroundColor: '#f5f5f5',
                                        backgroundGradientFrom: '#f5f5f5',
                                        backgroundGradientTo: '#f5f5f5',
                                        decimalPlaces: 0,
                                        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                        propsForDots: {
                                            r: '6',
                                            strokeWidth: '2',
                                            stroke: '#4CAF50',
                                        },
                                    }}
                                    bezier
                                    style={styles.chart}
                                />

                                <View style={styles.historyList}>
                                    {caloriesHistory.map((item, index) => (
                                        <View key={index} style={styles.historyItem}>
                                            <Text style={styles.historyDate}>{item.readableDate}</Text>
                                            <Text style={styles.historyValue}>{item.calories} kcal</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        ) : (
                            <Text style={styles.noDataText}>No calorie history available</Text>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>

            {/* Edit Profile Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={editModalVisible}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Profile</Text>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Weight (kg)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your weight"
                                keyboardType="decimal-pad"
                                value={editFormData.weight?.toString() || ''}
                                onChangeText={value =>
                                    setEditFormData({ ...editFormData, weight: parseFloat(value) || 0 })
                                }
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Height (cm)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your height"
                                keyboardType="decimal-pad"
                                value={editFormData.height?.toString() || ''}
                                onChangeText={value =>
                                    setEditFormData({ ...editFormData, height: parseFloat(value) || 0 })
                                }
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Age</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your age"
                                keyboardType="number-pad"
                                value={editFormData.age?.toString() || ''}
                                onChangeText={value =>
                                    setEditFormData({ ...editFormData, age: parseInt(value, 10) || 0 })
                                }
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Gender</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={editFormData.gender || ''}
                                    onValueChange={(itemValue) =>
                                        setEditFormData({ ...editFormData, gender: itemValue })
                                    }
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Select your gender" value="" />
                                    <Picker.Item label="Male" value="male" />
                                    <Picker.Item label="Female" value="female" />
                                    <Picker.Item label="Non-binary" value="nonbinary" />
                                    <Picker.Item label="Prefer not to say" value="undisclosed" />
                                </Picker>
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Fitness Goal</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={editFormData.fitnessGoal || ''}
                                    onValueChange={(itemValue) =>
                                        setEditFormData({ ...editFormData, fitnessGoal: itemValue })
                                    }
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Select your goal" value="" />
                                    <Picker.Item label="Weight Loss" value="weightLoss" />
                                    <Picker.Item label="Maintenance" value="maintenance" />
                                    <Picker.Item label="Muscle Gain" value="muscleGain" />
                                    <Picker.Item label="General Fitness" value="generalFitness" />
                                </Picker>
                            </View>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleSaveProfile}
                            >
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#6200ee',
    },
    header: {
        backgroundColor: '#6200ee',
        padding: 20,
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 30,
    },
    profileCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    profileInitial: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    userEmail: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    tab: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 3,
        borderBottomColor: '#6200ee',
    },
    tabText: {
        fontSize: 16,
        color: '#666',
    },
    activeTabText: {
        color: '#6200ee',
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    profileInfo: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    infoLabel: {
        fontSize: 16,
        color: '#666',
    },
    infoValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    editButton: {
        backgroundColor: '#6200ee',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    editButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    logoutButton: {
        backgroundColor: '#ff6b6b',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        margin: 20,
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    formGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 10,
        fontSize: 16,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
    },
    picker: {
        height: 50,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButton: {
        padding: 12,
        borderRadius: 5,
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    cancelButtonText: {
        color: '#333',
        fontWeight: 'bold',
    },
    saveButton: {
        backgroundColor: '#6200ee',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    historyContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    historyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    chart: {
        marginVertical: 15,
        borderRadius: 5,
    },
    historyList: {
        marginTop: 20,
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    historyDate: {
        fontSize: 14,
        color: '#666',
    },
    historyValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    noDataText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#888',
        marginTop: 20,
        fontStyle: 'italic',
    },
});