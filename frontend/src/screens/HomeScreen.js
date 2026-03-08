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

  // Carousel tips
  const carouselTips = [
    { icon: 'shield-checkmark', title: 'Travel Safety', text: 'Always wear your seatbelt and follow bus rules.' },
    { icon: 'star', title: 'App Features', text: 'Track your bus live and get real-time notifications.' },
    { icon: 'gift', title: 'Earn Rewards', text: 'Collect points for every trip and redeem for discounts.' },
  ];
  const [carouselIndex, setCarouselIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIndex(i => (i + 1) % carouselTips.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

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

        {/* Animated Carousel */}
        <View style={styles.carouselContainer}>
          <Ionicons name={carouselTips[carouselIndex].icon} size={32} color="#007AFF" style={{marginBottom: 8}} />
          <Text style={styles.carouselTitle}>{carouselTips[carouselIndex].title}</Text>
          <Text style={styles.carouselText}>{carouselTips[carouselIndex].text}</Text>
        </View>

        {/* Social Media / Community Section */}
        <View style={styles.socialContainer}>
          <Text style={styles.socialTitle}>Connect with Us</Text>
          <View style={styles.socialLinksRow}>
            <TouchableOpacity style={styles.socialIcon} onPress={() => {/* open Facebook */}}>
              <Ionicons name="logo-facebook" size={28} color="#4267B2" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon} onPress={() => {/* open Twitter */}}>
              <Ionicons name="logo-twitter" size={28} color="#1DA1F2" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon} onPress={() => {/* open Instagram */}}>
              <Ionicons name="logo-instagram" size={28} color="#C13584" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon} onPress={() => navigation.navigate('Community')}>
              <Ionicons name="people-outline" size={28} color="#007AFF" />
            </TouchableOpacity>
          </View>
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
  bannerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  banner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 4,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  bannerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bannerSubtitle: {
    color: '#e6f0ff',
    fontSize: 13,
    marginTop: 2,
  },
  carouselContainer: {
    backgroundColor: '#f2f2f7',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  carouselTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  carouselText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  socialContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  socialTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  socialLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIcon: {
    marginHorizontal: 10,
  },

});

export default HomeScreen;