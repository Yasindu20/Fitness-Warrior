import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import communityService from '../../services/communityService';

export default function CreateTeamScreen({ navigation }: { navigation: any }) {
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6200ee');
  const [loading, setLoading] = useState(false);
  
  const colors = [
    '#6200ee', '#03DAC5', '#3700B3', '#018786', 
    '#CF6679', '#FF4081', '#9C27B0', '#2196F3',
    '#4CAF50', '#FFC107', '#FF9800', '#F44336'
  ];

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Error', 'Please enter a team name');
      return;
    }
    
    try {
      setLoading(true);
      
      const teamId = await communityService.createTeam(
        teamName.trim(),
        selectedColor,
        teamDescription.trim()
      );
      
      if (teamId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Success',
          'Team created successfully!',
          [
            {
              text: 'View Team',
              onPress: () => {
                navigation.replace('team-detail', { teamId });
              },
            },
            {
              text: 'Go back',
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error creating team:', error);
      Alert.alert('Error', 'Failed to create team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[selectedColor, selectedColor + '80']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Create Team</Text>
      </LinearGradient>
      
      <ScrollView style={styles.content}>
        <View style={styles.iconPreview}>
          <View style={[styles.teamIcon, { backgroundColor: selectedColor + '20' }]}>
            <Text style={[styles.teamIconText, { color: selectedColor }]}>
              {teamName.trim() ? teamName.substring(0, 2).toUpperCase() : 'TM'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.label}>Team Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter team name"
          value={teamName}
          onChangeText={setTeamName}
          maxLength={30}
        />
        
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter team description"
          value={teamDescription}
          onChangeText={setTeamDescription}
          multiline
          numberOfLines={4}
          maxLength={200}
        />
        
        <Text style={styles.label}>Team Color</Text>
        <View style={styles.colorOptions}>
          {colors.map(color => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                selectedColor === color && styles.selectedColorOption
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedColor(color);
              }}
            >
              {selectedColor === color && (
                <Ionicons name="checkmark" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: selectedColor }]}
          onPress={handleCreateTeam}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.createButtonText}>Create Team</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  content: {
    padding: 20,
  },
  iconPreview: {
    alignItems: 'center',
    marginBottom: 24,
  },
  teamIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamIconText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#444',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  createButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});