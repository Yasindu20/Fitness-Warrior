import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { auth, db } from './firebaseConfig';
import { updateUserProfile } from '../services/firestoreHelpers';

export default function UserBioForm({ navigation }: { navigation: any }) {
  // Form state
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [loading, setLoading] = useState(false);

  // Convert values to numbers and validate
  const validateForm = () => {
    if (!weight || !height || !age || !gender || !fitnessGoal) {
      Alert.alert('Error', 'Please fill in all fields.');
      return false;
    }

    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);
    const ageNum = parseInt(age, 10);

    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Error', 'Please enter a valid weight.');
      return false;
    }

    if (isNaN(heightNum) || heightNum <= 0) {
      Alert.alert('Error', 'Please enter a valid height.');
      return false;
    }

    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      Alert.alert('Error', 'Please enter a valid age (13-120).');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }

    setLoading(true);
    try {
      // Calculate recommended daily calorie goal based on inputs
      // Using a simplified BMR calculation (Mifflin-St Jeor equation)
      const weightKg = parseFloat(weight);
      const heightCm = parseFloat(height);
      const ageYears = parseInt(age, 10);
      
      let bmr = 0;
      if (gender === 'male') {
        bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
      } else {
        bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
      }
      
      // Apply activity factor (assuming moderate activity for app users)
      const activityFactor = 1.375; // Lightly active
      let dailyCalorieGoal = Math.round(bmr * activityFactor);
      
      // Adjust based on fitness goal
      if (fitnessGoal === 'weightLoss') {
        dailyCalorieGoal = Math.round(dailyCalorieGoal * 0.8); // 20% deficit
      }

      // Save the user details to Firestore
      await updateUserProfile(user.uid, {
        weight: parseFloat(weight),
        height: parseFloat(height),
        age: parseInt(age, 10),
        gender,
        fitnessGoal,
        dailyCalorieGoal,
        createdAt: new Date(),
      });

      Alert.alert(
        'Success',
        'Your profile has been created!',
        [{ text: 'OK', onPress: () => navigation.navigate('main-menu') }]
      );
    } catch (error) {
      console.error('Error saving user profile:', error);
      Alert.alert('Error', 'Failed to save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tell Us About Yourself</Text>
      <Text style={styles.subtitle}>
        This information helps us personalize your fitness journey
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Weight (kg)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your weight"
          keyboardType="decimal-pad"
          value={weight}
          onChangeText={setWeight}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Height (cm)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your height"
          keyboardType="decimal-pad"
          value={height}
          onChangeText={setHeight}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your age"
          keyboardType="number-pad"
          value={age}
          onChangeText={setAge}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={gender}
            onValueChange={(itemValue) => setGender(itemValue)}
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
            selectedValue={fitnessGoal}
            onValueChange={(itemValue) => setFitnessGoal(itemValue)}
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

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => navigation.navigate('main-menu')}
      >
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  pickerContainer: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: 50,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#6200ee',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    marginTop: 15,
    alignSelf: 'center',
  },
  skipButtonText: {
    color: '#6200ee',
    fontSize: 16,
  },
});