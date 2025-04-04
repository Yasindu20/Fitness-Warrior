//CalorieTracker.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Keyboard,
    Platform,
    RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { auth, db } from './firebaseConfig';
import {
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import FoodSearchService from '../services/foodSearchService';
import {
    addCalorieIntake,
    removeCalorieIntake,
    updateUserProfile,
    UserProfile
} from '../services/firestoreHelpers';
import { formatDate } from '../utils/dateUtils'; // Assume you have this utility

interface FoodItem {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    portion?: number;
}

interface IntakeItem extends FoodItem {
    timestamp: Date;
    userId: string;
    date: string;
    documentId?: string;
}

export default function CalorieTracker() {
    // State management
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
    const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
    const [portion, setPortion] = useState('');
    const [dailyIntake, setDailyIntake] = useState<IntakeItem[]>([]);
    const [nutritionTotals, setNutritionTotals] = useState({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
    });

    // UI state
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchActive, setSearchActive] = useState(false);

    // Refs
    const searchTimeout = useRef<NodeJS.Timeout>();
    const lastSearchQuery = useRef('');
    const isInitializing = useRef(false);

    // Initialize FoodSearchService on first render
    useEffect(() => {
        const initializeService = async () => {
            if (!FoodSearchService.getInitializationStatus() && !isInitializing.current) {
                isInitializing.current = true;
                try {
                    await FoodSearchService.initialize();
                    isInitializing.current = false;
                } catch (error) {
                    console.error('Failed to initialize service:', error);
                    isInitializing.current = false;
                }
            }
        };
        
        initializeService();
    }, []);

    // Load data when screen focuses
    useFocusEffect(
        useCallback(() => {
            loadDailyIntake();
            return () => {
                if (searchTimeout.current) {
                    clearTimeout(searchTimeout.current);
                }
            };
        }, [])
    );

    // Calculate totals when daily intake changes
    useEffect(() => {
        calculateNutritionTotals();
    }, [dailyIntake]);

    const calculateNutritionTotals = () => {
        const totals = dailyIntake.reduce((acc, item) => ({
            calories: acc.calories + (item.calories || 0),
            protein: acc.protein + (item.protein || 0),
            carbs: acc.carbs + (item.carbs || 0),
            fat: acc.fat + (item.fat || 0)
        }), {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
        });

        setNutritionTotals(totals);

        // Update user's total calories in profile
        const userId = auth.currentUser?.uid;
        if (userId) {
            updateUserProfile(userId, {
                totalCalories: totals.calories
            } as Partial<UserProfile>); // This is where UserProfile is used
        }
    };

    const loadDailyIntake = async () => {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) {
                Alert.alert('Error', 'Please log in to track your calories');
                return;
            }

            setLoading(true);
            const today = formatDate(new Date());
            const intakeRef = collection(db, 'calorieIntake');
            const q = query(
                intakeRef,
                where('userId', '==', userId),
                where('date', '==', today)
            );

            const querySnapshot = await getDocs(q);
            const intake: IntakeItem[] = [];

            querySnapshot.forEach((doc) => {
                intake.push({ ...doc.data() as IntakeItem, documentId: doc.id });
            });

            setDailyIntake(intake);
        } catch (error) {
            Alert.alert('Error', 'Failed to load your daily intake');
            console.error('Error loading daily intake:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const searchFood = async (text: string) => {
        if (searchTimeout.current) {
          clearTimeout(searchTimeout.current);
        }
      
        // Even show results for a single character
        if (!text) {
          setSearchResults([]);
          setSearchActive(false);
          return;
        }
      
        // Reduce delay for better responsiveness
        const delay = text.length === 1 ? 100 : 300;
        
        searchTimeout.current = setTimeout(async () => {
          if (text === lastSearchQuery.current) return;
          lastSearchQuery.current = text;
      
          setLoading(true);
          try {
            // Use the public method instead of accessing private property
            if (!FoodSearchService.getInitializationStatus()) {
              console.log('Initializing FoodSearchService...');
              await FoodSearchService.initialize();
            }
      
            console.log('Searching for:', text);
            const results = await FoodSearchService.searchFood(text);
            setSearchResults(results);
            setSearchActive(true);
          } catch (error) {
            console.error('Search failed:', error);
            Alert.alert(
              'Search Error',
              'Unable to load food database. Please check if model files exist.'
            );
          } finally {
            setLoading(false);
          }
        }, delay);
      };

    const addFoodItem = async () => {
        if (!selectedFood || !portion) {
            Alert.alert('Error', 'Please select a food item and enter portion size');
            return;
        }

        const portionNum = parseFloat(portion);
        if (isNaN(portionNum) || portionNum <= 0) {
            Alert.alert('Error', 'Please enter a valid portion size');
            return;
        }

        try {
            const userId = auth.currentUser?.uid;
            if (!userId) throw new Error('User not logged in');

            const today = formatDate(new Date());
            const multiplier = portionNum / 100;

            const intakeItem = {
                userId,
                date: today,
                name: selectedFood.name,
                portion: portionNum,
                calories: selectedFood.calories * multiplier,
                protein: selectedFood.protein * multiplier,
                carbs: selectedFood.carbs * multiplier,
                fat: selectedFood.fat * multiplier
            };

            await addCalorieIntake(intakeItem);

            // Clear selection and reload
            setSelectedFood(null);
            setPortion('');
            setSearchQuery('');
            setSearchResults([]);
            setSearchActive(false);
            Keyboard.dismiss();
            await loadDailyIntake();

            Alert.alert('Success', 'Food item added to your daily intake');
        } catch (error) {
            console.error('Error adding food item:', error);
            Alert.alert('Error', 'Failed to add food item');
        }
    };

    const removeFoodItem = async (documentId: string, calories: number) => {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) throw new Error('User not logged in');

            await removeCalorieIntake(userId, documentId, calories);
            await loadDailyIntake();
            Alert.alert('Success', 'Food item removed from your daily intake');
        } catch (error) {
            console.error('Error removing food item:', error);
            Alert.alert('Error', 'Failed to remove food item');
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadDailyIntake();
    }, []);

    // Clear search when user cancels
    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults([]);
        setSearchActive(false);
        Keyboard.dismiss();
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Calorie Tracker</Text>

            {/* Search Section */}
            <View style={styles.searchSection}>
                <View style={styles.searchInputContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search for food..."
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                            searchFood(text);
                        }}
                        onFocus={() => {
                            setSearchActive(true);
                            if (searchQuery) searchFood(searchQuery);
                        }}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={clearSearch}
                        >
                            <Text style={styles.clearButtonText}>×</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {loading && <ActivityIndicator style={styles.searchLoader} />}

                {searchActive && searchResults.length > 0 && (
                    <FlatList
                        data={searchResults}
                        style={styles.searchResults}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.searchItem}
                                onPress={() => {
                                    setSelectedFood(item);
                                    setSearchActive(false);
                                    Keyboard.dismiss();
                                }}
                            >
                                <Text style={styles.foodName}>{item.name}</Text>
                                <Text style={styles.foodDetails}>
                                    {`${Math.round(item.calories)} cal | P: ${item.protein}g | C: ${item.carbs}g | F: ${item.fat}g`}
                                </Text>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>No foods found</Text>
                        }
                    />
                )}
                
                {searchActive && searchResults.length === 0 && searchQuery.length > 0 && !loading && (
                    <View style={styles.searchResults}>
                        <Text style={styles.emptyText}>No foods found for "{searchQuery}"</Text>
                    </View>
                )}
            </View>

            {/* Selected Food Input */}
            {selectedFood && (
                <View style={styles.selectedFood}>
                    <Text style={styles.selectedFoodName}>{selectedFood.name}</Text>
                    <TextInput
                        style={styles.portionInput}
                        placeholder="Portion size (g)"
                        keyboardType="numeric"
                        value={portion}
                        onChangeText={setPortion}
                    />
                    <TouchableOpacity style={styles.addButton} onPress={addFoodItem}>
                        <Text style={styles.buttonText}>Add to Daily Intake</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Daily Summary */}
            <View style={styles.summary}>
                <Text style={styles.summaryTitle}>Today's Nutrition</Text>
                <View style={styles.nutritionTotals}>
                    <Text style={styles.totalItem}>Calories: {Math.round(nutritionTotals.calories)}</Text>
                    <Text style={styles.totalItem}>Protein: {Math.round(nutritionTotals.protein)}g</Text>
                    <Text style={styles.totalItem}>Carbs: {Math.round(nutritionTotals.carbs)}g</Text>
                    <Text style={styles.totalItem}>Fat: {Math.round(nutritionTotals.fat)}g</Text>
                </View>

                <FlatList
                    data={dailyIntake}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    keyExtractor={(item, index) => item.documentId || index.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.intakeItem}>
                            <View style={styles.intakeItemContent}>
                                <Text style={styles.intakeItemName}>{item.name}</Text>
                                <Text style={styles.intakeItemDetails}>
                                    {`${item.portion}g | ${Math.round(item.calories)} cal`}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => item.documentId && removeFoodItem(item.documentId, item.calories)}
                            >
                                <Text style={styles.removeButtonText}>×</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No foods added today</Text>
                    }
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: '#f8f9fa',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 16,
      color: '#2c3e50',
      textAlign: 'center',
    },
    searchSection: {
      marginBottom: 16,
      zIndex: 1,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ddd',
      paddingHorizontal: 10,
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      height: 48,
      fontSize: 16,
    },
    clearButton: {
      padding: 8,
    },
    clearButtonText: {
      fontSize: 22,
      color: '#999',
    },
    searchLoader: {
      marginVertical: 10,
    },
    searchResults: {
      backgroundColor: '#fff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ddd',
      maxHeight: 200,
      marginBottom: 16,
    },
    searchItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    foodName: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 4,
    },
    foodDetails: {
      fontSize: 14,
      color: '#666',
    },
    selectedFood: {
      backgroundColor: '#e6f7ff',
      padding: 16,
      borderRadius: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#b3e0ff',
    },
    selectedFoodName: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
      color: '#0066cc',
    },
    portionInput: {
      backgroundColor: '#fff',
      height: 48,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ddd',
      padding: 8,
      marginBottom: 12,
      fontSize: 16,
    },
    addButton: {
      backgroundColor: '#4CAF50',
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    summary: {
      flex: 1,
      backgroundColor: '#fff',
      borderRadius: 8,
      padding: 16,
      borderWidth: 1,
      borderColor: '#ddd',
    },
    summaryTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 12,
      color: '#2c3e50',
    },
    nutritionTotals: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    totalItem: {
      fontSize: 14,
      fontWeight: '500',
      color: '#333',
      width: '48%',
      marginBottom: 8,
    },
    intakeItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    intakeItemContent: {
      flex: 1,
    },
    intakeItemName: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 4,
    },
    intakeItemDetails: {
      fontSize: 14,
      color: '#666',
    },
    removeButton: {
      backgroundColor: '#ff6b6b',
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    removeButtonText: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
    },
    emptyText: {
      padding: 16,
      textAlign: 'center',
      color: '#999',
      fontStyle: 'italic',
    },
  });