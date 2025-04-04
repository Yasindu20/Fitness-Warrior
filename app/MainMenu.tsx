import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { auth } from './firebaseConfig';

export default function MainMenu({ navigation }: { navigation: any }) {
  const username = auth.currentUser?.displayName || 'User';

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello, {username}!</Text>
      <Text style={styles.title}>Choose Your Tracker</Text>
      
      <TouchableOpacity 
        style={styles.menuItem} 
        onPress={() => navigation.navigate('step-counter')}
      >
        <Text style={styles.menuText}>Step Tracker</Text>
        <Text style={styles.description}>Track your daily steps and activity</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.menuItem} 
        onPress={() => navigation.navigate('calorie-tracker')}
      >
        <Text style={styles.menuText}>Calorie Tracker</Text>
        <Text style={styles.description}>Monitor your daily food intake</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.menuItem, styles.profileMenuItem]} 
        onPress={() => navigation.navigate('user-profile')}
      >
        <Text style={styles.menuText}>User Profile</Text>
        <Text style={styles.description}>View and edit your profile information</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#6200ee',
  },
  menuItem: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  profileMenuItem: {
    marginTop: 10,
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#6200ee',
    borderStyle: 'dashed',
  },
  menuText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 5,
  },
  description: {
    color: '#666',
    fontSize: 14,
  }
});