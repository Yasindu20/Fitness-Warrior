//CoachScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Image,
    ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../app/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import AICoachService, { CoachMessage, MessageAttachment } from '../services/AICoachService';
import WorkoutVisualization from '../components/WorkoutVisualization';
import CoachAvatar from '../components/CoachAvatar';
import WeeklyProgramComponent from '../components/WeeklyProgramComponent';
import WorkoutProgramService from '../services/WorkoutProgramService';

// Use types from AICoachService

export default function CoachScreen({ navigation }: { navigation: any }) {
    const [messages, setMessages] = useState<CoachMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [userName, setUserName] = useState('');
    const [userGoals, setUserGoals] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);

    const scrollViewRef = useRef<ScrollView>(null);
    const typingAnimation = useRef(new Animated.Value(0)).current;
    const coachAnimation = useRef<LottieView>(null);

    // Load user data when component mounts
    useEffect(() => {
        loadUserData();

        // Add welcome message with slight delay
        setTimeout(() => {
            addCoachMessage(
                "Hi there! I'm your Fitness Warrior Coach. I'm here to help you reach your fitness goals. How can I assist you today?",
                { type: 'tip', data: { title: 'Coach Tip', content: 'Try asking about workout recommendations, nutrition advice, progress tracking, or a weekly workout program!' } }
            );
        }, 500);
    }, []);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    // Animate typing indicator
    useEffect(() => {
        if (isTyping) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(typingAnimation, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true
                    }),
                    Animated.timing(typingAnimation, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true
                    })
                ])
            ).start();
        } else {
            typingAnimation.setValue(0);
        }
    }, [isTyping, typingAnimation]);

    // Load user data from Firestore
    const loadUserData = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            // Get user profile
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const userDataFromDb = userDoc.data();
                setUserName(userDataFromDb.displayName || 'Fitness Warrior');
                setUserGoals({
                    fitnessGoal: userDataFromDb.fitnessGoal || 'general',
                    dailyCalorieGoal: userDataFromDb.dailyCalorieGoal || 2000,
                    weight: userDataFromDb.weight,
                    height: userDataFromDb.height
                });
                
                // Include today's metrics in the userData for more personalized recommendations
                const todayData = await getTodayData();
                setUserData({
                    ...userDataFromDb,
                    todaySteps: todayData.steps,
                    todayCalories: todayData.calories
                });
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    };
    
    // Fetch today's step count and calories
    const getTodayData = async () => {
        // This function would normally fetch from your GoalsTrackingService
        // For now, we'll return mock data if the actual fetch fails
        try {
            // Attempt to get real data from your existing services
            // You could use your GoalsTrackingService here
            
            // For demo purposes, return mock data if no real data is available
            return { 
                steps: Math.floor(Math.random() * 5000) + 2000, 
                calories: Math.floor(Math.random() * 1000) + 500 
            };
        } catch (error) {
            console.error('Error getting today data:', error);
            return { steps: 0, calories: 0 };
        }
    };

    // Add a message from the user
    const addUserMessage = (text: string) => {
        const newMessage: CoachMessage = {
            id: Date.now().toString(),
            text,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newMessage]);
    };

    // Add a message from the coach
    const addCoachMessage = (text: string, attachment?: MessageAttachment) => {
        const newMessage: CoachMessage = {
            id: Date.now().toString(),
            text,
            sender: 'coach',
            timestamp: new Date(),
            attachment
        };

        setMessages(prev => [...prev, newMessage]);
        // Play success animation
        coachAnimation.current?.play();
    };

    // Process user message and generate coach response
    const processUserMessage = async (text: string) => {
        // Show typing indicator
        setIsTyping(true);

        try {
            // Process message using AICoachService
            const response = await AICoachService.processMessage(text, userData);

            // Hide typing indicator
            setIsTyping(false);

            // Add coach response
            addCoachMessage(response.message, response.attachment);
        } catch (error) {
            console.error('Error processing message:', error);
            setIsTyping(false);

            // Fallback response
            addCoachMessage(
                "I'm sorry, I'm having trouble processing that request right now. Could you try asking something else?"
            );
        }
    };

    // Handle sending a message
    const handleSendMessage = () => {
        if (!inputText.trim()) return;

        // Play haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Add user message
        addUserMessage(inputText);

        // Process message and get response
        processUserMessage(inputText);

        // Clear input
        setInputText('');
    };

    // Render an individual message bubble
    const renderMessage = (message: CoachMessage) => {
        const isCoach = message.sender === 'coach';
        
        return (
          <View 
            key={message.id} 
            style={[
              styles.messageBubble,
              isCoach ? styles.coachBubble : styles.userBubble
            ]}
          >
            {isCoach && <CoachAvatar size={36} />}
            
            <View style={[
              styles.messageContent,
              isCoach ? styles.coachContent : styles.userContent
            ]}>
              <Text style={[
                styles.messageText,
                !isCoach && styles.userMessageText
              ]}>{message.text}</Text>
              
              {message.attachment && renderAttachment(message.attachment)}
            </View>
          </View>
        );
      };

    // Render message attachments (exercise demos, charts, etc.)
    const renderAttachment = (attachment: MessageAttachment) => {
        if (!attachment) return null;

        switch (attachment.type) {
            case 'exercise':
                return (
                    <View style={styles.exerciseContainer}>
                        <WorkoutVisualization
                            title={attachment.data.title}
                            exercises={attachment.data.exercises}
                            interactive={true}
                            onComplete={() => {
                                // Provide encouraging feedback when workout is completed
                                setTimeout(() => {
                                    addCoachMessage("Great job completing the workout! How did it feel?");
                                }, 1000);

                                // Haptic success feedback
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }}
                        />
                    </View>
                );

            case 'chart':
                return (
                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>{attachment.data.title}</Text>
                        <View style={styles.chartContent}>
                            {attachment.data.dataPoints.map((value: number, index: number) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.chartBar,
                                        {
                                            height: (value / attachment.data.goal) * 100,
                                            backgroundColor: value >= attachment.data.goal ? '#4CAF50' : '#6200ee'
                                        }
                                    ]}
                                />
                            ))}
                        </View>
                        <View style={styles.chartLabels}>
                            <Text style={styles.chartLabel}>M</Text>
                            <Text style={styles.chartLabel}>T</Text>
                            <Text style={styles.chartLabel}>W</Text>
                            <Text style={styles.chartLabel}>T</Text>
                            <Text style={styles.chartLabel}>F</Text>
                            <Text style={styles.chartLabel}>S</Text>
                            <Text style={styles.chartLabel}>S</Text>
                        </View>
                    </View>
                );

            case 'tip':
                return (
                    <View style={styles.tipContainer}>
                        <View style={styles.tipHeader}>
                            <Ionicons name="bulb-outline" size={16} color="#FFC107" />
                            <Text style={styles.tipTitle}>{attachment.data.title}</Text>
                        </View>
                        <Text style={styles.tipContent}>{attachment.data.content}</Text>
                    </View>
                );
                
            case 'weeklyProgram':
                return (
                    <View style={styles.weeklyProgramContainer}>
                        <WeeklyProgramComponent 
                            program={attachment.data}
                            onComplete={async () => {
                                // Save the program to Firebase when user clicks "Save Program"
                                try {
                                    // Show loading indicator (optional)
                                    setIsTyping(true);
                                    
                                    // Save program to database
                                    const programId = await WorkoutProgramService.saveProgram(attachment.data);
                                    
                                    // Hide loading indicator
                                    setIsTyping(false);
                                    
                                    // Provide feedback when program is saved
                                    setTimeout(() => {
                                        addCoachMessage(
                                            `I've saved your weekly program! You can access it anytime from your Personalized Goals section. Would you like me to explain any part of the program in more detail?`,
                                            { 
                                                type: 'tip', 
                                                data: { 
                                                    title: 'Program Saved', 
                                                    content: 'Remember to track your progress with each workout and let me know if you need to adjust the difficulty.' 
                                                } 
                                            }
                                        );
                                    }, 500);
            
                                    // Haptic success feedback
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                } catch (error) {
                                    // Handle error
                                    setIsTyping(false);
                                    console.error("Error saving program:", error);
                                    
                                    // Error message to user
                                    addCoachMessage(
                                        "I had trouble saving your program. Please try again or check your connection.",
                                        { 
                                            type: 'tip', 
                                            data: { 
                                                title: 'Error Saving Program', 
                                                content: 'Your progress and preferences have been noted, but there was an issue saving to your profile.' 
                                            } 
                                        }
                                    );
                                }
                            }}
                        />
                    </View>
                );

            default:
                return null;
        }
    };

    // Render typing indicator when coach is "typing"
    const renderTypingIndicator = () => {
        if (!isTyping) return null;

        return (
            <View style={styles.typingContainer}>
                <CoachAvatar size={36} />
                <View style={styles.typingBubble}>
                    <Animated.View style={[
                        styles.typingDot,
                        {
                            opacity: typingAnimation.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [0.3, 1, 0.3]
                            })
                        }
                    ]} />
                    <Animated.View style={[
                        styles.typingDot,
                        {
                            opacity: typingAnimation.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [0.5, 1, 0.5]
                            })
                        }
                    ]} />
                    <Animated.View style={[
                        styles.typingDot,
                        { opacity: typingAnimation }
                    ]} />
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={['#6200ee', '#9546f8']}
                style={styles.header}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>AI Fitness Coach</Text>
                <View style={styles.coachAnimationContainer}>
                    <LottieView
                        ref={coachAnimation}
                        source={require('../assets/animations/coach-animation.json')}
                        style={styles.coachAnimationView}
                        loop={false}
                        autoPlay={false}
                    />
                </View>
            </LinearGradient>

            {/* Messages */}
            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={100}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                >
                    {messages.map(renderMessage)}
                    {renderTypingIndicator()}
                </ScrollView>

                {/* Suggested topics */}
                {messages.length < 3 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.suggestedTopics}
                        contentContainerStyle={styles.suggestedTopicsContent}
                    >
                        {COACH_TOPICS.map((topic, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.topicBubble}
                                onPress={() => {
                                    setInputText(topic);
                                    setTimeout(() => handleSendMessage(), 100);
                                }}
                            >
                                <Text style={styles.topicText}>{topic}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Input area */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Ask your coach something..."
                        placeholderTextColor="#999"
                        multiline
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            !inputText.trim() && styles.sendButtonDisabled
                        ]}
                        onPress={handleSendMessage}
                        disabled={!inputText.trim()}
                    >
                        <Ionicons name="send" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

// Suggested conversation topics
const COACH_TOPICS = [
    "Create a weekly workout program",
    "What's a good workout for today?",
    "Give me nutrition advice",
    "Help me with weight loss",
    "Show me my progress"
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
        marginLeft: 16,
    },
    coachAnimationContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coachAnimationView: {
        width: 100,
        height: 100,
    },
    keyboardAvoid: {
        flex: 1,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 8,
    },
    messageBubble: {
        flexDirection: 'row',
        marginBottom: 16,
        maxWidth: '80%',
    },
    coachBubble: {
        alignSelf: 'flex-start',
    },
    userBubble: {
        alignSelf: 'flex-end',
        flexDirection: 'row-reverse',
    },
    messageContent: {
        borderRadius: 20,
        padding: 12,
        paddingVertical: 10,
    },
    coachContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 4,
    },
    userContent: {
        backgroundColor: '#6200ee',
        borderTopRightRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
        color: '#333',
    },
    userMessageText: {
        color: '#fff',
    },
    typingContainer: {
        flexDirection: 'row',
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    typingBubble: {
        backgroundColor: '#e0e0e0',
        borderRadius: 20,
        borderTopLeftRadius: 4,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    typingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#666',
        marginRight: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        maxHeight: 100,
        fontSize: 16,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6200ee',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    sendButtonDisabled: {
        backgroundColor: '#cccccc',
    },
    suggestedTopics: {
        marginBottom: 12,
    },
    suggestedTopicsContent: {
        paddingHorizontal: 8,
    },
    topicBubble: {
        backgroundColor: 'rgba(98, 0, 238, 0.1)',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: 'rgba(98, 0, 238, 0.2)',
    },
    topicText: {
        color: '#6200ee',
        fontSize: 14,
    },
    exerciseContainer: {
        marginTop: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        padding: 12,
    },
    chartContainer: {
        marginTop: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        padding: 12,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#6200ee',
    },
    chartContent: {
        height: 120,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    chartBar: {
        width: 24,
        backgroundColor: '#6200ee',
        borderRadius: 4,
        minHeight: 4,
    },
    chartLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    chartLabel: {
        fontSize: 12,
        color: '#666',
        width: 24,
        textAlign: 'center',
    },
    tipContainer: {
        marginTop: 12,
        backgroundColor: '#FFF9C4',
        borderRadius: 12,
        padding: 12,
    },
    tipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    tipTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#F57C00',
        marginLeft: 4,
    },
    tipContent: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    weeklyProgramContainer: {
        marginTop: 12,
        width: '100%',
    }
});