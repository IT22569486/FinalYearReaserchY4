import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { useSession } from '../context/SessionContext';
import { updateLastActivity } from '../utils/authUtils';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { refreshSession } = useSession();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserData();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchUserData = async () => {
    try {
      await updateLastActivity();
      await refreshSession();
      
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const decodedToken = jwtDecode(token);
        setUserName(decodedToken.name || 'User');
      }
    } catch (error) {
      console.error('Error in HomeScreen:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.card, styles.primaryCard]} 
          onPress={() => navigation.navigate('Routes')}
        >
          <Ionicons name="search-circle" size={44} color="#fff" />
          <View>
            <Text style={styles.primaryCardTitle}>Find Your Bus</Text>
            <Text style={styles.primaryCardSubtitle}>Explore routes and see live bus locations</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.cardGrid}>
          <TouchableOpacity 
            style={[styles.card, styles.secondaryCard]} 
            onPress={() => navigation.navigate('CurrentTrip')}
          >
            <Ionicons name="bus-outline" size={32} color="#333" />
            <Text style={styles.secondaryCardTitle}>My Trip</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, styles.secondaryCard]} 
            onPress={() => navigation.navigate('Timetable')} 
          >
            <Ionicons name="calendar-outline" size={32} color="#333" />
            <Text style={styles.secondaryCardTitle}>Timetables</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.card, styles.tertiaryCard]}
          onPress={() => navigation.navigate('Profile')} 
        >
          <Ionicons name="person-circle-outline" size={32} color="#007AFF" />
          <View style={styles.tertiaryCardTextContainer}>
            <Text style={styles.tertiaryCardTitle}>My Account</Text>
            <Text style={styles.tertiaryCardSubtitle}>Manage your profile and settings</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={24} color="#C7C7CC" />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F8',
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    color: '#666',
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryCard: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 15,
  },
  primaryCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 15,
  },
  cardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryCard: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  secondaryCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
  },
  tertiaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tertiaryCardTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  tertiaryCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },
  tertiaryCardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default HomeScreen;